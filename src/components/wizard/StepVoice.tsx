"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mic2, ArrowLeft, Volume2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { OptionCard } from "@/components/ui/OptionCard";
import { Button } from "@/components/ui/Button";
import { VOICE_OPTIONS, MUSIC_MOODS } from "@/lib/ai/types";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO } from "@/types";

const MOOD_LABELS: Record<string, string> = {
  "epic-orchestral": "أوركسترالية ملحمية",
  "synthwave-tension": "توتر إلكتروني (Synthwave)",
  "emotional-piano": "بيانو عاطفي",
  "upbeat-adventure": "مغامرة نشيطة",
  "dark-ambient": "أجواء داكنة",
};

export function StepVoice({
  project,
  onUpdated,
  onContinue,
}: {
  project: ProjectDTO;
  onUpdated: (project: ProjectDTO) => void;
  onContinue: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const voiceOptions = VOICE_OPTIONS.filter((v) => v.language === project.language);
  const [voiceId, setVoiceId] = useState(project.voiceId);
  const [musicMood, setMusicMood] = useState(project.musicMood ?? MUSIC_MOODS[0]);
  const [sfxEnabled, setSfxEnabled] = useState(project.sfxEnabled);
  const [generating, setGenerating] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, musicMood, sfxEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.code === "INSUFFICIENT_CREDITS" ? "لا يوجد رصيد كافٍ" : data.error);
        return;
      }
      onUpdated(data.project);
      refresh();
      toast.success("تم توليد التعليق الصوتي");
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setGenerating(false);
    }
  }

  async function handleContinue() {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStep: Math.max(project.currentStep, 7) }),
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
        <CardTitle>الصوت والموسيقى</CardTitle>
        <CardDescription>اختر صوت التعليق ومزاج الموسيقى، ثم ولّد المسار الصوتي.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium">صوت التعليق</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {voiceOptions.map((v) => (
              <OptionCard key={v.id} selected={voiceId === v.id} onClick={() => setVoiceId(v.id)} title={v.label} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">مزاج الموسيقى</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MUSIC_MOODS.map((mood) => (
              <OptionCard
                key={mood}
                selected={musicMood === mood}
                onClick={() => setMusicMood(mood)}
                title={MOOD_LABELS[mood] || mood}
              />
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface-2 p-4">
          <div>
            <p className="text-sm font-medium">مؤثرات صوتية (SFX)</p>
            <p className="text-xs text-muted">أصوات مساندة تُضاف تلقائيًا لتعزيز المشاهد الحركية.</p>
          </div>
          <input
            type="checkbox"
            checked={sfxEnabled}
            onChange={(e) => setSfxEnabled(e.target.checked)}
            className="size-5 accent-primary"
          />
        </label>

        <Button
          className="w-full"
          size="lg"
          loading={generating}
          onClick={handleGenerate}
          icon={<Mic2 className="size-4" />}
        >
          توليد التعليق الصوتي ({CREDIT_COSTS.voice_generation} رصيد)
        </Button>

        {project.voiceUrl && (
          <div className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Volume2 className="size-4 text-primary" />
              معاينة الصوت
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- generated placeholder audio, no dialogue track to caption */}
            <audio controls src={project.voiceUrl} className="w-full" />
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          variant="secondary"
          disabled={!project.voiceUrl}
          loading={advancing}
          onClick={handleContinue}
          icon={<ArrowLeft className="size-4 rtl:rotate-180" />}
        >
          متابعة إلى الخط الزمني
        </Button>
      </CardContent>
    </Card>
  );
}
