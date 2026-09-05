import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { Project, Scene, Video, GeneratedAsset } from "@prisma/client";
import type { ProjectDTO, ProjectSummaryDTO, SceneDTO, VideoDTO } from "@/types";

/**
 * Shared `include` for every route that returns a full ProjectDTO. Bundling
 * the latest VOICE asset here means the voice-over URL survives a page
 * reload (StepVoice can resume showing the player) without a separate
 * endpoint.
 */
export const PROJECT_INCLUDE = {
  scenes: true,
  video: true,
  assets: {
    where: { type: "VOICE" as const },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.ProjectInclude;

export function jsonError(message: string, status = 400, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** Uniform error → HTTP response mapping for route handlers' catch blocks. */
export function handleRouteError(err: unknown) {
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status !== 500) {
      return jsonError(err.message, status);
    }
    console.error(err);
    return jsonError("حدث خطأ غير متوقع، حاول مرة أخرى", 500);
  }
  console.error(err);
  return jsonError("حدث خطأ غير متوقع", 500);
}

export function serializeScene(scene: Scene): SceneDTO {
  return {
    id: scene.id,
    order: scene.order,
    description: scene.description,
    character: scene.character,
    location: scene.location,
    dialogue: scene.dialogue,
    imagePrompt: scene.imagePrompt,
    imageStatus: scene.imageStatus as SceneDTO["imageStatus"],
    imageUrl: scene.imageUrl,
  };
}

export function serializeVideo(video: Video): VideoDTO {
  return {
    id: video.id,
    url: video.url,
    thumbnailUrl: video.thumbnailUrl,
    durationSeconds: video.durationSeconds,
    aspectRatio: video.aspectRatio,
  };
}

export function serializeProject(
  project: Project & { scenes?: Scene[]; video?: Video | null; assets?: GeneratedAsset[] }
): ProjectDTO {
  return {
    id: project.id,
    title: project.title,
    idea: project.idea,
    status: project.status as ProjectDTO["status"],
    currentStep: project.currentStep,
    durationSeconds: project.durationSeconds,
    aspectRatio: project.aspectRatio as ProjectDTO["aspectRatio"],
    animeStyle: project.animeStyle,
    language: project.language,
    voiceId: project.voiceId,
    script: project.script,
    musicMood: project.musicMood,
    sfxEnabled: project.sfxEnabled,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    scenes: (project.scenes ?? []).sort((a, b) => a.order - b.order).map(serializeScene),
    video: project.video ? serializeVideo(project.video) : null,
    voiceUrl: project.assets?.[0]?.url ?? null,
  };
}

export function serializeProjectSummary(
  project: Project & { video?: Video | null }
): ProjectSummaryDTO {
  return {
    id: project.id,
    title: project.title,
    idea: project.idea,
    status: project.status as ProjectSummaryDTO["status"],
    currentStep: project.currentStep,
    aspectRatio: project.aspectRatio as ProjectDTO["aspectRatio"],
    updatedAt: project.updatedAt.toISOString(),
    hasVideo: Boolean(project.video),
  };
}
