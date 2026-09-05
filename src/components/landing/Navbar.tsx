import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan shadow-neon">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            AnimeForge <span className="text-gradient">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-foreground">
            كيف يعمل
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            المميزات
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            الأسعار
          </a>
          <Link href="/dashboard/projects" className="transition-colors hover:text-foreground">
            استكشف المشاريع
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              تسجيل الدخول
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">إنشاء حساب</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
