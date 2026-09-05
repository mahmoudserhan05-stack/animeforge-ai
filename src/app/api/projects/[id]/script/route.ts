import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";
import { updateScriptSchema } from "@/lib/validations";

/** POST /api/projects/:id/script — generate (or regenerate) the script. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    try {
      await spendCredits(userId, "script_generation", project.id);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
      }
      throw e;
    }

    const ai = getAIService();
    const { script, suggestedTitle } = await ai.generateScript({
      idea: project.idea,
      options: {
        durationSeconds: project.durationSeconds as 15 | 30 | 60,
        aspectRatio: project.aspectRatio as "9:16" | "16:9" | "1:1",
        animeStyle: project.animeStyle,
        language: project.language,
        voiceId: project.voiceId,
      },
    });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        script,
        title: project.title || suggestedTitle,
        status: "SCRIPT_READY",
        currentStep: Math.max(project.currentStep, 3),
      },
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}

/** PATCH /api/projects/:id/script — save a manual edit to the script. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);

    const body = await req.json().catch(() => null);
    const parsed = updateScriptSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        script: parsed.data.script,
        status: "SCRIPT_READY",
        currentStep: Math.max(project.currentStep, 4),
      },
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
