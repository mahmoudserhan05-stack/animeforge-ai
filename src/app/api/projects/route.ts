import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { createProjectSchema } from "@/lib/validations";
import { jsonError, handleRouteError, serializeProjectSummary } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { slugifyTitle } from "@/lib/utils";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const projects = await prisma.project.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ projects: projects.map(serializeProjectSummary) });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const rl = rateLimit(`create-project:${userId}`, RATE_LIMITS.mutation.limit, RATE_LIMITS.mutation.windowMs);
    if (!rl.success) return jsonError("طلبات كثيرة جدًا، حاول بعد قليل", 429);

    const body = await req.json().catch(() => null);
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "بيانات غير صالحة", 422);
    }

    const project = await prisma.project.create({
      data: {
        userId,
        idea: parsed.data.idea,
        title: slugifyTitle(parsed.data.idea),
      },
    });

    return NextResponse.json({ id: project.id }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
