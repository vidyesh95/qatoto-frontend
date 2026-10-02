import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { useSubmitTeardownMutation } from "@/hooks/blueprints/authoring";
import {
  useCreateDraftMutation,
  useMyDraftQuery,
  useReplaceDraftMutation,
} from "@/hooks/blueprints/drafts";
import { getMyTeardownSubmission } from "@/lib/blueprints/authoring.api";
import {
  TeardownSubmissionDraftSchema,
  describeAttestationGap,
  type TeardownSubmissionReceipt,
} from "@/lib/blueprints/authoring.schemas";
import { isYoutubeLinkFieldUsable } from "@/components/home/blueprints/authoring/youtube-link-field";
import {
  EMPTY_TEARDOWN_WIZARD_DRAFT,
  TEARDOWN_WIZARD_STEPS,
  TeardownWizardDraftSchema,
  collectTeardownSubmission,
  compareTeardownFieldPathsByStep,
  teardownSubmissionDraftToWizardDraft,
  type TeardownWizardDraft,
  type TeardownWizardStepId,
  type TeardownWizardStepProps,
} from "./wizard-shared";
import { emitAssistantSignal } from "@/lib/assistant/assistant-signals";
import { ApiRequestError } from "@/lib/http";
import SubjectProvenanceStep from "./subject-provenance-step";
import PartsStep from "./parts-step";
import MaterialsStep from "./materials-step";
import MediaFilesStep from "./media-files-step";
import ReviewAttestationStep from "./review-attestation-step";

const STEP_COMPONENTS: Record<
  TeardownWizardStepId,
  React.ComponentType<TeardownWizardStepProps>
> = {
  subject: SubjectProvenanceStep,
  parts: PartsStep,
  materials: MaterialsStep,
  media: MediaFilesStep,
  review: ReviewAttestationStep,
};

export type TeardownWizardViewState =
  | { readonly status: "editing"; readonly currentStepIndex: number }
  | { readonly status: "submitted"; readonly receipt: TeardownSubmissionReceipt };

function restoreWizardDraftFromDocument(document: string): TeardownWizardDraft | null {
  try {
    const parsedDocument: unknown = JSON.parse(document);
    const validation = TeardownWizardDraftSchema.safeParse(parsedDocument);
    return validation.success ? validation.data : null;
  } catch {
    return null;
  }
}

export function useTeardownWizardState() {
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

  const resumeDraftQuery = useMyDraftQuery(resumeDraftId);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

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
        savedAt: new Date(resumedDraftDocument.updatedAt).toLocaleTimeString("en-US", {
          timeZone: "UTC",
        }),
      });
    }
  }

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
          savedAt: new Date(receipt.updatedAt).toLocaleTimeString("en-US", {
            timeZone: "UTC",
          }),
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
          savedAt: new Date(receipt.updatedAt).toLocaleTimeString("en-US", {
            timeZone: "UTC",
          }),
        });
      }
    } catch {
      setSaveDraftError("Failed to save draft. Please check your connection and try again.");
    }
  }

  const currentStep =
    viewState.status === "editing"
      ? TEARDOWN_WIZARD_STEPS[viewState.currentStepIndex]
      : TEARDOWN_WIZARD_STEPS[0];
  const StepComponent = STEP_COMPONENTS[currentStep.id];
  const isLastStep =
    viewState.status === "editing" &&
    viewState.currentStepIndex === TEARDOWN_WIZARD_STEPS.length - 1;

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
          // A fact for the AI Assist mascot, if it is on: sent for review, not published.
          emitAssistantSignal({ kind: "submission_received", surface: "teardown" });
        },
      },
    );
  }

  function handleStartAnother(): void {
    setDraft(EMPTY_TEARDOWN_WIZARD_DRAFT);
    setFieldErrors({});
    submitMutation.reset();
    setDraftMeta(null);
    setViewState({ status: "editing", currentStepIndex: 0 });
  }

  const isSavingDraft = createDraftMutation.isPending || replaceDraftMutation.isPending;

  return {
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
  };
}
