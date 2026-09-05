import type {
  GenerateScriptInput,
  GenerateScriptResult,
  GenerateScenesInput,
  GenerateScenesResult,
  GenerateImageInput,
  GenerateImageResult,
  GenerateVoiceInput,
  GenerateVoiceResult,
  GenerateVideoInput,
  GenerateVideoResult,
} from "./types";

/**
 * AIService is the single contract every AI provider must satisfy.
 *
 * Nothing outside src/lib/ai/** ever imports a concrete provider directly —
 * API routes call getAIService() (see index.ts) and program against this
 * interface. Swapping OpenAI for Anthropic, or the mock for a real image
 * model, means writing one new class here and flipping an env var; zero
 * changes anywhere else in the app.
 */
export interface AIService {
  readonly providerName: string;

  generateScript(input: GenerateScriptInput): Promise<GenerateScriptResult>;

  generateScenePrompts(input: GenerateScenesInput): Promise<GenerateScenesResult>;

  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;

  generateVoice(input: GenerateVoiceInput): Promise<GenerateVoiceResult>;

  generateVideo(input: GenerateVideoInput): Promise<GenerateVideoResult>;
}
