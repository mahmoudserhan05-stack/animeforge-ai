"use client";

import { ImageIcon, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { SceneDTO } from "@/types";

const STATUS_BADGE: Record<SceneDTO["imageStatus"], { label: string; tone: "default" | "warning" | "success" | "danger" }> = {
  PENDING: { label: "بانتظار التوليد", tone: "default" },
  GENERATING: { label: "جارٍ التوليد…", tone: "warning" },
  READY: { label: "جاهزة", tone: "success" },
  FAILED: { label: "فشل التوليد", tone: "danger" },
};

export function SceneImageCard({
  scene,
  busy,
  onGenerate,
}: {
  scene: SceneDTO;
  busy: boolean;
  onGenerate: () => void;
}) {
  const status = STATUS_BADGE[scene.imageStatus];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
      <div className="relative flex aspect-[9/16] items-center justify-center bg-black/40">
        {scene.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local static demo assets, no need for next/image optimization
          <img src={scene.imageUrl} alt={`Scene ${scene.order}`} className="absolute inset-0 size-full object-cover" />
        ) : scene.imageStatus === "GENERATING" || busy ? (
          <div className="flex flex-col items-center gap-2 text-muted">
            <RefreshCw className="size-6 animate-spin" />
            <span className="text-xs">جارٍ التوليد…</span>
          </div>
        ) : scene.imageStatus === "FAILED" ? (
          <div className="flex flex-col items-center gap-2 text-red-400">
            <AlertCircle className="size-6" />
            <span className="text-xs">فشل التوليد</span>
          </div>
        ) : (
          <ImageIcon className="size-8 text-muted/40" />
        )}
        <span className="absolute start-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-xs font-semibold text-white">
          {scene.order}
        </span>
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted">{scene.description}</p>
        <Button
          size="sm"
          variant={scene.imageUrl ? "secondary" : "primary"}
          className="w-full"
          loading={busy}
          onClick={onGenerate}
          icon={<Sparkles className="size-3.5" />}
        >
          {scene.imageUrl ? "إعادة التوليد" : "توليد الصورة"}
        </Button>
      </div>
    </div>
  );
}
