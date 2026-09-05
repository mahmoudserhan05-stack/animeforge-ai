import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns the current session's user id, or null if not signed in. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

/** Returns the full current user record, or null if not signed in. */
export async function getCurrentUser() {
  const id = await getCurrentUserId();
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

/**
 * Loads a project only if it belongs to the current user — the single choke
 * point every project-scoped API route goes through, so a user can never
 * read or mutate another user's project (IDOR protection).
 */
export async function getOwnedProjectOrThrow(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    const err = new Error("Project not found");
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  return project;
}
