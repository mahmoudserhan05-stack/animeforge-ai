import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";

/** POST /api/projects/:id/video — assemble the final video from scenes + voice. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);

    const scenes = await prisma.scene.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    if (scenes.some((s) => s.imageStatus !== "READY")) {
      return jsonError("يجب إنشاء صور كل المشاهد أولًا", 400);
    }

    const voiceAsset = await prisma.generatedAsset.findFirst({
      where: { projectId: project.id, type: "VOICE" },
      orderBy: { createdAt: "desc" },
    });

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    try {
      await spendCredits(userId, "video_generation", project.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
      }
      throw e;
    }

    await prisma.project.update({ where: { id: project.id }, data: { status: "RENDERING" } });

    const ai = getAIService();
    try {
      const { url, thumbnailUrl, provider, durationSeconds } = await ai.generateVideo({
        projectTitle: project.title,
        aspectRatio: project.aspectRatio as "9:16" | "16:9" | "1:1",
        durationSeconds: project.durationSeconds,
        sceneImageUrls: scenes.map((s) => s.imageUrl as string),
        voiceUrl: voiceAsset?.url ?? null,
        musicMood: project.musicMood,
      });

      await prisma.$transaction([
        prisma.video.upsert({
          where: { projectId: project.id },
          create: {
            projectId: project.id,
            url,
            thumbnailUrl,
            durationSeconds,
            aspectRatio: project.aspectRatio,
            provider,
          },
          update: { url, thumbnailUrl, durationSeconds, provider, status: "READY" },
        }),
        prisma.project.update({
          where: { id: project.id },
          data: { status: "COMPLETED", currentStep: 8 },
        }),
        prisma.generatedAsset.create({
          data: {
            projectId: project.id,
            type: "VIDEO",
            provider,
            url,
            creditsSpent: 15,
          },
        }),
      ]);
    } catch (genErr) {
      await prisma.project.update({ where: { id: project.id }, data: { status: "FAILED" } });
      throw genErr;
    }

    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(updated!) });
  } catch (err) {
    return handleRouteError(err);
  }
}
