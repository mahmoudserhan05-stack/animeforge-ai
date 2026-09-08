import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getOwnedProjectOrThrow } from "@/lib/session";
import { jsonError, handleRouteError, serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { spendCredits, refundCredits, InsufficientCreditsError } from "@/lib/credits";
import { getAIService } from "@/lib/ai";
import { persistRemoteFile } from "@/lib/storage";

export const maxDuration = 60;

/**
 * POST /api/projects/:id/video — start the final render. Spends the credits,
 * marks the project RENDERING, and (unless ?fallback=1) leaves the actual
 * render to the browser, which assembles a slideshow of the scene images +
 * voice-over and finalises via PUT. ?fallback=1 uses the placeholder clip
 * for browsers that can't record.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);

    const project = await getOwnedProjectOrThrow(params.id, userId);
    const scenes = await prisma.scene.findMany({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });
    if (scenes.length === 0 || scenes.some((s) => s.imageStatus !== "READY")) {
      return jsonError("يجب إنشاء صور كل المشاهد أولًا", 400);
    }

    const rl = rateLimit(`ai:${userId}`, RATE_LIMITS.aiGeneration.limit, RATE_LIMITS.aiGeneration.windowMs);
    if (!rl.success) return jsonError("طلبات ذكاء اصطناعي كثيرة جدًا، حاول بعد قليل", 429);

    // Only charge once — re-running the step after a browser-side failure
    // shouldn't double-bill.
    const alreadyCharged = await prisma.creditTransaction.findFirst({
      where: { userId, projectId: project.id, reason: "video_generation" },
    });
    if (!alreadyCharged) {
      try {
        await spendCredits(userId, "video_generation", project.id);
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return jsonError("لا يوجد رصيد كافٍ لهذه العملية", 402, "INSUFFICIENT_CREDITS");
        }
        throw e;
      }
    }

    await prisma.$transaction([
      prisma.project.update({ where: { id: project.id }, data: { status: "RENDERING" } }),
      prisma.video.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          url: "",
          thumbnailUrl: scenes[0].imageUrl,
          durationSeconds: project.durationSeconds,
          aspectRatio: project.aspectRatio,
          provider: "browser",
          status: "GENERATING",
        },
        update: { status: "GENERATING", provider: "browser", thumbnailUrl: scenes[0].imageUrl },
      }),
    ]);

    if (req.nextUrl.searchParams.get("fallback") === "1") {
      return finalizeWithPlaceholder(project.id, userId, project.durationSeconds, project.aspectRatio);
    }

    const updated = await prisma.project.findUnique({ where: { id: project.id }, include: PROJECT_INCLUDE });
    return NextResponse.json({ project: serializeProject(updated!), needsClientRender: true });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * PUT /api/projects/:id/video — finalise. The browser has already streamed
 * the assembled file straight to Blob (see ./upload); it just hands us the
 * resulting URL to record.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return jsonError("غير مصرح", 401);
    const project = await getOwnedProjectOrThrow(params.id, userId);

    const { url } = (await req.json().catch(() => ({}))) as { url?: string };
    if (
      !url ||
      !/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(url) ||
      !url.includes(`projects/${project.id}/`)
    ) {
      return jsonError("رابط فيديو غير صالح", 400);
    }

    const firstScene = await prisma.scene.findFirst({
      where: { projectId: project.id },
      orderBy: { order: "asc" },
    });

    await prisma.$transaction([
      prisma.video.upsert({
        where: { projectId: project.id },
        create: {
          projectId: project.id,
          url,
          thumbnailUrl: firstScene?.imageUrl,
          durationSeconds: project.durationSeconds,
          aspectRatio: project.aspectRatio,
          provider: "browser",
          status: "READY",
        },
        update: { url, provider: "browser", status: "READY" },
      }),
      prisma.project.update({
        where: { id: project.id },
        data: { status: "COMPLETED", currentStep: 8 },
      }),
      prisma.generatedAsset.create({
        data: { projectId: project.id, type: "VIDEO", provider: "browser", url, creditsSpent: 15 },
      }),
    ]);

    const updated = await prisma.project.findUnique({ where: { id: project.id }, include: PROJECT_INCLUDE });
    return NextResponse.json({ project: serializeProject(updated!) });
  } catch (err) {
    return handleRouteError(err);
  }
}

async function finalizeWithPlaceholder(
  projectId: string,
  userId: string,
  durationSeconds: number,
  aspectRatio: string,
) {
  const ai = getAIService();
  const scenes = await prisma.scene.findMany({ where: { projectId }, orderBy: { order: "asc" } });
  const voiceAsset = await prisma.generatedAsset.findFirst({
    where: { projectId, type: "VOICE" },
    orderBy: { createdAt: "desc" },
  });
  try {
    const gen = await ai.generateVideo({
      projectTitle: "",
      aspectRatio: aspectRatio as "9:16" | "16:9" | "1:1",
      durationSeconds,
      sceneImageUrls: scenes.map((s) => s.imageUrl as string),
      voiceUrl: voiceAsset?.url ?? null,
      musicMood: null,
    });
    const url = await persistRemoteFile(gen.url, `projects/${projectId}/final`);
    await prisma.$transaction([
      prisma.video.upsert({
        where: { projectId },
        create: {
          projectId,
          url,
          thumbnailUrl: gen.thumbnailUrl,
          durationSeconds: gen.durationSeconds,
          aspectRatio,
          provider: gen.provider,
          status: "READY",
        },
        update: { url, provider: gen.provider, status: "READY" },
      }),
      prisma.project.update({ where: { id: projectId }, data: { status: "COMPLETED", currentStep: 8 } }),
      prisma.generatedAsset.create({
        data: { projectId, type: "VIDEO", provider: gen.provider, url, creditsSpent: 15 },
      }),
    ]);
  } catch (genErr) {
    await prisma.project.update({ where: { id: projectId }, data: { status: "FAILED" } });
    await refundCredits(userId, "video_generation", projectId);
    throw genErr;
  }
  const updated = await prisma.project.findUnique({ where: { id: projectId }, include: PROJECT_INCLUDE });
  return NextResponse.json({ project: serializeProject(updated!) });
}
