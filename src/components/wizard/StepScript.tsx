"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO } from "@/types";

export function StepScript({
  project,
  onUpdated,
  onContinue,
}: {
  project: ProjectDTO;
  onUpdated: (project: ProjectDTO) => void;
  onContinue: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const [script, setScript] = useState(project.script ?? "");
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/script`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.code === "INSUFFICIENT_CREDITS" ? "لا يوجد رصيد كافٍ" : data.error);
        return;
      }
      setScript(data.project.script ?? "");
      onUpdated(data.project);
      refresh();
      toast.success("تم إنشاء سيناريو جديد");
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleContinue() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/script`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر حفظ السيناريو");
        return;
      }
      onContinue(data.project);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>السيناريو</CardTitle>
        <CardDescription>عدّل السيناريو كما تريد، أو أعد توليده بالكامل.</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea rows={12} value={script} onChange={(e) => setScript(e.target.value)} className="font-sans leading-relaxed" />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            loading={regenerating}
            onClick={handleRegenerate}
            icon={<RefreshCw className="size-4" />}
            className="sm:w-auto"
          >
            إعادة توليد ({CREDIT_COSTS.script_generation} رصيد)
          </Button>
          <Button
            className="flex-1"
            size="lg"
            loading={saving}
            disabled={script.trim().length < 20}
            onClick={handleContinue}
            icon={<ArrowLeft className="size-4 rtl:rotate-180" />}
          >
            متابعة إلى تقسيم المشاهد
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
