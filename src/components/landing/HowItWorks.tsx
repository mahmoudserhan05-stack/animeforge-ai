import { PenLine, Clapperboard, Palette, Mic2, Film } from "lucide-react";

const steps = [
  {
    icon: PenLine,
    title: "اكتب فكرتك",
    description: "جملة واحدة بسيطة كافية — مثل \"محارب أنمي يقاتل تنينًا لإنقاذ مدينته\".",
  },
  {
    icon: Clapperboard,
    title: "السيناريو والمشاهد",
    description: "الذكاء الاصطناعي يكتب سيناريو قصير ويقسّمه إلى مشاهد قابلة للتعديل.",
  },
  {
    icon: Palette,
    title: "صور بأسلوب أنمي",
    description: "كل مشهد يتحول إلى صورة بأسلوب أنمي أصلي بالكامل تختاره أنت.",
  },
  {
    icon: Mic2,
    title: "صوت وموسيقى",
    description: "تعليق صوتي بالذكاء الاصطناعي مع موسيقى ومؤثرات صوتية مناسبة.",
  },
  {
    icon: Film,
    title: "فيديو جاهز للنشر",
    description: "فيديو نهائي بالمقاس الصحيح لـ TikTok وShorts وReels، جاهز للتحميل.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">كيف يعمل AnimeForge AI</h2>
        <p className="mt-3 text-muted">من الفكرة إلى الفيديو النهائي، بدون تعقيد.</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="group relative rounded-xl2 border border-border bg-surface/60 p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-neon"
          >
            <span className="absolute end-4 top-4 font-display text-3xl font-bold text-white/5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <step.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display font-semibold">{step.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
