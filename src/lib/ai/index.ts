import type { AIService } from "./AIService";
import { MockAIProvider } from "./providers/mock-provider";
import { RealAIProvider } from "./providers/openai-provider";

/**
 * Provider factory — the ONE place that decides which AIService
 * implementation is active. Everything else in the app (API routes) calls
 * getAIService() and never imports a provider class directly.
 *
 * Demo/Mock mode is automatic: if OPENAI_API_KEY isn't set, we fall back to
 * MockAIProvider so the whole product works with zero external accounts.
 * Add real keys to .env and this switches over with no code changes.
 */
let cached: AIService | null = null;

export function getAIService(): AIService {
  if (cached) return cached;

  const hasRealTextProvider = Boolean(process.env.OPENAI_API_KEY);
  cached = hasRealTextProvider ? new RealAIProvider() : new MockAIProvider();
  return cached;
}

export type { AIService } from "./AIService";
export * from "./types";
