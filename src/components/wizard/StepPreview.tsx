"use client";

import Link from "next/link";
import { Download, ExternalLink, Sparkles, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VideoPreviewPlayer } from "./VideoPreviewPlayer";
import type { ProjectDTO } from "@/types";

export function StepPreview({ project }: { project: ProjectDTO }) {
  if (!project.video) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted">لم يتم إنشاء الفيديو بعد.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PartyPopper className="size-5 text-primary" />
          <CardTitle>الفيديو جاهز!</CardTitle>
        </div>
        <CardDescription>{project.title || "فيديو أنمي بدون عنوان"} — {project.durationSeconds} ثانية · {project.aspectRatio}</CardDescription>
      </CardHeader>
      <CardContent>
        <VideoPreviewPlayer src={project.video.url} poster={project.video.thumbnailUrl} aspectRatio={project.aspectRatio} />

        <div className="mx-auto mt-8 grid max-w-xs gap-3 sm:max-w-none sm:grid-cols-3">
          <a href={project.video.url} download={`${project.title || "animeforge-video"}.mp4`}>
            <Button variant="secondary" className="w-full" icon={<Download className="size-4" />}>
              تنزيل
            </Button>
          </a>
          <a href={project.video.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="w-full" icon={<ExternalLink className="size-4" />}>
              تصدير / مشاركة
            </Button>
          </a>
          <Link href="/dashboard/projects/new">
            <Button className="w-full" icon={<Sparkles className="size-4" />}>
              إنشاء مرة أخرى
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          هذا فيديو تجريبي (Demo Mode) — أضف مفاتيح AI الحقيقية في .env لتوليد فيديو فعلي من صورك ومشاهدك.
        </p>
      </CardContent>
    </Card>
  );
}
