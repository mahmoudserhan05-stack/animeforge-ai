"use client";

import { useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function VideoPreviewPlayer({
  src,
  poster,
  aspectRatio,
}: {
  src: string;
  poster?: string | null;
  aspectRatio: "9:16" | "16:9" | "1:1";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const aspectClass = aspectRatio === "9:16" ? "aspect-[9/16]" : aspectRatio === "16:9" ? "aspect-video" : "aspect-square";

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function restart() {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setPlaying(true);
  }

  return (
    <div className="mx-auto w-full max-w-xs">
      <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-black shadow-neon", aspectClass)}>
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          className="size-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          playsInline
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <Button variant="secondary" size="sm" onClick={restart} icon={<RotateCcw className="size-4" />}>
          إعادة البدء
        </Button>
        <Button size="sm" onClick={togglePlay} icon={playing ? <Pause className="size-4" /> : <Play className="size-4" />}>
          {playing ? "إيقاف مؤقت" : "تشغيل"}
        </Button>
      </div>
    </div>
  );
}
