// TRANSPORT: client-query — the one "use client" file that owns the flow. Calls
// `useSubmitTeardownMutation`, server-side draft store, and resubmit loader.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { describeAttestationGap } from "@/components/home/blueprints/teardowns/authoring/attestation-gate";
import MaterialsStep from "@/components/home/blueprints/teardowns/authoring/materials-step";
import MediaFilesStep from "@/components/home/blueprints/teardowns/authoring/media-files-step";
import PartsStep from "@/components/home/blueprints/teardowns/authoring/parts-step";
import ReviewAttestationStep from "@/components/home/blueprints/teardowns/authoring/review-attestation-step";
import SubjectProvenanceStep from "@/components/home/blueprints/teardowns/authoring/subject-provenance-step";
import SubmissionReceipt from "@/components/home/blueprints/teardowns/authoring/submission-receipt";
import { isYoutubeLinkFieldUsable } from "@/components/home/blueprints/authoring/youtube-link-field";
import {
  collectTeardownSubmission,
  compareTeardownFieldPathsByStep,
  describeTeardownFieldPath,
  EMPTY_TEARDOWN_WIZARD_DRAFT,
  teardownSubmissionDraftToWizardDraft,
  TeardownWizardDraftSchema,
  TEARDOWN_WIZARD_STEPS,
  type TeardownWizardDraft,
  type TeardownWizardStepId,
  type TeardownWizardStepProps,
} from "@/components/home/blueprints/teardowns/authoring/wizard-shared";
import { useSubmitTeardownMutation } from "@/hooks/blueprints/authoring";
import {
  useCreateDraftMutation,
  useMyDraftQuery,
  useReplaceDraftMutation,
} from "@/hooks/blueprints/drafts";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { getMyTeardownSubmission } from "@/lib/blueprints/authoring.api";
import {
  TeardownSubmissionDraftSchema,
  type TeardownSubmissionReceipt,
} from "@/lib/blueprints/authoring.schemas";
import { ApiRequestError } from "@/lib/http";

/**
 * THE WIZARD'S OWN STATE, AS A UNION.
 *
 * ⚠️ NOT `currentStepIndex` PLUS `submittedReceipt | null`. Those two fields can express "on step 3
 * AND already submitted", which is not a state this flow has — the illegal-state bag CLAUDE.md
 * Pattern 1 rules out.
 */
type TeardownWizardViewState =
  | { readonly status: "editing"; readonly currentStepIndex: number }
  | { readonly status: "submitted"; readonly receipt: TeardownSubmissionReceipt };

/**
 * A `Record` over the step ids, so a sixth step is a compile error here rather than a step that
 * silently renders nothing.
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
 * Parses a stored draft document into wizard state, or `null` if it cannot be trusted.
 *
 * PURE AND OUTSIDE THE COMPONENT so it can be called during render. It swallows both failure modes
 * — malformed JSON and a document that no longer matches the wizard's shape — into one `null`,
 * because they are the same thing to the author: this draft cannot be reopened.
 */
