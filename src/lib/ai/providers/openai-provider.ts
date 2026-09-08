import type { AIService } from "../AIService";
import { MockAIProvider } from "./mock-provider";
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

  /** OpenAI-compatible chat endpoint. Override with OPENAI_BASE_URL to use a
   *  gateway (Kie.ai, OpenRouter, Azure, a local server, ...). */
  private get baseUrl() {
    return (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  }

  private async chat(messages: { role: "system" | "user"; content: string }[]) {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
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

    // Some models wrap JSON in ```json fences or add stray prose — pull out the
    // first {...} block before parsing.
    const json = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const match = json.match(/\{[\s\S]*\}/);

    let scenes: SceneDraft[];
    try {
      const parsed = JSON.parse(match ? match[0] : json) as { scenes: SceneDraft[] };
      scenes = parsed.scenes;
      if (!Array.isArray(scenes) || scenes.length === 0) throw new Error("no scenes");
    } catch {
      throw new Error("Failed to parse scene breakdown from AI response");
    }

    return { scenes };
  }

  /**
   * Kie.ai async jobs API (https://api.kie.ai): POST a task, poll recordInfo
   * until it's done, return the first result URL. Generic — the same shape
   * works for image / audio / video, only `model` + `input` change.
   *
   * `budgetMs` is the total wall-clock budget and must stay under the calling
   * route's maxDuration. Kie occasionally returns a transient "Internal Error"
   * failure; we retry once if there's enough budget left.
   */
  private async kieJob(
    baseUrl: string,
    key: string,
    model: string,
    input: Record<string, unknown>,
    budgetMs = 55_000,
    perAttemptMs = budgetMs,
  ): Promise<string> {
    const start = Date.now();
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const remaining = budgetMs - (Date.now() - start);
      if (remaining < 9_000) break; // not enough time for another attempt
      try {
        return await this.kieJobOnce(baseUrl, key, model, input, Math.min(remaining, perAttemptMs));
      } catch (err) {
        lastErr = err as Error;
        // Retry any failure while there's budget — Kie's TTS/image jobs fail
        // transiently ("Internal Error, please try again") fairly often.
      }
    }
    throw lastErr ?? new Error("Kie job failed");
  }

  private async kieJobOnce(
    baseUrl: string,
    key: string,
    model: string,
    input: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<string> {
    const root = baseUrl.replace(/\/+$/, "");
    const auth = { Authorization: `Bearer ${key}` };

    const createRes = await fetch(`${root}/api/v1/jobs/createTask`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input }),
    });
    const created = (await createRes.json().catch(() => ({}))) as {
      code?: number;
      msg?: string;
      data?: { taskId?: string };
    };
    if (created.code !== 200 || !created.data?.taskId) {
      throw new Error(`Kie createTask failed (${created.code ?? createRes.status}): ${created.msg ?? "unknown"}`);
    }
    const taskId = created.data.taskId;

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(`${root}/api/v1/jobs/recordInfo?taskId=${taskId}`, { headers: auth });
      const data = ((await pollRes.json().catch(() => ({}))) as { data?: Record<string, unknown> }).data;
      const state = data?.state as string | undefined;
      if (state === "fail") throw new Error(`Kie job failed: ${(data?.failMsg as string) ?? "unknown"}`);
      if (state === "success") {
        const fromResponse = (data?.response as { resultUrls?: string[] } | undefined)?.resultUrls;
        const fromJson =
          typeof data?.resultJson === "string"
            ? (JSON.parse(data.resultJson) as { resultUrls?: string[] }).resultUrls
            : undefined;
        const url = fromResponse?.[0] ?? fromJson?.[0];
        if (url) return url;
        throw new Error("Kie job succeeded but returned no result URL");
      }
    }
    throw new Error("Kie job timed out");
  }

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const baseUrl = process.env.IMAGE_API_BASE_URL;
    const key = process.env.IMAGE_API_KEY;
    if (!baseUrl || !key) {
      throw new Error("Image generation isn't configured — set IMAGE_API_BASE_URL and IMAGE_API_KEY.");
    }
    // Seedream v4: ~15s (vs nano-banana's 30-60s), honours image reference for
    // character consistency, no watermark.
    const model = process.env.IMAGE_MODEL || "bytedance/seedream-v4-text-to-image";
    const refs = input.referenceImageUrls?.filter(Boolean) ?? [];

    const imageSize =
      input.aspectRatio === "16:9"
        ? "landscape_16_9"
        : input.aspectRatio === "1:1"
          ? "square_hd"
          : "portrait_16_9";

    const prompt = refs.length
      ? `Keep the SAME character(s), face, outfit and art style as the reference image. ` +
        `New shot: ${input.imagePrompt}`
      : `${input.animeStyle} anime style, original characters and designs (nothing copyrighted), ` +
        `cinematic lighting. Scene: ${input.imagePrompt}`;

    const jobInput: Record<string, unknown> = {
      prompt,
      output_format: "png",
      image_size: imageSize,
    };
    if (refs.length) jobInput.image_urls = refs;

    const url = await this.kieJob(baseUrl, key, model, jobInput, 54_000);
    return { url, provider: `kie:${model}` };
  }

  async generateVoice(input: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    const baseUrl = process.env.VOICE_API_BASE_URL;
    const key = process.env.VOICE_API_KEY;
    if (!baseUrl || !key) {
      throw new Error("Voice generation isn't configured — set VOICE_API_BASE_URL and VOICE_API_KEY.");
    }

    // ElevenLabs multilingual turbo (handles Arabic + English). The app's voice
    // ids map to real ElevenLabs public voices.
    const VOICE_IDS: Record<string, string> = {
      aria: "9BWtsMINqrJLrRacOk9x",
      kenji: "nPczCjzI2devNBz1zQrb",
      noor: "EXAVITQu4vr4xnSDxMaL",
      leo: "IKne3meq5aSn9XLyUdCD",
      maya: "21m00Tcm4TlvDq8ikWAM",
    };
    const voiceId = VOICE_IDS[input.voiceId] ?? "EkK5I93UQWFDigLMpZcX";
    const model = process.env.VOICE_MODEL || "elevenlabs/text-to-speech-turbo-2-5";

    const text = input.lines.map((l) => l.text).join("\n\n").slice(0, 5000);

    try {
      // TTS usually finishes in <20s; cap each try so a stuck one leaves room
      // to retry within the route's 60s budget.
      // Healthy TTS finishes in 5-15s. Two short tries, then give up fast so the
      // fallback + rehost still fit inside the route's 60s budget.
      const url = await this.kieJob(
        baseUrl,
        key,
        model,
        { text, voice: { voice_id: voiceId } },
        34_000,
        16_000,
      );
      // No duration in the response — estimate from word count (~2.5 words/sec).
      const words = text.split(/\s+/).filter(Boolean).length;
      const durationSeconds = Math.max(3, Math.round(words / 2.5));
      return { url, provider: `kie:${model}`, durationSeconds };
    } catch (err) {
      // Kie's TTS pipeline goes down for hours at a time. Rather than block the
      // whole wizard, fall back to the placeholder track — the route sees the
      // "mock" provider and refunds, so the user isn't charged for it and can
      // regenerate later.
      console.error("TTS provider failed, falling back to placeholder:", (err as Error).message);
      return new MockAIProvider().generateVoice(input);
    }
  }

  async generateVideo(_input: GenerateVideoInput): Promise<GenerateVideoResult> {
    const baseUrl = process.env.VIDEO_API_BASE_URL;
    const key = process.env.VIDEO_API_KEY;
    if (!baseUrl || !key) {
      throw new Error(
        "Video generation isn't configured yet — set VIDEO_API_BASE_URL and VIDEO_API_KEY. Note: real video models (Kie.ai Veo/Kling/Sora) take minutes, which exceeds a serverless function's max duration — this route needs the callBackUrl flow + a status-polling UI, not a synchronous call.",
      );
    }
    throw new Error("generateVideo: implement the callback-based provider call.");
  }
}
