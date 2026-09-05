"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { ProjectDTO } from "@/types";

export function StepIdea({
  project,
  onSaved,
}: {
  project: ProjectDTO;
  onSaved: (project: ProjectDTO) => void;
}) {
  const [idea, setIdea] = useState(project.idea);
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, currentStep: Math.max(project.currentStep, 2) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر حفظ الفكرة");
        return;
      }
      onSaved(data.project);
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>فكرة الفيديو</CardTitle>
        <CardDescription>يمكنك تعديل الفكرة الآن قبل المتابعة لاختيار خيارات الفيديو.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={500} />
        <div className="mt-1 text-end text-xs text-muted">{idea.length}/500</div>

        <Button
          className="mt-6 w-full"
          size="lg"
          loading={saving}
          disabled={idea.trim().length < 8}
          onClick={handleContinue}
          icon={<ArrowLeft className="size-4 rtl:rotate-180" />}
        >
          متابعة إلى الخيارات
        </Button>
      </CardContent>
    </Card>
  );
}
