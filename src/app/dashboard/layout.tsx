import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CreditsProvider } from "@/components/dashboard/CreditsProvider";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <CreditsProvider>
      <DashboardShell userName={session?.user?.name ?? null}>{children}</DashboardShell>
    </CreditsProvider>
  );
}
