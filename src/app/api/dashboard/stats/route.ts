import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { jsonError, handleRouteError } from "@/lib/api-utils";
import { getCreditBalance } from "@/lib/credits";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const [totalProjects, videosGenerated, creditsRemaining] = await Promise.all([
      prisma.project.count({ where: { userId } }),
      prisma.video.count({ where: { project: { userId } } }),
      getCreditBalance(userId),
    ]);

    return NextResponse.json({ totalProjects, videosGenerated, creditsRemaining });
  } catch (err) {
    return handleRouteError(err);
  }
}
