"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { StepIdea } from "./StepIdea";
import { StepOptions } from "./StepOptions";
import { StepScript } from "./StepScript";
import { StepScenes } from "./StepScenes";
import { StepImages } from "./StepImages";
import { StepVoice } from "./StepVoice";
import { StepTimeline } from "./StepTimeline";
import { StepPreview } from "./StepPreview";
import type { ProjectDTO } from "@/types";

export function WizardShell({ initialProject }: { initialProject: ProjectDTO }) {
  const [project, setProject] = useState<ProjectDTO>(initialProject);
  const [uiStep, setUiStep] = useState(() => Math.min(Math.max(initialProject.currentStep, 1), 8));

  function handleAdvance(updated: ProjectDTO) {
    setProject(updated);
    setUiStep(Math.min(Math.max(updated.currentStep, 1), 8));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/projects" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          مشاريعي
        </Link>
        <h1 className="line-clamp-1 flex-1 text-end font-display text-sm font-medium text-muted sm:text-base">
          {project.title || "مشروع بدون عنوان"}
        </h1>
      </div>

      <WizardProgress currentStep={uiStep} maxUnlockedStep={project.currentStep} onStepClick={setUiStep} />

      {uiStep === 1 && <StepIdea project={project} onSaved={handleAdvance} />}
      {uiStep === 2 && <StepOptions project={project} onGenerated={handleAdvance} />}
      {uiStep === 3 && <StepScript project={project} onUpdated={setProject} onContinue={handleAdvance} />}
      {uiStep === 4 && <StepScenes project={project} onUpdated={setProject} onContinue={handleAdvance} />}
      {uiStep === 5 && <StepImages project={project} onUpdated={setProject} onContinue={handleAdvance} />}
      {uiStep === 6 && <StepVoice project={project} onUpdated={setProject} onContinue={handleAdvance} />}
      {uiStep === 7 && <StepTimeline project={project} onCompleted={handleAdvance} />}
      {uiStep === 8 && <StepPreview project={project} />}
    </div>
  );
}
