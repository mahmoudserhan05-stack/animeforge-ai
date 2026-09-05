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
import { delay, pickFromSeed } from "@/lib/utils";

const PLACEHOLDER_IMAGE_COUNT = 6;

function placeholderImageUrl(seed: string) {
  const idx = (Math.abs(hashString(seed)) % PLACEHOLDER_IMAGE_COUNT) + 1;
  return `/demo/scene-placeholder-${idx}.png`;
}

function hashString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

const ARABIC_OPENERS = [
  "في مدينة تلفّها الأضواء النيونية، حيث تتقاطع أحلام الأبطال مع أخطار لا تُرى بالعين المجردة",
  "منذ فجر الزمن، تحرس هذه الأرض قوى قديمة لا يعرف عنها أهلها شيئًا",
  "لم يكن يومًا عاديًا؛ فالسماء تغيّرت لونها فجأة، وشيء ما استيقظ",
];

const ARABIC_CLOSERS = [
  "وهكذا بدأت رحلة لن تُنسى، رحلة تُعيد تعريف معنى الشجاعة.",
  "والآن، لا عودة إلى الوراء — المعركة القادمة ستغيّر كل شيء.",
  "وبينما تهدأ الغبار، يدرك الجميع أن هذه كانت البداية فقط.",
];

/**
 * MockAIProvider — fully offline, zero-cost, deterministic-ish implementation
 * of AIService. Used automatically whenever no real provider API key is
 * configured (see ../index.ts), so the entire product — script, scenes,
 * images, voice, video — can be exercised end-to-end before any AI vendor
 * is wired up.
 */
export class MockAIProvider implements AIService {
  readonly providerName = "mock";

  async generateScript({ idea, options }: GenerateScriptInput): Promise<GenerateScriptResult> {
    await delay(700);

    const isArabic = options.language.startsWith("ar");
    const opener = pickFromSeed(idea, isArabic ? ARABIC_OPENERS : [
      "In a city lit by neon and old prophecy, a hero rises where none was expected",
      "Long before the archives remember, an ancient power stirred beneath the streets",
      "It began as an ordinary day — until the sky cracked and nothing was ordinary again",
    ]);
    const closer = pickFromSeed(idea + "closer", isArabic ? ARABIC_CLOSERS : [
      "And so a journey no one will forget begins — one that will redefine courage itself.",
      "There is no turning back now. The next battle changes everything.",
      "As the dust settles, everyone understands: this was only the beginning.",
    ]);

    const title = idea
      .split(" ")
      .slice(0, 6)
      .join(" ")
      .replace(/[.!؟?]+$/, "");

    const script = isArabic
      ? `${opener}.

الفكرة: ${idea}

المشهد الافتتاحي يقدّم بطلنا في لحظة هدوء قبل العاصفة، محاطًا بتفاصيل تكشف عن عالمه وشخصيته دون أن تقول ذلك مباشرة. سرعان ما يظهر الخطر — قوة معادية تهدد كل ما يعرفه بطلنا — فيضطر لاتخاذ قرار لا رجعة فيه.

خلال المواجهة، يستخدم البطل ذكاءه وشجاعته أكثر من قوته الغاشمة، ويكتشف في اللحظة الحاسمة قدرة داخلية لم يكن يعرف أنه يملكها. الصراع يصل إلى ذروته في مشهد بصري مكثف، مليء بالحركة والتوتر.

${closer}`
      : `${opener}.

Premise: ${idea}

The opening scene introduces our hero in a quiet moment before the storm — small details reveal who they are without ever spelling it out. Danger arrives fast: a force threatens everything the hero knows, forcing an irreversible choice.

Through the confrontation, wit and courage matter more than raw power, and in the decisive moment the hero discovers a strength they never knew they had. The conflict peaks in one intense, visually driven sequence full of motion and tension.

${closer}`;

    return { script, suggestedTitle: title || "Untitled Anime Short" };
  }

  async generateScenePrompts({ script, options }: GenerateScenesInput): Promise<GenerateScenesResult> {
    await delay(900);

    const sceneCount = options.durationSeconds <= 15 ? 3 : options.durationSeconds <= 30 ? 5 : 8;
    const beats = [
      { key: "establishing", label: "Establishing shot" },
      { key: "hero-intro", label: "Hero introduction" },
      { key: "inciting", label: "Inciting incident" },
      { key: "rising-action", label: "Rising tension" },
      { key: "confrontation", label: "Confrontation" },
      { key: "climax", label: "Climax" },
      { key: "turning-point", label: "Turning point" },
      { key: "resolution", label: "Resolution" },
    ];

    const chosenBeats = beats.slice(0, sceneCount);
    const isArabic = options.language.startsWith("ar");

    const scenes: SceneDraft[] = chosenBeats.map((beat, i) => {
      const order = i + 1;
      return {
        order,
        description: isArabic
          ? `${beat.label}: لقطة ${order} من ${sceneCount} — تُظهر تطور الحدث ضمن أسلوب ${options.animeStyle}.`
          : `${beat.label}: shot ${order} of ${sceneCount}, advancing the story in a ${options.animeStyle} style.`,
        character: isArabic ? "البطل الرئيسي" : "Main Hero",
        location: isArabic ? "المدينة المستقبلية" : "The Futuristic City",
        dialogue:
          order === 1
            ? null
            : isArabic
            ? "لن أتراجع، ليس اليوم."
            : "I won't back down. Not today.",
        imagePrompt: `${options.animeStyle} anime style, original character (no copyrighted design), ${beat.label.toLowerCase()}, dynamic lighting, cinematic composition, ${options.aspectRatio} frame`,
      };
    });

    return { scenes };
  }

  async generateImage({ imagePrompt }: GenerateImageInput): Promise<GenerateImageResult> {
    await delay(1100);
    return { url: placeholderImageUrl(imagePrompt), provider: this.providerName };
  }

  async generateVoice({ lines }: GenerateVoiceInput): Promise<GenerateVoiceResult> {
    await delay(1300);
    const approxDuration = Math.max(3, Math.round(lines.length * 2.2));
    return {
      url: "/demo/voice-placeholder.mp3",
      provider: this.providerName,
      durationSeconds: approxDuration,
    };
  }

  async generateVideo({ durationSeconds }: GenerateVideoInput): Promise<GenerateVideoResult> {
    await delay(1800);
    return {
      url: "/demo/demo-video-placeholder.mp4",
      thumbnailUrl: "/demo/scene-placeholder-1.png",
      provider: this.providerName,
      durationSeconds,
    };
  }
}
