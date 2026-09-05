"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "الفكرة",
  "الخيارات",
  "السيناريو",
  "المشاهد",
  "الصور",
  "الصوت",
  "الخط الزمني",
  "المعاينة",
];

export function WizardProgress({
  currentStep,
  maxUnlockedStep,
  onStepClick,
}: {
  currentStep: number;
  maxUnlockedStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        const unlocked = step <= maxUnlockedStep;

        return (
          <button
            key={label}
            disabled={!unlocked}
            onClick={() => unlocked && onStepClick(step)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm",
              active
                ? "border-primary bg-primary/15 text-primary"
                : done
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : unlocked
                ? "border-border bg-surface-2 text-muted hover:text-foreground"
                : "cursor-not-allowed border-border/50 bg-surface-2/50 text-muted/40"
            )}
          >
            <span
              className={cn(
                "flex size-[18px] items-center justify-center rounded-full text-[10px]",
                done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white" : "bg-white/10"
              )}
            >
              {done ? <Check className="size-3" /> : step}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
