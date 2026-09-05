// Client-facing shapes returned by the API — kept separate from Prisma's
// generated types so the frontend never depends on the ORM directly.

export type SceneDTO = {
  id: string;
  order: number;
  description: string;
  character: string | null;
  location: string | null;
  dialogue: string | null;
  imagePrompt: string;
  imageStatus: "PENDING" | "GENERATING" | "READY" | "FAILED";
  imageUrl: string | null;
};

export type VideoDTO = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  aspectRatio: string;
};

export type ProjectDTO = {
  id: string;
  title: string;
  idea: string;
  status:
    | "DRAFT"
    | "SCRIPT_READY"
    | "SCENES_READY"
    | "RENDERING"
    | "COMPLETED"
    | "FAILED";
  currentStep: number;
  durationSeconds: number;
  aspectRatio: "9:16" | "16:9" | "1:1";
  animeStyle: string;
  language: string;
  voiceId: string;
  script: string | null;
  musicMood: string | null;
  sfxEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  scenes: SceneDTO[];
  video: VideoDTO | null;
  voiceUrl: string | null;
};

export type ProjectSummaryDTO = {
  id: string;
  title: string;
  idea: string;
  status: ProjectDTO["status"];
  currentStep: number;
  aspectRatio: ProjectDTO["aspectRatio"];
  updatedAt: string;
  hasVideo: boolean;
};

export type DashboardStats = {
  totalProjects: number;
  videosGenerated: number;
  creditsRemaining: number;
};

export type ApiError = { error: string; code?: string };
