"use client";

import { TEARDOWN_WIZARD_STEPS } from "@/components/home/blueprints/teardowns/authoring/wizard-shared";

export function TeardownWizardStepNav({
  currentStepIndex,
  onGoToStep,
}: {
  readonly currentStepIndex: number;
  readonly onGoToStep: (stepIndex: number) => void;
}) {
  return (
    <nav aria-label="Wizard steps" className="mt-5">
      <ol className="flex flex-wrap gap-x-1 gap-y-2">
        {TEARDOWN_WIZARD_STEPS.map((step, stepIndex) => {
          const isCurrentStep = stepIndex === currentStepIndex;

          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onGoToStep(stepIndex)}
                aria-current={isCurrentStep ? "step" : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint ${
                  isCurrentStep
                    ? "bg-primary text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="tabular-nums">{stepIndex + 1}.</span> {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function TeardownWizardBanners({
  isLoadingPrefill,
  resumeDraftId,
  prefillError,
  resumeDraftReadError,
  resubmitNote,
  saveDraftError,
}: {
  readonly isLoadingPrefill: boolean;
  readonly resumeDraftId: string | null;
  readonly prefillError: string | null;
  readonly resumeDraftReadError: string | null;
  readonly resubmitNote: string | null;
  readonly saveDraftError: string | null;
}) {
  return (
    <>
      {isLoadingPrefill ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {resumeDraftId === null ? "Loading submission details…" : "Loading your saved draft…"}
        </div>
      ) : null}

      {(prefillError ?? resumeDraftReadError) ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {prefillError ?? resumeDraftReadError}
        </div>
      ) : null}

      {resubmitNote ? (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning-container p-4 text-warning-container-foreground">
          <p className="text-xs font-semibold tracking-wide text-warning-container-foreground uppercase">
            Revising rejected submission
          </p>
          <p className="mt-1 text-sm">{resubmitNote}</p>
        </div>
      ) : null}

      {saveDraftError ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {saveDraftError}
        </div>
      ) : null}
    </>
  );
}

export function TeardownWizardActionFooter({
  currentStepIndex,
  onGoToStep,
  isLastStep,
  onSubmit,
  isSubmitting,
  submitBlockedReason,
  onSaveDraft,
  isSavingDraft,
  draftMeta,
}: {
  readonly currentStepIndex: number;
  readonly onGoToStep: (stepIndex: number) => void;
  readonly isLastStep: boolean;
  readonly onSubmit: () => void;
  readonly isSubmitting: boolean;
  readonly submitBlockedReason: string | null;
  readonly onSaveDraft: () => void;
  readonly isSavingDraft: boolean;
  readonly draftMeta: { readonly savedAt: string } | null;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onGoToStep(Math.max(0, currentStepIndex - 1))}
          disabled={currentStepIndex === 0}
          className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitBlockedReason !== null || isSubmitting}
            className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Submitting…" : "Submit for review"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              onGoToStep(Math.min(TEARDOWN_WIZARD_STEPS.length - 1, currentStepIndex + 1))
            }
            className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
          >
            Next
          </button>
        )}

        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isSavingDraft}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSavingDraft ? "Saving…" : "Save draft"}
        </button>

        {draftMeta ? (
          <span className="text-xs text-muted-foreground">Draft saved at {draftMeta.savedAt}</span>
        ) : null}
      </div>

      {isLastStep && submitBlockedReason !== null ? (
        <p className="max-w-md text-xs text-muted-foreground">{submitBlockedReason}</p>
      ) : null}
    </div>
  );
}
