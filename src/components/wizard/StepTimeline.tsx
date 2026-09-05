"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Film, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO } from "@/types";

export function StepTimeline({
  project,
  onCompleted,
}: {
  project: ProjectDTO;
  onCompleted: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const [generating, setGenerating] = useState(false);

  const perScene = project.scenes.length > 0 ? project.durationSeconds / project.scenes.length : 0;

  async function handleGenerateVideo() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/video`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.code === "INSUFFICIENT_CREDITS" ? "لا يوجد رصيد كافٍ" : data.error);
        return;
      }
      refresh();
      toast.success("تم إنشاء الفيديو النهائي!");
      onCompleted(data.project);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الخط الزمني</CardTitle>
        <CardDescription>ترتيب المشاهد في الفيديو النهائي — مدة تقريبية {project.durationSeconds} ثانية.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-3">
          {project.scenes.map((scene) => (
            <div
              key={scene.id}
              className="group relative shrink-0 overflow-hidden rounded-lg"
              style={{ width: `${Math.max(perScene * 6, 56)}px` }}
            >
              <div className="relative aspect-[9/16] w-full bg-black/40">
                {scene.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={scene.imageUrl} alt={`Scene ${scene.order}`} className="absolute inset-0 size-full object-cover" />
                )}
                <span className="absolute start-1 top-1 flex size-4 items-center justify-center rounded-full bg-black/70 text-[9px] font-semibold text-white">
                  {scene.order}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] text-white/70">
                <Clock className="size-2.5" />
                {perScene.toFixed(1)}s
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>{project.scenes.length} مشاهد</span>
          <span>
            صوت: {project.voiceUrl ? "جاهز" : "غير متوفر"} · موسيقى: {project.musicMood ? "مُختارة" : "افتراضية"}
          </span>
        </div>

        <Button
          className="mt-6 w-full"
          size="lg"
          loading={generating}
          onClick={handleGenerateVideo}
          icon={<Film className="size-4" />}
        >
          إنشاء الفيديو النهائي ({CREDIT_COSTS.video_generation} رصيد)
        </Button>
      </CardContent>
    </Card>
  );
}
