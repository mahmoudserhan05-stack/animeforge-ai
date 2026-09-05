import Link from "next/link";
import { FolderKanban, Film, Coins, PlusCircle } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreditBalance } from "@/lib/credits";
import { serializeProjectSummary } from "@/lib/api-utils";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatCredits } from "@/lib/utils";

export default async function DashboardOverviewPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id as string;

  const [totalProjects, videosGenerated, creditsRemaining, recentProjects] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.video.count({ where: { project: { userId } } }),
    getCreditBalance(userId),
    prisma.project.findMany({
      where: { userId },
      include: { video: true },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">نظرة عامة</h1>
          <p className="mt-1 text-sm text-muted">تابع مشاريعك ورصيدك من مكان واحد.</p>
        </div>
        <Link href="/dashboard/projects/new">
          <Button icon={<PlusCircle className="size-4" />}>إنشاء فيديو جديد</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<FolderKanban className="size-5" />} label="إجمالي المشاريع" value={totalProjects} accent="primary" />
        <StatCard icon={<Film className="size-5" />} label="الفيديوهات المنشأة" value={videosGenerated} accent="cyan" />
        <StatCard icon={<Coins className="size-5" />} label="الرصيد المتبقي" value={formatCredits(creditsRemaining)} accent="pink" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">أحدث المشاريع</h2>
          <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">
            عرض الكل
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-6" />}
            title="لا توجد مشاريع بعد"
            description="ابدأ أول فيديو أنمي لك بكتابة فكرة بسيطة، والباقي على AnimeForge AI."
            action={
              <Link href="/dashboard/projects/new">
                <Button icon={<PlusCircle className="size-4" />}>إنشاء أول فيديو</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((p) => (
              <ProjectCard key={p.id} project={serializeProjectSummary(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
