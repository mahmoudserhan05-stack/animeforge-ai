import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeScene } from "@/lib/api-utils";
import { updateSceneSchema } from "@/lib/validations";

/** PATCH /api/projects/:id/scenes/:sceneId — edit a single scene's fields. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sceneId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    await getOwnedProjectOrThrow(params.id, userId);

    const scene = await prisma.scene.findUnique({ where: { id: params.sceneId } });
    if (!scene || scene.projectId !== params.id) {
      return jsonError("المشهد غير موجود", 404);
    }

    const body = await req.json().catch(() => null);
    const parsed = updateSceneSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const updated = await prisma.scene.update({
      where: { id: scene.id },
      data: parsed.data,
    });

    return NextResponse.json({ scene: serializeScene(updated) });
  } catch (err) {
    return handleRouteError(err);
  }
}
