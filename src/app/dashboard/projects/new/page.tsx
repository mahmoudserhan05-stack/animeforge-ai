"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const IDEA_EXAMPLES = [
  "محارب أنمي يقاتل تنينًا لإنقاذ مدينته",
  "طالبة تكتشف أن لديها قوى خارقة ليلة الامتحان النهائي",
  "روبوت وحيد يبحث عن معنى الصداقة في مدينة مستقبلية",
  "صياد وحوش شاب يواجه أسطورته الأولى",
];

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [idea, setIdea] = useState(searchParams.get("idea") || "");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (idea.trim().length < 8) {
      toast.error("اكتب فكرة أوضح قليلًا (8 أحرف على الأقل)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر إنشاء المشروع");
        return;
      }
      router.push(`/dashboard/projects/${data.id}`);
    } catch {
      toast.error("حدث خطأ أثناء إنشاء المشروع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => router.back()} icon={<ArrowLeft className="size-4 rtl:rotate-180" />}>
        رجوع
      </Button>

      <Card className="mt-4">
        <CardHeader>
          <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan shadow-neon">
            <Sparkles className="size-6 text-white" />
          </div>
          <CardTitle className="mt-4">ما هي فكرة فيديو الأنمي؟</CardTitle>
          <CardDescription>جملة واحدة كافية — سنهتم بالباقي: السيناريو، المشاهد، الصور، الصوت والفيديو النهائي.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="مثال: محارب أنمي يقاتل تنينًا لإنقاذ مدينته"
            maxLength={500}
            autoFocus
          />
          <div className="mt-1 text-end text-xs text-muted">{idea.length}/500</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {IDEA_EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => setIdea(example)}
                className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {example}
              </button>
            ))}
          </div>

          <Button className="mt-6 w-full" size="lg" loading={loading} onClick={handleCreate} icon={<Sparkles className="size-4" />}>
            متابعة إلى خيارات الفيديو
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={null}>
      <NewProjectForm />
    </Suspense>
  );
}
