"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { OptionCard } from "@/components/ui/OptionCard";
import { Button } from "@/components/ui/Button";
import { ANIME_STYLES, VOICE_OPTIONS } from "@/lib/ai/types";
import { useCredits } from "@/components/dashboard/CreditsProvider";
import { CREDIT_COSTS } from "@/lib/credit-costs";
import type { ProjectDTO } from "@/types";

const DURATIONS: { value: 15 | 30 | 60; label: string }[] = [
  { value: 15, label: "15 ثانية" },
  { value: 30, label: "30 ثانية" },
  { value: 60, label: "60 ثانية" },
];

const RATIOS: { value: "9:16" | "16:9" | "1:1"; label: string }[] = [
  { value: "9:16", label: "9:16 — TikTok / Reels / Shorts" },
  { value: "16:9", label: "16:9 — YouTube" },
  { value: "1:1", label: "1:1 — منشور مربع" },
];

const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

export function StepOptions({
  project,
  onGenerated,
}: {
  project: ProjectDTO;
  onGenerated: (project: ProjectDTO) => void;
}) {
  const { refresh } = useCredits();
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 60>(
    project.durationSeconds as 15 | 30 | 60
  );
  const [aspectRatio, setAspectRatio] = useState(project.aspectRatio);
  const [animeStyle, setAnimeStyle] = useState(project.animeStyle);
  const [language, setLanguage] = useState(project.language);
  const [voiceId, setVoiceId] = useState(project.voiceId);
  const [loading, setLoading] = useState(false);

  const voiceOptions = VOICE_OPTIONS.filter((v) => v.language === language);

  async function handleGenerateScript() {
    setLoading(true);
    try {
      const optionsRes = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationSeconds,
          aspectRatio,
          animeStyle,
          language,
          voiceId: voiceOptions.some((v) => v.id === voiceId) ? voiceId : voiceOptions[0]?.id ?? voiceId,
        }),
      });
      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        toast.error(data.error || "تعذر حفظ الخيارات");
        return;
      }

      const scriptRes = await fetch(`/api/projects/${project.id}/script`, { method: "POST" });
      const data = await scriptRes.json();
      if (!scriptRes.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          toast.error("لا يوجد رصيد كافٍ لإنشاء السيناريو");
        } else {
          toast.error(data.error || "تعذر إنشاء السيناريو");
        }
        return;
      }

      refresh();
      onGenerated(data.project);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>خيارات الفيديو</CardTitle>
        <CardDescription>اختر المدة والمقاس والأسلوب — يمكنك تغييرها لاحقًا.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="mb-2 text-sm font-medium">مدة الفيديو</p>
          <div className="grid grid-cols-3 gap-2">
            {DURATIONS.map((d) => (
              <OptionCard
                key={d.value}
                selected={durationSeconds === d.value}
                onClick={() => setDurationSeconds(d.value)}
                title={d.label}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">أبعاد الفيديو</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {RATIOS.map((r) => (
              <OptionCard
                key={r.value}
                selected={aspectRatio === r.value}
                onClick={() => setAspectRatio(r.value)}
                title={r.value}
                description={r.label}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">أسلوب الأنمي</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ANIME_STYLES.map((s) => (
              <OptionCard key={s.id} selected={animeStyle === s.id} onClick={() => setAnimeStyle(s.id)} title={s.label} />
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">اللغة</p>
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <OptionCard key={l.value} selected={language === l.value} onClick={() => setLanguage(l.value)} title={l.label} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">الصوت</p>
            <div className="space-y-2">
              {voiceOptions.map((v) => (
                <OptionCard key={v.id} selected={voiceId === v.id} onClick={() => setVoiceId(v.id)} title={v.label} />
              ))}
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          loading={loading}
          onClick={handleGenerateScript}
          icon={<Wand2 className="size-4" />}
        >
          إنشاء السيناريو ({CREDIT_COSTS.script_generation} رصيد)
        </Button>
      </CardContent>
    </Card>
  );
}
