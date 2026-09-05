import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";

const patchSchema = z.object({
  idea: z.string().min(8).max(500).optional(),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(60)]).optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  animeStyle: z.string().min(1).max(60).optional(),
  language: z.string().min(1).max(20).optional(),
  voiceId: z.string().min(1).max(60).optional(),
  script: z.string().min(1).max(8000).optional(),
  musicMood: z.string().min(1).max(60).optional(),
  sfxEnabled: z.boolean().optional(),
  currentStep: z.number().int().min(1).max(8).optional(),
  status: z
    .enum(["DRAFT", "SCRIPT_READY", "SCENES_READY", "RENDERING", "COMPLETED", "FAILED"])
    .optional(),
  title: z.string().min(1).max(120).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    await getOwnedProjectOrThrow(params.id, userId);

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: PROJECT_INCLUDE,
    });
    if (!project) return jsonError("المشروع غير موجود", 404);

    return NextResponse.json({ project: serializeProject(project) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    await getOwnedProjectOrThrow(params.id, userId);

    const body = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: parsed.data,
      include: PROJECT_INCLUDE,
    });

    return NextResponse.json({ project: serializeProject(project) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    await getOwnedProjectOrThrow(params.id, userId);
    await prisma.project.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
