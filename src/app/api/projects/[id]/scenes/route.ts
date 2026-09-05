import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";

/** POST /api/projects/:id/scenes — break the (current) script into scenes. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);
    if (!project.script) {
      return jsonError("يجب إنشاء السيناريو أولًا", 400);
    }

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    try {
      await spendCredits(userId, "scene_breakdown", project.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
      }
      throw e;
    }

    const ai = getAIService();
    const { scenes } = await ai.generateScenePrompts({
      script: project.script,
      options: {
        durationSeconds: project.durationSeconds as 15 | 30 | 60,
        aspectRatio: project.aspectRatio as "9:16" | "16:9" | "1:1",
        animeStyle: project.animeStyle,
        language: project.language,
        voiceId: project.voiceId,
      },
    });

    await prisma.$transaction([
      prisma.scene.deleteMany({ where: { projectId: project.id } }),
      prisma.scene.createMany({
        data: scenes.map((s) => ({
          projectId: project.id,
          order: s.order,
          description: s.description,
          character: s.character,
          location: s.location,
          dialogue: s.dialogue,
          imagePrompt: s.imagePrompt,
        })),
      }),
      prisma.project.update({
        where: { id: project.id },
        data: { status: "SCENES_READY", currentStep: Math.max(project.currentStep, 4) },
      }),
    ]);

    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(updated!) });
  } catch (err) {
    return handleRouteError(err);
  }
}
