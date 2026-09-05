"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LayoutTemplate,
  Coins,
  Settings,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "مشاريعي", icon: FolderKanban },
  { href: "/dashboard/templates", label: "القوالب", icon: LayoutTemplate },
  { href: "/dashboard/credits", label: "الرصيد", icon: Coins },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e border-border/60 bg-surface/60 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-cyan shadow-neon">
          <Sparkles className="size-4 text-white" />
        </span>
        <span className="font-display text-base font-bold">
          AnimeForge <span className="text-gradient">AI</span>
        </span>
      </div>

      <div className="p-4">
        <Link href="/dashboard/projects/new">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent-cyan px-4 py-2.5 text-sm font-medium text-white shadow-neon transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <PlusCircle className="size-4" />
            مشروع جديد
          </button>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="glass rounded-xl p-4 text-center">
          <p className="text-xs text-muted">تحتاج مساعدة؟</p>
          <p className="mt-1 text-sm font-medium">راجع دليل البدء السريع</p>
        </div>
      </div>
    </aside>
  );
}
