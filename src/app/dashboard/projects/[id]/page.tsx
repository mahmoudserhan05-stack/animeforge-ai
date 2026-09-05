import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeProject, PROJECT_INCLUDE } from "@/lib/api-utils";
import { WizardShell } from "@/components/wizard/WizardShell";

export default async function ProjectWizardPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: PROJECT_INCLUDE,
  });

  // Never reveal whether a project exists if it isn't the current user's —
  // both "not found" and "not yours" render the same 404.
  if (!project || project.userId !== userId) {
    notFound();
  }

  return <WizardShell initialProject={serializeProject(project)} />;
}
