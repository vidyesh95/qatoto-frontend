"use client";

import type { ReactNode } from "react";
import { ComposerStepRail } from "@/components/commerce/composer/composer-fields";

export interface ComposerStepItem {
  readonly id: string;
  readonly label: string;
}

export interface ComposerWizardShellProps {
  readonly title: string;
  readonly description: string;
  readonly steps: readonly ComposerStepItem[];
  readonly currentStepIndex: number;
  readonly onStepSelect: (stepIndex: number) => void;
  readonly onPreviousStep: () => void;
  readonly onNextStep: () => void;
  readonly isLastStep: boolean;
  readonly submitButton?: ReactNode;
  readonly children: ReactNode;
}

export function ComposerWizardShell({
  title,
  description,
  steps,
  currentStepIndex,
  onStepSelect,
  onPreviousStep,
  onNextStep,
  isLastStep,
  submitButton,
  children,
}: ComposerWizardShellProps) {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-medium text-foreground lg:text-2xl">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </header>

      <ComposerStepRail
        steps={steps}
        currentStepIndex={currentStepIndex}
        onStepSelect={onStepSelect}
      />

      <section aria-label={steps[currentStepIndex]?.label ?? "Step"}>{children}</section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {currentStepIndex > 0 && (
          <button
            type="button"
            onClick={onPreviousStep}
            className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            Back
          </button>
        )}
        {!isLastStep && (
          <button
            type="button"
            onClick={onNextStep}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Next
          </button>
        )}
        {isLastStep && submitButton}
      </footer>
    </div>
  );
}
