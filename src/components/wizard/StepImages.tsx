"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SceneImageCard } from "./SceneImageCard";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO, SceneDTO } from "@/types";

export function StepImages({
  project,
  onUpdated,
  onContinue,
}: {
  project: ProjectDTO;
  onUpdated: (project: ProjectDTO) => void;
  onContinue: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const [busySceneId, setBusySceneId] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const allReady = project.scenes.length > 0 && project.scenes.every((s) => s.imageStatus === "READY");
  const readyCount = project.scenes.filter((s) => s.imageStatus === "READY").length;

  function patchScene(scene: SceneDTO) {
    onUpdated({
      ...project,
      scenes: project.scenes.map((s) => (s.id === scene.id ? scene : s)),
    });
  }

  async function generateOne(scene: SceneDTO) {
    setBusySceneId(scene.id);
    try {
      const res = await fetch(`/api/projects/${project.id}/scenes/${scene.id}/image`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") toast.error("لا يوجد رصيد كافٍ لتوليد الصورة");
        else toast.error(data.error || "تعذر توليد الصورة");
        return false;
      }
      patchScene(data.scene);
      refresh();
      return true;
    } catch {
      toast.error("حدث خطأ غير متوقع");
      return false;
    } finally {
      setBusySceneId(null);
    }
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    for (const scene of project.scenes) {
      if (scene.imageStatus === "READY") continue;
      const ok = await generateOne(scene);
      if (!ok) break;
    }
    setGeneratingAll(false);
  }

  async function handleContinue() {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: Math.max(project.currentStep, 6) }),
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
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle>توليد الصور</CardTitle>
            <CardDescription>
              {readyCount}/{project.scenes.length} صورة جاهزة — بأسلوب أنمي أصلي بالكامل.
            </CardDescription>
          </div>
          <Button
            size="sm"
            loading={generatingAll}
            onClick={handleGenerateAll}
            icon={<Sparkles className="size-3.5" />}
          >
            توليد كل الصور ({CREDIT_COSTS.image_generation} رصيد / مشهد)
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan transition-all"
            style={{ width: `${(readyCount / Math.max(project.scenes.length, 1)) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {project.scenes.map((scene) => (
            <SceneImageCard
              key={scene.id}
              scene={scene}
              busy={busySceneId === scene.id}
              onGenerate={() => generateOne(scene)}
            />
          ))}
        </div>

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={!allReady}
          loading={advancing}
          onClick={handleContinue}
          icon={<ArrowLeft className="size-4 rtl:rotate-180" />}
        >
          {allReady ? "متابعة إلى الصوت والموسيقى" : "أكمل توليد كل الصور للمتابعة"}
        </Button>
      </CardContent>
    </Card>
  );
}
