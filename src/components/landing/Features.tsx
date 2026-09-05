import { Layers, ShieldCheck, Sparkles, Coins, SlidersHorizontal, Smartphone } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "شخصيات وتصاميم أصلية",
    description: "كل شخصية وصورة تُنشأ بأسلوب أنمي أصلي بالكامل — بدون أي محتوى محمي بحقوق الطبع.",
  },
  {
    icon: Layers,
    title: "معالج إنشاء بـ 8 خطوات",
    description: "من الفكرة إلى المعاينة النهائية، بخطوات واضحة يمكنك التحكم بها في كل مرحلة.",
  },
  {
    icon: SlidersHorizontal,
    title: "تحكم كامل بالتفاصيل",
    description: "عدّل السيناريو، صف كل مشهد، واختر الصوت والموسيقى التي تناسب قصتك.",
  },
  {
    icon: Coins,
    title: "نظام رصيد شفاف",
    description: "كل عملية ذكاء اصطناعي تستهلك رصيدًا واضحًا، مع تنبيه فوري عند الحاجة للترقية.",
  },
  {
    icon: Smartphone,
    title: "جاهز لكل منصة",
    description: "تصدير مباشر بمقاسات 9:16 و16:9 و1:1 لـ TikTok وYouTube Shorts وInstagram Reels.",
  },
  {
    icon: ShieldCheck,
    title: "بنية آمنة وقابلة للتوسع",
    description: "مصادقة، حماية للمشاريع، وطبقة ذكاء اصطناعي قابلة لاستبدال أي مزوّد لاحقًا.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">مميزات مصمّمة للمبدعين</h2>
        <p className="mt-3 text-muted">كل ما تحتاجه لإنتاج محتوى أنمي احترافي، في مكان واحد.</p>
      </div>

      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="glass rounded-xl2 p-6 transition-all hover:shadow-neon-pink"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent-cyan/20 text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display font-semibold">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
