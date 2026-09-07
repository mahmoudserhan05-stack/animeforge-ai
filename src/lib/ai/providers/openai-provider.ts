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
   * until it's done, return the first result URL. Kept generic so the same
   * shape works for image / audio / video models — only `model` + `input`
   * change. `timeoutMs` must stay under the calling route's maxDuration.
   */
  private async kieJob(
    baseUrl: string,
    key: string,
    model: string,
    input: Record<string, unknown>,
    timeoutMs = 55_000,
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
    const model = process.env.IMAGE_MODEL || "google/nano-banana";
    const prompt =
      `${input.animeStyle} anime style, original characters and designs (nothing copyrighted), ` +
      `cinematic lighting, ${input.aspectRatio} vertical frame. Scene: ${input.imagePrompt}`;

    const url = await this.kieJob(baseUrl, key, model, {
      prompt,
      output_format: "png",
      aspect_ratio: input.aspectRatio,
    });
    return { url, provider: `kie:${model}` };
  }

  async generateVoice(_input: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    const baseUrl = process.env.VOICE_API_BASE_URL;
    const key = process.env.VOICE_API_KEY;
    if (!baseUrl || !key) {
      throw new Error(
        "Voice generation isn't configured yet — set VOICE_API_BASE_URL and VOICE_API_KEY, then wire the provider call here (Kie.ai: model elevenlabs/text-to-speech-turbo-2-5 via kieJob()).",
      );
    }
    throw new Error("generateVoice: implement the provider call.");
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
