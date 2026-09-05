// Shared types for the AI abstraction layer. Every provider (mock or real)
// implements AIService using these exact shapes, so callers (API routes)
// never know or care which provider is behind the interface.

export type AnimeStyle =
  | "shonen-action"
  | "shojo-drama"
  | "cyberpunk-noir"
  | "fantasy-adventure"
  | "slice-of-life";

export type WizardOptions = {
  durationSeconds: 15 | 30 | 60;
  aspectRatio: "9:16" | "16:9" | "1:1";
  animeStyle: string;
  language: string;
  voiceId: string;
};

export type GenerateScriptInput = {
  idea: string;
  options: WizardOptions;
};

export type GenerateScriptResult = {
  script: string;
  suggestedTitle: string;
};

export type SceneDraft = {
  order: number;
  description: string;
  character: string | null;
  location: string | null;
  dialogue: string | null;
  imagePrompt: string;
};

export type GenerateScenesInput = {
  script: string;
  options: WizardOptions;
};

export type GenerateScenesResult = {
  scenes: SceneDraft[];
};

export type GenerateImageInput = {
  imagePrompt: string;
  animeStyle: string;
  aspectRatio: WizardOptions["aspectRatio"];
  seed?: string;
};

export type GenerateImageResult = {
  url: string;
  provider: string;
};

export type GenerateVoiceInput = {
  lines: { sceneOrder: number; text: string }[];
  voiceId: string;
  language: string;
};

export type GenerateVoiceResult = {
  url: string;
  provider: string;
  durationSeconds: number;
};

export type GenerateVideoInput = {
  projectTitle: string;
  aspectRatio: WizardOptions["aspectRatio"];
  durationSeconds: number;
  sceneImageUrls: string[];
  voiceUrl: string | null;
  musicMood: string | null;
};

export type GenerateVideoResult = {
  url: string;
  thumbnailUrl: string;
  provider: string;
  durationSeconds: number;
};

export const ANIME_STYLES: { id: string; label: string }[] = [
  { id: "shonen-action", label: "Shonen Action" },
  { id: "shojo-drama", label: "Shojo Drama" },
  { id: "cyberpunk-noir", label: "Cyberpunk Noir" },
  { id: "fantasy-adventure", label: "Fantasy Adventure" },
  { id: "slice-of-life", label: "Slice of Life" },
];

export const VOICE_OPTIONS: { id: string; label: string; language: string }[] = [
  { id: "aria", label: "Aria — دافئ وواضح", language: "ar" },
  { id: "kenji", label: "Kenji — عميق وحماسي", language: "ar" },
  { id: "noor", label: "Noor — هادئ وسردي", language: "ar" },
  { id: "leo", label: "Leo — Energetic (English)", language: "en" },
  { id: "maya", label: "Maya — Warm Narrator (English)", language: "en" },
];

export const MUSIC_MOODS = [
  "epic-orchestral",
  "synthwave-tension",
  "emotional-piano",
  "upbeat-adventure",
  "dark-ambient",
];
