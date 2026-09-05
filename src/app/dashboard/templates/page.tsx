import Link from "next/link";
import { Swords, Rocket, HeartHandshake, Ghost, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

const TEMPLATES = [
  {
    icon: Swords,
    title: "معركة البطل الأخير",
    idea: "محارب أنمي وحيد يقف أمام تنين أسطوري لإنقاذ مدينته المحاصرة",
    style: "Shonen Action",
  },
  {
    icon: Rocket,
    title: "هروب من المستقبل",
    idea: "مخترعة شابة تبني آلة زمن سرية لإنقاذ مدينتها من كارثة قادمة",
    style: "Cyberpunk Noir",
  },
  {
    icon: HeartHandshake,
    title: "صداقة عبر الأبعاد",
    idea: "طالبة عادية تصادق روحًا من عالم موازٍ وتكتشفان معًا سر اختفاء المدارس",
    style: "Slice of Life",
  },
  {
    icon: Ghost,
    title: "أسطورة الغابة المسكونة",
    idea: "صياد وحوش شاب يواجه روحًا قديمة تحرس غابة محرّمة",
    style: "Fantasy Adventure",
  },
  {
    icon: Sparkles,
    title: "قوة مخفية",
    idea: "طالبة تكتشف أن لديها قوى خارقة في ليلة الامتحان النهائي",
    style: "Shojo Drama",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">القوالب</h1>
        <p className="mt-1 text-sm text-muted">ابدأ من فكرة جاهزة وعدّلها كما تشاء.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <div
            key={t.title}
            className="glass flex flex-col rounded-xl2 p-5 transition-all hover:-translate-y-1 hover:shadow-neon"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <t.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-display font-semibold">{t.title}</h3>
            <p className="mt-1.5 flex-1 text-sm text-muted">{t.idea}</p>
            <div className="mt-3 text-xs text-accent-cyan">{t.style}</div>
            <Link href={`/dashboard/projects/new?idea=${encodeURIComponent(t.idea)}`} className="mt-4">
              <Button variant="secondary" className="w-full">
                استخدم هذا القالب
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
