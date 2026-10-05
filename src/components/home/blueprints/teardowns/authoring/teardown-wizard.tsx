// TRANSPORT: props-only — orchestrates the 5 steps of authoring a teardown.
// Submits to the authoring API and reads/writes author drafts via React Query.
"use client";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { describeTeardownFieldPath } from "./wizard-shared";
import SubmissionReceipt from "./submission-receipt";
import {
  TeardownWizardActionFooter,
  TeardownWizardBanners,
  TeardownWizardStepNav,
} from "./teardown-wizard-nav";
import { useTeardownWizardState } from "./use-teardown-wizard-state";

/**
 * Publish a teardown: five steps, one attestation, one submit.
 */
export default function TeardownWizard() {
  const {
    draft,
    viewState,
    fieldErrorEntries,
    isLoadingPrefill,
    resumeDraftId,
    prefillError,
    resumeDraftReadError,
    resubmitNote,
    saveDraftError,
    draftMeta,
    isSavingDraft,
    submitMutation,
    submitBlockedReason,
    submitError,
    isLastStep,
    StepComponent,
    goToStep,
    applyDraftPatch,
    handleSaveDraft,
    handleSubmit,
    handleStartAnother,
  } = useTeardownWizardState();

  if (viewState.status === "submitted") {
    // What the submit actually carried, read off the draft it was collected from — the same
    // source/uploadId test `collectTeardownSubmission` uses, so the receipt and the payload agree.
    const submittedFileRows = [...draft.documents, ...draft.manufacturingFiles];
    const hasUploadedFiles = submittedFileRows.some(
      (fileRow) => fileRow.source === "uploaded" && fileRow.uploadId !== undefined,
    );
    const hasLinkedFiles = submittedFileRows.some(
      (fileRow) => !(fileRow.source === "uploaded" && fileRow.uploadId !== undefined),
    );
    return (
      <SubmissionReceipt
        receipt={viewState.receipt}
        hasUploadedFiles={hasUploadedFiles}
        hasLinkedFiles={hasLinkedFiles}
        onStartAnother={handleStartAnother}
      />
    );
  }

  return (
    <div>
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">Teardown</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Publish a teardown</h1>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
        A teardown is your own survey of a unit you obtained lawfully. Somebody with very little
        capital reads it to decide whether they can build the same thing, so what matters most is
        not how much you know but how clearly you say how you know it.
      </p>

      <TeardownWizardBanners
        isLoadingPrefill={isLoadingPrefill}
        resumeDraftId={resumeDraftId}
        prefillError={prefillError}
        resumeDraftReadError={resumeDraftReadError}
        resubmitNote={resubmitNote}
        saveDraftError={saveDraftError}
      />

      <TeardownWizardStepNav currentStepIndex={viewState.currentStepIndex} onGoToStep={goToStep} />

      <div className="mt-6">
        <StepComponent draft={draft} onDraftChange={applyDraftPatch} />
      </div>

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-6 max-w-2xl space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>This cannot be submitted yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                <span className="font-medium">{describeTeardownFieldPath(fieldPath)}</span>:{" "}
                {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitError === undefined ? null : (
        <div className="mt-6 max-w-2xl">
          <MutationErrorNotice error={submitError.apiError} />
        </div>
      )}

      <TeardownWizardActionFooter
        currentStepIndex={viewState.currentStepIndex}
        onGoToStep={goToStep}
        isLastStep={isLastStep}
        onSubmit={handleSubmit}
        isSubmitting={submitMutation.isPending}
        submitBlockedReason={submitBlockedReason}
        onSaveDraft={() => void handleSaveDraft()}
        isSavingDraft={isSavingDraft}
        draftMeta={draftMeta}
      />
    </div>
  );
}
