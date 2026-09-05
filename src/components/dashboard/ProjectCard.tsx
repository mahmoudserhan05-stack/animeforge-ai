import Link from "next/link";
import { Clapperboard, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { ProjectSummaryDTO } from "@/types";

const STATUS_LABELS: Record<ProjectSummaryDTO["status"], { label: string; tone: "default" | "success" | "warning" | "info" | "danger" }> = {
  DRAFT: { label: "مسودة", tone: "default" },
  SCRIPT_READY: { label: "السيناريو جاهز", tone: "info" },
  SCENES_READY: { label: "المشاهد جاهزة", tone: "info" },
  RENDERING: { label: "قيد الإنشاء", tone: "warning" },
  COMPLETED: { label: "مكتمل", tone: "success" },
  FAILED: { label: "فشلت العملية", tone: "danger" },
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

export function ProjectCard({ project }: { project: ProjectSummaryDTO }) {
  const status = STATUS_LABELS[project.status];

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group block overflow-hidden rounded-xl2 border border-border bg-surface/60 transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-neon"
    >
      <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-primary/10 via-transparent to-accent-cyan/10">
        {project.hasVideo ? (
          <PlayCircle className="size-10 text-primary transition-transform group-hover:scale-110" />
        ) : (
          <Clapperboard className="size-10 text-muted/50 transition-transform group-hover:scale-110" />
        )}
        <span className="absolute end-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white">
          {project.aspectRatio}
        </span>
      </div>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-xs text-muted">{timeAgo(project.updatedAt)}</span>
        </div>
        <h3 className="line-clamp-1 font-display font-semibold">{project.title || "بدون عنوان"}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{project.idea}</p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent-cyan transition-all"
            style={{ width: `${(project.currentStep / 8) * 100}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
