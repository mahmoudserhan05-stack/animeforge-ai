"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clapperboard, RefreshCw, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SceneEditCard } from "./SceneEditCard";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO, SceneDTO } from "@/types";

export function StepScenes({
  project,
  onUpdated,
  onContinue,
}: {
  project: ProjectDTO;
  onUpdated: (project: ProjectDTO) => void;
  onContinue: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/scenes`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.code === "INSUFFICIENT_CREDITS" ? "لا يوجد رصيد كافٍ" : data.error);
        return;
      }
      onUpdated(data.project);
      refresh();
      toast.success(`تم إنشاء ${data.project.scenes.length} مشاهد`);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setGenerating(false);
    }
  }

  function handleSceneSaved(scene: SceneDTO) {
    onUpdated({
      ...project,
      scenes: project.scenes.map((s) => (s.id === scene.id ? scene : s)),
    });
  }

  async function handleContinue() {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: Math.max(project.currentStep, 5) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر المتابعة");
        return;
      }
      onContinue(data.project);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تقسيم المشاهد</CardTitle>
        <CardDescription>يقسّم الذكاء الاصطناعي السيناريو إلى مشاهد يمكنك تعديل كل تفاصيلها.</CardDescription>
      </CardHeader>
      <CardContent>
        {project.scenes.length === 0 ? (
          <EmptyState
            icon={<Clapperboard className="size-6" />}
            title="لم يتم تقسيم المشاهد بعد"
            description="اضغط الزر أدناه ليقوم الذكاء الاصطناعي بتقسيم السيناريو إلى مشاهد."
            action={
              <Button loading={generating} onClick={handleGenerate} icon={<Clapperboard className="size-4" />}>
                إنشاء المشاهد ({CREDIT_COSTS.scene_breakdown} رصيد)
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted">{project.scenes.length} مشاهد</p>
              <Button size="sm" variant="secondary" loading={generating} onClick={handleGenerate} icon={<RefreshCw className="size-3.5" />}>
                إعادة التقسيم ({CREDIT_COSTS.scene_breakdown} رصيد)
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {project.scenes.map((scene) => (
                <SceneEditCard key={scene.id} projectId={project.id} scene={scene} onSaved={handleSceneSaved} />
              ))}
            </div>

            <Button
              className="mt-6 w-full"
              size="lg"
              loading={advancing}
              onClick={handleContinue}
              icon={<ArrowLeft className="size-4 rtl:rotate-180" />}
            >
              متابعة إلى توليد الصور
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
