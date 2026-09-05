import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeScene } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";

/** POST /api/projects/:id/scenes/:sceneId/image — generate this scene's image. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);

    const scene = await prisma.scene.findUnique({ where: { id: params.sceneId } });
    if (!scene || scene.projectId !== project.id) {
      return jsonError("المشهد غير موجود", 404);
    }

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    try {
      await spendCredits(userId, "image_generation", project.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
      }
      throw e;
    }

    await prisma.scene.update({ where: { id: scene.id }, data: { imageStatus: "GENERATING" } });

    const ai = getAIService();
    try {
      const { url, provider } = await ai.generateImage({
        imagePrompt: scene.imagePrompt,
        animeStyle: project.animeStyle,
        aspectRatio: project.aspectRatio as "9:16" | "16:9" | "1:1",
        seed: scene.id,
      });

      const [updatedScene] = await prisma.$transaction([
        prisma.scene.update({
          where: { id: scene.id },
          data: { imageStatus: "READY", imageUrl: url },
        }),
        prisma.generatedAsset.create({
          data: {
            projectId: project.id,
            sceneId: scene.id,
            type: "IMAGE",
            provider,
            url,
            creditsSpent: 4,
          },
        }),
      ]);

      return NextResponse.json({ scene: serializeScene(updatedScene) });
    } catch (genErr) {
      await prisma.scene.update({ where: { id: scene.id }, data: { imageStatus: "FAILED" } });
      throw genErr;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
