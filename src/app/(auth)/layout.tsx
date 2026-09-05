import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-grid-glow px-4 py-12">
      <div className="absolute -top-20 start-1/4 size-72 animate-float rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 end-1/4 size-72 animate-float rounded-full bg-accent-cyan/20 blur-3xl [animation-delay:2s]" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-cyan shadow-neon">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            AnimeForge <span className="text-gradient">AI</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
