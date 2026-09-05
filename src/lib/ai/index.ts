import type { AIService } from "./AIService";
import type {
  GenerateScriptInput,
  GenerateScenesInput,
  GenerateImageInput,
  GenerateVoiceInput,
  GenerateVideoInput,
} from "./types";
import { MockAIProvider } from "./providers/mock-provider";
import { RealAIProvider } from "./providers/openai-provider";

/**
 * Provider factory — the ONE place that decides which AIService
 * implementation backs each capability. Everything else in the app (API
 * routes) calls getAIService() and never imports a provider class directly.
 *
 * Selection is per-capability, so you can turn on real AI one piece at a
 * time with zero code changes:
 *   - script + scene breakdown -> real when OPENAI_API_KEY is set
 *   - images  -> real when IMAGE_API_BASE_URL + IMAGE_API_KEY are set
 *   - voice   -> real when VOICE_API_BASE_URL + VOICE_API_KEY are set
 *   - video   -> real when VIDEO_API_BASE_URL + VIDEO_API_KEY are set
 * Anything not configured falls back to MockAIProvider, so the wizard always
 * completes end to end.
 */
let cached: AIService | null = null;

export function getAIService(): AIService {
  if (cached) return cached;

  const mock = new MockAIProvider();
  const real = new RealAIProvider();

  const useRealText = Boolean(process.env.OPENAI_API_KEY);
  const useRealImage = Boolean(process.env.IMAGE_API_BASE_URL && process.env.IMAGE_API_KEY);
  const useRealVoice = Boolean(process.env.VOICE_API_BASE_URL && process.env.VOICE_API_KEY);
  const useRealVideo = Boolean(process.env.VIDEO_API_BASE_URL && process.env.VIDEO_API_KEY);

  cached = {
    providerName:
      useRealText || useRealImage || useRealVoice || useRealVideo ? "hybrid" : "mock",

    generateScript: (input: GenerateScriptInput) =>
      (useRealText ? real : mock).generateScript(input),

    generateScenePrompts: (input: GenerateScenesInput) =>
      (useRealText ? real : mock).generateScenePrompts(input),

    generateImage: (input: GenerateImageInput) =>
      (useRealImage ? real : mock).generateImage(input),

    generateVoice: (input: GenerateVoiceInput) =>
      (useRealVoice ? real : mock).generateVoice(input),

    generateVideo: (input: GenerateVideoInput) =>
      (useRealVideo ? real : mock).generateVideo(input),
  };

  return cached;
}

export type { AIService } from "./AIService";
export * from "./types";
