"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function OptionCard({
  selected,
  onClick,
  title,
  description,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-xl border p-4 text-start transition-all duration-150",
        selected
          ? "border-primary bg-primary/10 shadow-neon"
          : "border-border bg-surface-2 hover:border-primary/50 hover:bg-white/5",
        className
      )}
    >
      {selected && (
        <span className="absolute end-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-white">
          <Check className="size-3.5" />
        </span>
      )}
      <div className="font-medium text-foreground">{title}</div>
      {description && <div className="mt-1 text-xs text-muted">{description}</div>}
    </button>
  );
}
