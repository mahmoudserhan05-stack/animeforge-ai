"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-grid-glow px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertTriangle className="size-8" />
      </div>
      <h2 className="font-display text-xl font-bold">حدث خطأ غير متوقع</h2>
      <p className="max-w-sm text-sm text-muted">نأسف على الإزعاج، حاول تحديث الصفحة.</p>
      <Button onClick={reset}>إعادة المحاولة</Button>
    </div>
  );
}
