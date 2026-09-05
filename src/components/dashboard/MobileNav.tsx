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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "مشاريعي", icon: FolderKanban },
  { href: "/dashboard/templates", label: "القوالب", icon: LayoutTemplate },
  { href: "/dashboard/credits", label: "الرصيد", icon: Coins },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 start-0 flex w-72 flex-col border-e border-border/60 bg-surface animate-fade-in">
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-cyan">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="font-display text-base font-bold">AnimeForge AI</span>
          </div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg hover:bg-white/5">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4">
          <Link href="/dashboard/projects/new" onClick={onClose}>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent-cyan px-4 py-2.5 text-sm font-medium text-white shadow-neon">
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
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary/15 text-primary" : "text-muted hover:bg-white/5 hover:text-foreground"
                )}
              >
                <item.icon className="size-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
