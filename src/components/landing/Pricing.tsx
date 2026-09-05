import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "0$",
    period: "/شهريًا",
    description: "للتجربة وصناعة أول فيديو أنمي لك.",
    credits: "100 رصيد شهريًا",
    features: ["حتى 3 مشاريع نشطة", "فيديوهات بمقاس 9:16", "علامة مائية خفيفة", "دعم عبر المجتمع"],
    highlighted: false,
    cta: "ابدأ مجانًا",
  },
  {
    name: "Creator",
    price: "19$",
    period: "/شهريًا",
    description: "لصانعي المحتوى المنتظمين.",
    credits: "1200 رصيد شهريًا",
    features: [
      "مشاريع غير محدودة",
      "كل مقاسات الفيديو",
      "بدون علامة مائية",
      "أولوية في المعالجة",
      "دعم عبر البريد الإلكتروني",
    ],
    highlighted: true,
    cta: "ترقية إلى Creator",
  },
  {
    name: "Studio",
    price: "49$",
    period: "/شهريًا",
    description: "للفرق والوكالات الصغيرة.",
    credits: "3500 رصيد شهريًا",
    features: [
      "كل مزايا Creator",
      "أصوات وموسيقى حصرية",
      "تصدير بجودة أعلى",
      "دعم مباشر مخصص",
    ],
    highlighted: false,
    cta: "ترقية إلى Studio",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">أسعار بسيطة وشفافة</h2>
        <p className="mt-3 text-muted">
          ابدأ مجانًا بالكامل. الدفع الحقيقي غير مفعّل بعد في هذه النسخة — البنية جاهزة لإضافته.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative rounded-xl2 border p-6",
              plan.highlighted
                ? "border-primary bg-gradient-to-b from-primary/10 to-transparent shadow-neon"
                : "border-border bg-surface/60"
            )}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 start-6 rounded-full bg-gradient-to-r from-primary to-accent-cyan px-3 py-1 text-xs font-semibold text-white">
                الأكثر شيوعًا
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{plan.name}</h3>
            <p className="mt-1 text-sm text-muted">{plan.description}</p>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{plan.price}</span>
              <span className="text-sm text-muted">{plan.period}</span>
            </div>
            <p className="mt-1 text-xs text-accent-cyan">{plan.credits}</p>

            <ul className="mt-6 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <Check className="size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/sign-up" className="mt-6 block">
              <Button variant={plan.highlighted ? "primary" : "secondary"} className="w-full">
                {plan.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
