"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Film, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import { upload } from "@vercel/blob/client";
import { assembleVideo, canAssembleVideo } from "@/lib/video-assembler";
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
  const [phase, setPhase] = useState<string | null>(null);

  const perScene = project.scenes.length > 0 ? project.durationSeconds / project.scenes.length : 0;

  async function handleGenerateVideo() {
    setGenerating(true);
    setPhase("جارٍ التحضير…");
    try {
      // 1. Start: spend credits, mark rendering.
      const startRes = await fetch(`/api/projects/${project.id}/video`, { method: "POST" });
      const startData = await startRes.json();
      if (!startRes.ok) {
        toast.error(startData.code === "INSUFFICIENT_CREDITS" ? "لا يوجد رصيد كافٍ" : startData.error);
        return;
      }
      refresh();

      // 2. Render. Assemble the slideshow in the browser, then upload it.
      if (startData.needsClientRender && canAssembleVideo()) {
        setPhase("جارٍ تركيب الفيديو… 0%");
        const { blob, mimeType } = await assembleVideo({
          imageUrls: project.scenes
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((s) => s.imageUrl!)
            .filter(Boolean),
          audioUrl: project.voiceUrl,
          aspectRatio: project.aspectRatio,
          durationSeconds: project.durationSeconds,
          title: project.title,
          onProgress: (f) => setPhase(`جارٍ تركيب الفيديو… ${Math.round(f * 100)}%`),
        });

        setPhase("جارٍ الرفع…");
        const baseType = mimeType.split(";")[0]; // drop ";codecs=..."
        const ext = baseType.includes("mp4") ? "mp4" : "webm";
        const uploaded = await upload(`projects/${project.id}/final-${Date.now()}.${ext}`, blob, {
          access: "public",
          contentType: baseType,
          handleUploadUrl: `/api/projects/${project.id}/video/upload`,
        });

        setPhase("جارٍ الحفظ…");
        const putRes = await fetch(`/api/projects/${project.id}/video`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploaded.url }),
        });
        const putData = await putRes.json();
        if (!putRes.ok) throw new Error(putData.error || "finalize failed");
        toast.success("تم إنشاء الفيديو النهائي!");
        onCompleted(putData.project);
        return;
      }

      // 3. Browser can't record — fall back to the placeholder clip.
      setPhase("جارٍ الإنهاء…");
      const fbRes = await fetch(`/api/projects/${project.id}/video?fallback=1`, { method: "POST" });
      const fbData = await fbRes.json();
      if (!fbRes.ok) throw new Error(fbData.error || "fallback failed");
      toast.message("متصفحك لا يدعم تركيب الفيديو — تم استخدام نسخة مبسّطة.");
      onCompleted(fbData.project);
    } catch (err) {
      console.error(err);
      toast.error("تعذّر إنشاء الفيديو. حاول مرة أخرى.");
    } finally {
      setGenerating(false);
      setPhase(null);
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
        {phase && <p className="mt-2 text-center text-xs text-muted">{phase}</p>}
      </CardContent>
    </Card>
  );
}
