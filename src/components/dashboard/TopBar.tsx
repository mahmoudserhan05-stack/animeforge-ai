"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Coins, LogOut, Menu } from "lucide-react";
import { useCredits } from "./CreditsProvider";
import { formatCredits, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function TopBar({
  userName,
  onMenuClick,
}: {
  userName: string | null;
  onMenuClick?: () => void;
}) {
  const { balance, loading } = useCredits();
  const low = (balance ?? 0) <= 10;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-lg sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex size-9 items-center justify-center rounded-lg hover:bg-white/5 lg:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="size-5" />
        </button>
        <p className="hidden text-sm text-muted sm:block">
          أهلًا، <span className="font-medium text-foreground">{userName || "صانع المحتوى"}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard/credits"
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            low ? "border-amber-500/40 bg-amber-500/10 text-amber-400" : "border-border bg-surface-2 text-foreground"
          )}
        >
          <Coins className="size-4" />
          {loading ? "…" : formatCredits(balance ?? 0)}
        </Link>

        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })} icon={<LogOut className="size-4" />}>
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </div>
    </header>
  );
}
