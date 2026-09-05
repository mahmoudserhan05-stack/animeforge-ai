import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-cyan">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="font-display font-semibold">AnimeForge AI</span>
          </div>
          <p className="text-xs text-muted">
            كل الشخصيات والتصاميم المعروضة أصلية بالكامل، لا تحاكي أي عمل محمي بحقوق الطبع والنشر.
          </p>
          <div className="flex gap-6 text-sm text-muted">
            <Link href="/sign-in" className="hover:text-foreground">تسجيل الدخول</Link>
            <Link href="/sign-up" className="hover:text-foreground">إنشاء حساب</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted/70">
          © {new Date().getFullYear()} AnimeForge AI. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
