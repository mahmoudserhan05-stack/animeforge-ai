import Link from "next/link";
import { FolderKanban, PlusCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeProjectSummary } from "@/lib/api-utils";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id as string;

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { video: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">مشاريعي</h1>
          <p className="mt-1 text-sm text-muted">{projects.length} مشروع</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button icon={<PlusCircle className="size-4" />}>مشروع جديد</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-6" />}
          title="لا توجد مشاريع بعد"
          description="كل فيديو أنمي يبدأ بفكرة بسيطة — اكتبها الآن."
          action={
            <Link href="/dashboard/projects/new">
              <Button icon={<PlusCircle className="size-4" />}>إنشاء أول فيديو</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={serializeProjectSummary(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
