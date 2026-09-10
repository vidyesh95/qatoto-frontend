// TRANSPORT: client-query — the one "use client" file that owns the flow. Calls
// `useSubmitTeardownMutation`, which is mock-backed today.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { describeAttestationGap } from "@/components/home/blueprints/teardowns/authoring/attestation-gate";
import MaterialsStep from "@/components/home/blueprints/teardowns/authoring/materials-step";
import MediaFilesStep from "@/components/home/blueprints/teardowns/authoring/media-files-step";
import PartsStep from "@/components/home/blueprints/teardowns/authoring/parts-step";
import ReviewAttestationStep from "@/components/home/blueprints/teardowns/authoring/review-attestation-step";
import SubjectProvenanceStep from "@/components/home/blueprints/teardowns/authoring/subject-provenance-step";
import SubmissionReceipt from "@/components/home/blueprints/teardowns/authoring/submission-receipt";
import {
  collectTeardownSubmission,
  EMPTY_TEARDOWN_WIZARD_DRAFT,
  isWalkthroughLinkUsable,
  TEARDOWN_WIZARD_STEPS,
  type TeardownWizardDraft,
  type TeardownWizardStepId,
  type TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import { useSubmitTeardownMutation } from "@/hooks/blueprints/authoring";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { TeardownSubmissionReceipt } from "@/lib/blueprints/authoring.schemas";
import { ApiRequestError } from "@/lib/http";

/**
 * THE WIZARD'S OWN STATE, AS A UNION.
 *
 * ⚠️ NOT `currentStepIndex` PLUS `submittedReceipt | null`. Those two fields can express "on step 3
 * AND already submitted", which is not a state this flow has — the illegal-state bag CLAUDE.md
 * Pattern 1 rules out. `new-idea-wizard-page.tsx:57` models its wizard the same way and is the
 * precedent followed here.
 */
type TeardownWizardViewState =
  | { readonly status: "editing"; readonly currentStepIndex: number }
  | { readonly status: "submitted"; readonly receipt: TeardownSubmissionReceipt };

/**
 * A `Record` over the step ids, so a sixth step is a compile error here rather than a step that
 * silently renders nothing — the same house pattern as `TEARDOWN_MEDIA_PREDICATES`.
 */
const STEP_COMPONENTS: Record<
  TeardownWizardStepId,
  (stepProps: TeardownWizardStepProps) => React.ReactElement
> = {
  subject: SubjectProvenanceStep,
  media: MediaFilesStep,
  parts: PartsStep,
  materials: MaterialsStep,
  review: ReviewAttestationStep,
};

/**
 * Publish a teardown: five steps, one attestation, one submit.
 *
 * ⚠️ MOUNTED ONCE, at `/blueprints/teardowns/new`. `todo.md` originally said "one wizard component
 * mounted twice" with the second mount in studio; that was wrong. Studio is MANAGEMENT — a list of
 * what you have submitted — and it links here rather than embedding this, which also keeps
 * `src/components/studio/**` from importing `src/components/home/**`.
 *
 * ⚠️ NOTHING IS OPTIMISTIC AND NOTHING POLLS. The write answers 202 and the verdict does not exist;
 * see `submission-receipt.tsx` for what is said instead.
 */
export default function TeardownWizard() {
  const [draft, setDraft] = useState<TeardownWizardDraft>(EMPTY_TEARDOWN_WIZARD_DRAFT);
  const [viewState, setViewState] = useState<TeardownWizardViewState>({
    status: "editing",
    currentStepIndex: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string[]>>>({});

  const submitMutation = useSubmitTeardownMutation();
  // ⚠️ THE LAZY, REF-BACKED HOOK, NOT `useState(newIdempotencyKey())`. `crypto.randomUUID()` in a
  // `useState` initializer runs during the server prerender and `cacheComponents` refuses a
  // non-deterministic value produced there — it fails the build, not a test. The key rotates only
  // after a success; a retry of a failed attempt must carry the original.
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  function applyDraftPatch(draftPatch: Partial<TeardownWizardDraft>): void {
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));

    /**
     * ⚠️ EDITING ANYTHING CLEARS THE LAST VERDICT, and both halves of that matter.
     *
     * `fieldErrors` came from a `safeParse` of a draft that no longer exists, so leaving it up means
     * a publisher fixes the named field and still sees the complaint about it — which reads as the
     * fix not having worked and sends them looking for a second problem that is not there.
     *
     * The MUTATION error goes too. A 409 said "a survey of this unit already exists"; the moment the
     * subject name is edited that is a statement about a value nobody is submitting any more.
     */
    setFieldErrors({});
    if (submitMutation.error !== null) submitMutation.reset();
  }

  if (viewState.status === "submitted") {
    return (
      <SubmissionReceipt
        receipt={viewState.receipt}
        onStartAnother={() => {
          setDraft(EMPTY_TEARDOWN_WIZARD_DRAFT);
          setFieldErrors({});
          submitMutation.reset();
          setViewState({ status: "editing", currentStepIndex: 0 });
        }}
      />
    );
  }

  const currentStep = TEARDOWN_WIZARD_STEPS[viewState.currentStepIndex];
  const StepComponent = STEP_COMPONENTS[currentStep.id];
  const isLastStep = viewState.currentStepIndex === TEARDOWN_WIZARD_STEPS.length - 1;

  const attestationGap = describeAttestationGap(draft.acceptedAttestationClauseIds);
  const isWalkthroughUsable = isWalkthroughLinkUsable(draft.walkthroughYoutubeUrl);

  /**
   * Why submit is unavailable, or `null`.
   *
   * ⚠️ ORDER MATTERS: the walkthrough check comes first because it is a field the publisher can see
   * and fix on another step, while the attestation gap is right in front of them. Naming the far
   * problem first is what stops somebody ticking four boxes and then meeting an error about a link.
   */
  const submitBlockedReason = !isWalkthroughUsable
    ? "The walkthrough link on the media step cannot be read. Fix it or clear the field."
    : attestationGap;

  const fieldErrorEntries = Object.entries(fieldErrors);
  const submitError =
    submitMutation.error instanceof ApiRequestError ? submitMutation.error : undefined;

  function goToStep(nextStepIndex: number): void {
    setViewState({ status: "editing", currentStepIndex: nextStepIndex });
  }

  function handleSubmit(): void {
    const collected = collectTeardownSubmission(draft);
    if (!collected.ok) {
      // The contract refused it. Show every path it named and stay put — jumping the publisher to
      // another step would hide the messages they need.
      setFieldErrors(collected.fieldErrors);
      return;
    }

    setFieldErrors({});
    submitMutation.mutate(
      { draft: collected.submission, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (receipt) => {
          resetIdempotencyKey();
          setViewState({ status: "submitted", receipt });
        },
      },
    );
  }

  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.5px] text-[#00696E] uppercase">Teardown</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Publish a teardown</h1>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
        A teardown is your own survey of a unit you obtained lawfully. Somebody with very little
        capital reads it to decide whether they can build the same thing, so what matters most is
        not how much you know but how clearly you say how you know it.
      </p>

      {/*
        The stepper, inline rather than a shared component — the repo has two multi-step forms and
        neither shares one. Clickable, so a publisher can go back to a step they remember getting
        wrong without pressing Back four times.
      */}
      <nav aria-label="Wizard steps" className="mt-5">
        <ol className="flex flex-wrap gap-x-1 gap-y-2">
          {TEARDOWN_WIZARD_STEPS.map((step, stepIndex) => {
            const isCurrentStep = stepIndex === viewState.currentStepIndex;

            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex)}
                  aria-current={isCurrentStep ? "step" : undefined}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${
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

      <div className="mt-6">
        <StepComponent draft={draft} onDraftChange={applyDraftPatch} />
      </div>

      {/*
        THE CONTRACT'S OWN REFUSALS, keyed by the path it named. They render at the foot of whatever
        step the publisher is on, because a message about `provenance.subjectProductName` is useless
        on a screen that does not show that field — so the path is printed with it.
      */}
      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-6 max-w-2xl space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p>This cannot be submitted yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                <span className="font-medium">{fieldPath}</span>: {messages.join(" ")}
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

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => goToStep(Math.max(0, viewState.currentStepIndex - 1))}
          disabled={viewState.currentStepIndex === 0}
          className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Back
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitBlockedReason !== null || submitMutation.isPending}
            className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit for review"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              goToStep(Math.min(TEARDOWN_WIZARD_STEPS.length - 1, viewState.currentStepIndex + 1))
            }
            className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
          >
            Next
          </button>
        )}

        {/*
          ⚠️ THE DISABLED REASON RENDERS BESIDE THE DISABLED BUTTON. A grey control with no
          explanation is the commonest way a form wastes an afternoon: somebody checks every field
          they can see and never finds the one that is wrong.
        */}
        {isLastStep && submitBlockedReason !== null ? (
          <p className="max-w-md text-xs text-muted-foreground">{submitBlockedReason}</p>
        ) : null}
      </div>
    </div>
  );
}
