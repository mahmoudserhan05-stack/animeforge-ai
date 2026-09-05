import Link from "next/link";
import { ArrowLeft, Compass, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid-glow">
      <div className="absolute inset-0 bg-hero-grid bg-[length:44px_44px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />

      <div className="absolute -top-20 start-1/4 size-72 animate-float rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 end-1/4 size-72 animate-float rounded-full bg-accent-cyan/20 blur-3xl [animation-delay:2s]" />

      <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
        <div className="mb-6 inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted">
          <Wand2 className="size-3.5 text-primary" />
          يعمل بالكامل بدون أي إعداد — جرّبه الآن في وضع العرض التجريبي
        </div>

        <h1 className="animate-fade-up font-display text-4xl font-bold leading-tight tracking-tight [animation-delay:0.05s] sm:text-6xl">
          حوّل أفكارك إلى
          <br />
          <span className="text-gradient">فيديوهات أنمي</span> في دقائق
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-balance text-lg text-muted [animation-delay:0.1s]">
          اكتب فكرة من سطر واحد، ودع AnimeForge AI يحوّلها إلى سيناريو، مشاهد،
          صور بأسلوب أنمي أصلي، تعليق صوتي، وموسيقى — جاهزة لـ TikTok وYouTube
          Shorts وInstagram Reels.
        </p>

        <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:0.15s] sm:flex-row">
          <Link href="/dashboard/projects/new">
            <Button size="lg" icon={<Wand2 className="size-5" />}>
              ابدأ إنشاء فيديو أنمي
            </Button>
          </Link>
          <Link href="/dashboard/projects">
            <Button size="lg" variant="secondary" icon={<Compass className="size-5" />}>
              استكشف المشاريع
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted">
          شخصيات وتصاميم أصلية بالكامل — بدون أي محتوى محمي بحقوق الطبع والنشر.
        </p>
      </div>
    </section>
  );
}
