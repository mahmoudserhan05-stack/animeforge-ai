import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";
import { voiceOptionsSchema } from "@/lib/validations";

/** POST /api/projects/:id/voice — generate the voice-over + save music/SFX choices. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);

    const scenes = await prisma.scene.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    if (scenes.length === 0) {
      return jsonError("يجب إنشاء المشاهد أولًا", 400);
    }

    const body = await req.json().catch(() => ({}));
    const parsed = voiceOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    try {
      await spendCredits(userId, "voice_generation", project.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
      }
      throw e;
    }

    const ai = getAIService();
    const lines = scenes
      .filter((s) => s.dialogue)
      .map((s) => ({ sceneOrder: s.order, text: s.dialogue as string }));

    const { url, provider, durationSeconds } = await ai.generateVoice({
      lines: lines.length > 0 ? lines : scenes.map((s) => ({ sceneOrder: s.order, text: s.description })),
      voiceId: parsed.data.voiceId,
      language: project.language,
    });

    await prisma.$transaction([
      prisma.generatedAsset.create({
        data: {
          projectId: project.id,
          type: "VOICE",
          provider,
          url,
          metadata: JSON.stringify({ durationSeconds, voiceId: parsed.data.voiceId }),
          creditsSpent: 6,
        },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: {
          voiceId: parsed.data.voiceId,
          musicMood: parsed.data.musicMood ?? project.musicMood,
          sfxEnabled: parsed.data.sfxEnabled ?? project.sfxEnabled,
          currentStep: Math.max(project.currentStep, 6),
        },
      }),
    ]);

    const updated = await prisma.project.findUnique({
      where: { id: project.id },
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(updated!), voiceUrl: url });
  } catch (err) {
    return handleRouteError(err);
  }
}
