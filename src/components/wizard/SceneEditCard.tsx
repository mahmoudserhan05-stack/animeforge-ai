"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Check } from "lucide-react";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { SceneDTO } from "@/types";

export function SceneEditCard({
  projectId,
  scene,
  onSaved,
}: {
  projectId: string;
  scene: SceneDTO;
  onSaved: (scene: SceneDTO) => void;
}) {
  const [description, setDescription] = useState(scene.description);
  const [character, setCharacter] = useState(scene.character ?? "");
  const [location, setLocation] = useState(scene.location ?? "");
  const [dialogue, setDialogue] = useState(scene.dialogue ?? "");
  const [imagePrompt, setImagePrompt] = useState(scene.imagePrompt);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, character, location, dialogue, imagePrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تعذر حفظ المشهد");
        return;
      }
      onSaved(data.scene);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1800);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {scene.order}
        </span>
        <Button
          size="sm"
          variant={justSaved ? "secondary" : "outline"}
          loading={saving}
          onClick={handleSave}
          icon={justSaved ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
        >
          {justSaved ? "تم الحفظ" : "حفظ"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>الشخصية</Label>
          <Input value={character} onChange={(e) => setCharacter(e.target.value)} />
        </div>
        <div>
          <Label>المكان</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
      </div>

      <div className="mt-3">
        <Label>وصف المشهد</Label>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="mt-3">
        <Label>الحوار (اختياري)</Label>
        <Input value={dialogue} onChange={(e) => setDialogue(e.target.value)} placeholder="بدون حوار" />
      </div>

      <div className="mt-3">
        <Label>وصف بصري للصورة (Image Prompt)</Label>
        <Textarea rows={2} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} className="text-xs" />
      </div>
    </div>
  );
}