function restoreWizardDraftFromDocument(document: string): TeardownWizardDraft | null {
  try {
    const parsedDocument: unknown = JSON.parse(document);
    const validation = TeardownWizardDraftSchema.safeParse(parsedDocument);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

/**
 * Publish a teardown: five steps, one attestation, one submit.
 */
export default function TeardownWizard() {
  const searchParams = useSearchParams();
  const resubmitSubmissionId = searchParams.get("resubmitSubmissionId");
  const resumeDraftId = searchParams.get("draftId");

  const [draft, setDraft] = useState<TeardownWizardDraft>(EMPTY_TEARDOWN_WIZARD_DRAFT);
  const [viewState, setViewState] = useState<TeardownWizardViewState>({
    status: "editing",
    currentStepIndex: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string[]>>>({});

  const [isLoadingResubmitPrefill, setIsLoadingResubmitPrefill] = useState<boolean>(() =>
    Boolean(resubmitSubmissionId),
  );
  const [prefillError, setPrefillError] = useState<string | null>(null);
  const [resubmitNote, setResubmitNote] = useState<string | null>(null);

  const [draftMeta, setDraftMeta] = useState<{
    readonly draftId: string;
    readonly revision: number;
    readonly savedAt: string;
  } | null>(null);
  const [saveDraftError, setSaveDraftError] = useState<string | null>(null);

  const submitMutation = useSubmitTeardownMutation();
  const createDraftMutation = useCreateDraftMutation();
  const replaceDraftMutation = useReplaceDraftMutation(draftMeta?.draftId ?? "");

  /**
   * THE RESUME READ, THROUGH THE HOOK RATHER THAN THE API MODULE.
   *
   * This called `getMyDraft` directly inside the effect below, which worked and meant
   * `useMyDraftQuery` — written for exactly this — had no caller in the app. Two implementations
   * of one read is how they drift.
   *
   * ⚠️ ITS `isPending` IS MEANINGLESS WHEN THERE IS NO DRAFT TO LOAD. A disabled React Query sits
   * pending forever, so `isLoadingPrefill` below checks `resumeDraftId` FIRST. Reading the flag on
   * its own would spin the wizard permanently for everybody starting a teardown from scratch.
   */
  const resumeDraftQuery = useMyDraftQuery(resumeDraftId);

  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  // THE RESUBMIT PREFILL, still imperative: it reads a SUBMISSION, not a draft, and there is no
  // hook for that read. Its document is parsed against the SUBMIT schema — a rejected submission
  // was complete enough to send — where a draft is parsed against the loose wizard shape below.
  useEffect(() => {
    let isCancelled = false;

    async function loadResubmitPrefill(): Promise<void> {
      if (!resubmitSubmissionId) return;
      const result = await getMyTeardownSubmission(resubmitSubmissionId);
      if (isCancelled) return;
      setIsLoadingResubmitPrefill(false);
      if (!result.success) {
        setPrefillError("Could not load the rejected submission. Please try again.");
        return;
      }
      try {
        const parsedDoc: unknown = JSON.parse(result.data.document);
        const validation = TeardownSubmissionDraftSchema.safeParse(parsedDoc);
        if (validation.success) {
          setDraft(teardownSubmissionDraftToWizardDraft(validation.data));
          if (result.data.moderatorNote) {
            setResubmitNote(result.data.moderatorNote);
          }
        } else {
          setPrefillError("The submission document could not be restored.");
        }
      } catch {
        setPrefillError("Failed to parse the stored submission document.");
      }
    }

    void loadResubmitPrefill();

    return () => {
      isCancelled = true;
    };
  }, [resubmitSubmissionId]);

  /**
   * Seeds the form from the resumed draft — DURING RENDER, EXACTLY ONCE PER DRAFT.
   *
   * ⚠️ NOT AN EFFECT, AND NOT BECAUSE OF THE LINT RULE. `react(set-state-in-effect)` is what flags
   * it, and `teardown-explorer.tsx` records the reasoning the rule is standing in for: a `setState`
   * inside an effect is a second render chasing the first. React sanctions adjusting state during
   * render for exactly this case — data arrived, the form it initialises must now hold it — and
   * discards the in-flight render rather than committing an empty form and then replacing it.
   *
   * ⚠️ THE GUARD IS STATE, NOT A REF, AND IT PREVENTS A DATA-LOSS BUG rather than a re-render.
   * A ref cannot be read during render (`react(refs)`), and React's own "adjusting state when data
   * changes" idiom uses state for the remembered value for that reason. Saving calls `setQueryData` to
   * write the new revision into this very cache entry, handing the next render a new object.
   * Reseeding on that would re-apply the document AS IT WAS WHEN LOADED, silently discarding
   * everything typed since — on every save, the one moment an author is most sure their work is
   * safe. Only a change of draft identity may reseed.
   */
  const resumedDraftDocument = resumeDraftQuery.data;
  const [seededDraftId, setSeededDraftId] = useState<string | null>(null);
  if (resumedDraftDocument !== undefined && seededDraftId !== resumedDraftDocument.draftId) {
    setSeededDraftId(resumedDraftDocument.draftId);
    const restored = restoreWizardDraftFromDocument(resumedDraftDocument.document);
    if (restored === null) {
      setPrefillError(
        "The saved draft could not be restored. It may have been saved by an older version.",
      );
    } else {
      setDraft(restored);
      setDraftMeta({
        draftId: resumedDraftDocument.draftId,
        revision: resumedDraftDocument.revision,
        savedAt: new Date(resumedDraftDocument.updatedAt).toLocaleTimeString(),
      });
    }
  }

  /**
   * ⚠️ `resumeDraftId` IS CHECKED BEFORE THE QUERY'S OWN FLAG, and the order is load-bearing.
   * `useMyDraftQuery(null)` is disabled, and a disabled query reports `isPending` forever — so
   * reading it first would leave the wizard on its loading screen for every author starting fresh.
   */
  const isLoadingPrefill =
    resubmitSubmissionId !== null
      ? isLoadingResubmitPrefill
      : resumeDraftId !== null && resumeDraftQuery.isPending;

  const resumeDraftReadError =
    resumeDraftId !== null && resumeDraftQuery.isError
      ? "Could not load the saved draft. Please try again."
      : null;

  function applyDraftPatch(draftPatch: Partial<TeardownWizardDraft>): void {
    if (submitMutation.isPending) return;

    resetIdempotencyKey();
    setDraft((previousDraft) => ({ ...previousDraft, ...draftPatch }));
    setFieldErrors({});
    if (submitMutation.error !== null) submitMutation.reset();
  }

  async function handleSaveDraft(): Promise<void> {
    setSaveDraftError(null);
    const docString = JSON.stringify(draft);
    const label = draft.title.trim() || draft.subjectProductName.trim() || "Untitled teardown";
    try {
      if (draftMeta) {
        const receipt = await replaceDraftMutation.mutateAsync({
          label,
          document: docString,
          documentSchemaVersion: 1,
          revision: draftMeta.revision,
        });
        setDraftMeta({
          draftId: receipt.draftId,
          revision: receipt.revision,
          savedAt: new Date(receipt.updatedAt).toLocaleTimeString(),
        });
      } else {
        const receipt = await createDraftMutation.mutateAsync({
          arm: "teardown",
          label,
          document: docString,
          documentSchemaVersion: 1,
        });
        setDraftMeta({
          draftId: receipt.draftId,
          revision: receipt.revision,
          savedAt: new Date(receipt.updatedAt).toLocaleTimeString(),
        });
      }
    } catch {
      setSaveDraftError("Failed to save draft. Please check your connection and try again.");
    }
  }

  if (viewState.status === "submitted") {
    return (
      <SubmissionReceipt
        receipt={viewState.receipt}
        onStartAnother={() => {
          setDraft(EMPTY_TEARDOWN_WIZARD_DRAFT);
          setFieldErrors({});
          submitMutation.reset();
          setDraftMeta(null);
          setViewState({ status: "editing", currentStepIndex: 0 });
        }}
      />
    );
  }

  const currentStep = TEARDOWN_WIZARD_STEPS[viewState.currentStepIndex];
  const StepComponent = STEP_COMPONENTS[currentStep.id];
  const isLastStep = viewState.currentStepIndex === TEARDOWN_WIZARD_STEPS.length - 1;

  const attestationGap = describeAttestationGap(draft.acceptedAttestationClauseIds);
  const isWalkthroughUsable = isYoutubeLinkFieldUsable(draft.walkthroughYoutubeUrl);

  const submitBlockedReason = !isWalkthroughUsable
    ? "The walkthrough link on the media step cannot be read. Fix it or clear the field."
    : attestationGap;

  const fieldErrorEntries = Object.entries(fieldErrors).toSorted(
    ([firstFieldPath], [secondFieldPath]) =>
      compareTeardownFieldPathsByStep(firstFieldPath, secondFieldPath),
  );
  const submitError =
    submitMutation.error instanceof ApiRequestError ? submitMutation.error : undefined;

  function goToStep(nextStepIndex: number): void {
    setViewState({ status: "editing", currentStepIndex: nextStepIndex });
  }

  function handleSubmit(): void {
    const collected = collectTeardownSubmission(draft);
    if (!collected.ok) {
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

  const isSavingDraft = createDraftMutation.isPending || replaceDraftMutation.isPending;

  return (
    <div>
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">Teardown</p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Publish a teardown</h1>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">
        A teardown is your own survey of a unit you obtained lawfully. Somebody with very little
        capital reads it to decide whether they can build the same thing, so what matters most is
        not how much you know but how clearly you say how you know it.
      </p>

      {isLoadingPrefill ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          {resumeDraftId === null ? "Loading submission details…" : "Loading your saved draft…"}
        </div>
      ) : null}

      {/* ONE BANNER FOR BOTH PREFILL SOURCES. `prefillError` is set by the resubmit loader and by a
          draft that parsed badly; `resumeDraftReadError` comes from the query failing outright.
          Two banners for "we could not fill this in for you" would be one too many. */}
      {(prefillError ?? resumeDraftReadError) ? (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {prefillError ?? resumeDraftReadError}
        </div>
      ) : null}

      {resubmitNote ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
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

      <div className="mt-6">
        <StepComponent draft={draft} onDraftChange={applyDraftPatch} />
      </div>

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-6 max-w-2xl space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => goToStep(Math.max(0, viewState.currentStepIndex - 1))}
            disabled={viewState.currentStepIndex === 0}
            className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitBlockedReason !== null || submitMutation.isPending}
              className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitMutation.isPending ? "Submitting…" : "Submit for review"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                goToStep(Math.min(TEARDOWN_WIZARD_STEPS.length - 1, viewState.currentStepIndex + 1))
              }
              className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
            >
              Next
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={isSavingDraft}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSavingDraft ? "Saving…" : "Save draft"}
          </button>

          {draftMeta ? (
            <span className="text-xs text-muted-foreground">
              Draft saved at {draftMeta.savedAt}
            </span>
          ) : null}
        </div>

        {isLastStep && submitBlockedReason !== null ? (
          <p className="max-w-md text-xs text-muted-foreground">{submitBlockedReason}</p>
        ) : null}
      </div>
    </div>
  );
}
