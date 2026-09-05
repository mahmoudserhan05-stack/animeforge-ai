import type { AIService } from "../AIService";
import type {
  GenerateScriptInput,
  GenerateScriptResult,
  GenerateScenesInput,
  GenerateScenesResult,
  SceneDraft,
  GenerateImageInput,
  GenerateImageResult,
  GenerateVoiceInput,
  GenerateVoiceResult,
  GenerateVideoInput,
  GenerateVideoResult,
} from "../types";

/**
 * RealAIProvider — production shape for wiring actual AI vendors.
 *
 * This is intentionally NOT hardcoded to one company's SDK. Instead, each
 * method calls a plain HTTPS JSON endpoint using fetch(), configured purely
 * through environment variables (never touched by the browser — this file
 * only ever runs server-side, inside API routes). Swap the URLs/payloads
 * below for whichever vendors you choose (OpenAI, Anthropic, Stability,
 * Runway, ElevenLabs, ...) without changing any caller — they only depend on
 * the AIService interface.
 *
 * generateScript / generateScenePrompts use an OpenAI-compatible
 * chat-completions shape (works unmodified with OpenAI, Azure OpenAI, and
 * most self-hosted/open-weight gateways). generateImage / generateVoice /
 * generateVideo are left as clearly-marked integration points: fill in the
 * fetch call for your chosen provider — the input/output contract is
 * already correct.
 */
export class RealAIProvider implements AIService {
  readonly providerName = "openai";

  private get openaiKey() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set");
    return key;
  }

  private get model() {
    return process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  private async chat(messages: { role: "system" | "user"; content: string }[]) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI script provider error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content ?? "";
  }

  async generateScript({ idea, options }: GenerateScriptInput): Promise<GenerateScriptResult> {
    const content = await this.chat([
      {
        role: "system",
        content:
          "You write short, original (non-copyrighted) anime-style video scripts. Never reference existing franchises or characters. Respond with the script only, no preamble.",
      },
      {
        role: "user",
        content: `Idea: ${idea}\nDuration: ${options.durationSeconds}s\nStyle: ${options.animeStyle}\nLanguage: ${options.language}\n\nWrite a short script for this anime video.`,
      },
    ]);

    return {
      script: content.trim(),
      suggestedTitle: idea.split(" ").slice(0, 6).join(" "),
    };
  }

  async generateScenePrompts({ script, options }: GenerateScenesInput): Promise<GenerateScenesResult> {
    const sceneCount = options.durationSeconds <= 15 ? 3 : options.durationSeconds <= 30 ? 5 : 8;

    const content = await this.chat([
      {
        role: "system",
        content:
          `Break the given script into exactly ${sceneCount} scenes for an anime short. ` +
          `Return strict JSON: {"scenes":[{"order":1,"description":"","character":"","location":"","dialogue":"","imagePrompt":""}]}. ` +
          "No copyrighted character names. No prose outside the JSON.",
      },
      { role: "user", content: script },
    ]);

    let scenes: SceneDraft[];
    try {
      const parsed = JSON.parse(content) as { scenes: SceneDraft[] };
      scenes = parsed.scenes;
    } catch {
      throw new Error("Failed to parse scene breakdown from AI response");
    }

    return { scenes };
  }

  async generateImage(_input: GenerateImageInput): Promise<GenerateImageResult> {
    const baseUrl = process.env.IMAGE_API_BASE_URL;
    const key = process.env.IMAGE_API_KEY;
    if (!baseUrl || !key) {
      throw new Error(
        "Image generation isn't configured yet — set IMAGE_API_BASE_URL and IMAGE_API_KEY, then implement the fetch() call to your image provider here."
      );
    }
    // TODO: call your image provider, e.g.:
    // const res = await fetch(baseUrl, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify({ prompt: input.imagePrompt, aspect_ratio: input.aspectRatio }) });
    throw new Error("generateImage: implement the provider call above.");
  }

  async generateVoice(_input: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    const baseUrl = process.env.VOICE_API_BASE_URL;
    const key = process.env.VOICE_API_KEY;
    if (!baseUrl || !key) {
      throw new Error(
        "Voice generation isn't configured yet — set VOICE_API_BASE_URL and VOICE_API_KEY, then implement the fetch() call to your TTS provider here."
      );
    }
    throw new Error("generateVoice: implement the provider call above.");
  }

  async generateVideo(_input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const baseUrl = process.env.VIDEO_API_BASE_URL;
    const key = process.env.VIDEO_API_KEY;
    if (!baseUrl || !key) {
      throw new Error(
        "Video generation isn't configured yet — set VIDEO_API_BASE_URL and VIDEO_API_KEY, then implement the fetch() call to your video-assembly provider here."
      );
    }
    throw new Error("generateVideo: implement the provider call above.");
  }
}
