// TRANSPORT: client-query — the one "use client" file that owns the case-study flow. Calls
// `useSubmitCaseStudyMutation`, which posts to `POST /blueprints/case-studies` through
// `case-study-authoring.api`. It was mock-backed when this was written; it has not been for a while.
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import DraftAutosaveStatus from "@/components/home/blueprints/shared/draft-autosave-status";
import CaseStudyReceipt from "@/components/home/blueprints/case-studies/authoring/case-study-receipt";
import {
  CaseStudyLessonAndRelationshipFields,
  CaseStudyStoryAndActionsFields,
  CaseStudyEvidenceAndNumbersFields,
  CaseStudyRelatedLessonsAndStatementsFields,
} from "@/components/home/blueprints/case-studies/authoring/case-study-composer-sections";
import {
  buildLessonRowPreview,
  collectCaseStudySubmission,
  describeCaseStudyFieldPath,
  EMPTY_CASE_STUDY_FORM_DRAFT,
  findCaseStudyFieldPosition,
  restoreCaseStudyFormDraft,
  type CaseStudyFormDraft,
} from "@/components/home/blueprints/case-studies/authoring/case-study-shared";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useSubmitCaseStudyMutation } from "@/hooks/blueprints/case-study-authoring";
import { useMyDraftQuery } from "@/hooks/blueprints/drafts";
import { useBlueprintDraftAutosave } from "@/hooks/blueprints/use-draft-autosave";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { CaseStudyOption } from "@/lib/blueprints/schemas";
import {
  describeCaseStudyStatementGap,
  type CaseStudySubmissionReceipt,
} from "@/lib/blueprints/case-study-authoring.schemas";
import { ApiRequestError } from "@/lib/http";

/** Editing, or sent with a receipt. Never both, which a flag beside a nullable receipt could express. */
type CaseStudyViewState =
  | { readonly status: "editing" }
  | { readonly status: "submitted"; readonly receipt: CaseStudySubmissionReceipt };

/**
 * Write a case study: one page, in the order the published record reads.
 *
 * ⚠️ THE SECTIONS FOLLOW THE DETAIL PAGE'S FIXED ORDER, so a writer fills in the record a reader will
 * see, top to bottom, rather than a second arrangement of the same fields.
 *
 * ⚠️ HOW THE WRITER KNOWS THIS COMES SECOND, right after the lesson, because the answer changes the
 * sources rule and the statements further down. Changing it clears the ticks: a statement ticked for
 * one answer is a claim about something else under the other.
 *
 * ⚠️ NOTHING IS OPTIMISTIC AND NOTHING POLLS, for the launch composer's reasons.
 */
export default function CaseStudyComposer({
  caseStudyOptions,
}: {
  readonly caseStudyOptions: readonly CaseStudyOption[];
}) {
  const [formDraft, setFormDraft] = useState<CaseStudyFormDraft>(EMPTY_CASE_STUDY_FORM_DRAFT);
  const [viewState, setViewState] = useState<CaseStudyViewState>({ status: "editing" });
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string[]>>>({});
  const submitMutation = useSubmitCaseStudyMutation();

  const resumeDraftId = useSearchParams().get("draftId");
  const resumeDraftQuery = useMyDraftQuery(resumeDraftId);
  const resumedDraft = resumeDraftQuery.data;

  /**
   * ⚠️ AUTOSAVE IS OFF UNTIL THE WRITER EDITS SOMETHING, and this flag is the whole guard.
   * A debounce that fired on mount would mint a row on every visit to this page, against a store
   * capped at 25 per author — so merely opening the composer twice a week would eventually lock
   * somebody out of saving. It is set by `applyFormPatch`, the one place the form changes.
   */
  const [hasWriterEdited, setHasWriterEdited] = useState(false);

  // SEEDS THE FORM FROM A RESUMED DRAFT, during render rather than in an effect — the reasoning is
  // written up in `teardown-wizard.tsx`, and the guard is state because a ref cannot be read here.
  const [seededDraftId, setSeededDraftId] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  if (resumedDraft !== undefined && seededDraftId !== resumedDraft.draftId) {
    setSeededDraftId(resumedDraft.draftId);
    const restored = restoreCaseStudyFormDraft(resumedDraft.document);
    if (restored === null) {
      setResumeError(
        "That saved draft could not be reopened. It may have been saved by an older version of this form.",
      );
    } else {
      setFormDraft(restored);
    }
  }

  const autosaveState = useBlueprintDraftAutosave({
    arm: "case_study",
    documentJson: JSON.stringify(formDraft),
    // WHAT THE WRITER WILL RECOGNISE IN THEIR DRAFTS LIST. The title first, the action they wrote
    // second, and a fallback last — a list of rows all reading "Untitled" is a list nobody can use.
    label: formDraft.title.trim() || formDraft.oneLineAction.trim() || "Untitled case study",
    isSavable: hasWriterEdited,
    resumedDraft,
  });
  // ONE KEY PER ATTEMPT, AND AN ATTEMPT IS ONE DRAFT, exactly as the launch composer records: read
  // once when Send is pressed, rotated on any edit and after a success, kept on a failed retry.
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  function applyFormPatch(formPatch: Partial<CaseStudyFormDraft>): void {
    if (submitMutation.isPending) return;
    // The one place the form changes, so the one place autosave is armed from.
    setHasWriterEdited(true);
    resetIdempotencyKey();
    setFormDraft((previousFormDraft) => ({ ...previousFormDraft, ...formPatch }));
    // Editing anything clears the last verdict: it describes a draft that no longer exists.
    setFieldErrors({});
    if (submitMutation.error !== null) submitMutation.reset();
  }

  if (viewState.status === "submitted") {
    return (
      <CaseStudyReceipt
        receipt={viewState.receipt}
        onWriteAnother={() => {
          setFormDraft(EMPTY_CASE_STUDY_FORM_DRAFT);
          setFieldErrors({});
          submitMutation.reset();
          setViewState({ status: "editing" });
        }}
      />
    );
  }

  const isSending = submitMutation.isPending;
  const sendBlockedReason = describeCaseStudyStatementGap(
    formDraft.authorRelationship,
    formDraft.acceptedStatementIds,
  );
  const lessonRowPreview = buildLessonRowPreview(formDraft);

  const fieldErrorEntries = Object.entries(fieldErrors).toSorted(
    ([firstFieldPath], [secondFieldPath]) =>
      findCaseStudyFieldPosition(firstFieldPath) - findCaseStudyFieldPosition(secondFieldPath),
  );
  const submitError =
    submitMutation.error instanceof ApiRequestError ? submitMutation.error : undefined;

  function readFieldError(fieldPath: string): string | null {
    return fieldErrors[fieldPath]?.join(" ") ?? null;
  }

  function readFieldErrorsUnder(fieldPathPrefix: string): string | null {
    const messages = Object.entries(fieldErrors)
      .filter(
        ([fieldPath]) =>
          fieldPath === fieldPathPrefix || fieldPath.startsWith(`${fieldPathPrefix}.`),
      )
      .flatMap(([, fieldMessages]) => fieldMessages);
    return messages.length === 0 ? null : messages.join(" ");
  }

  function updateRelatedLessonSlot(slotIndex: number, selectedSlug: string): void {
    applyFormPatch({
      relatedLessonSlotSlugs: formDraft.relatedLessonSlotSlugs.map((slotSlug, existingSlotIndex) =>
        existingSlotIndex === slotIndex
          ? // Checked against the real options rather than trusted: a `<select>` hands back a string.
            (caseStudyOptions.find((caseStudyOption) => caseStudyOption.slug === selectedSlug)
              ?.slug ?? "")
          : slotSlug,
      ),
    });
  }

  function handleSendClick(): void {
    const collected = collectCaseStudySubmission(formDraft);
    if (!collected.ok) {
      // The contract refused it. Show every field it named and stay put.
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
    <div className="max-w-2xl">
      <p className="text-xs font-medium tracking-wider text-primary-imprint uppercase">
        Case studies
      </p>
      <h1 className="mt-1 text-xl font-medium text-foreground lg:text-2xl">Write a case study</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        A case study is one lesson somebody learned the expensive way, written as a record: what
        went wrong, what they did, what to avoid, and where the figures came from.
      </p>

      {/* A DISABLED FIELDSET WHILE SENDING locks every control inside in one place, so nothing can
          change the draft a running request was built from. */}
      <fieldset disabled={isSending} className="mt-8 min-w-0 space-y-8">
        <CaseStudyLessonAndRelationshipFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
        />
        <CaseStudyStoryAndActionsFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
        />
        <CaseStudyEvidenceAndNumbersFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
          readFieldErrorsUnder={readFieldErrorsUnder}
        />
        <CaseStudyRelatedLessonsAndStatementsFields
          formDraft={formDraft}
          applyFormPatch={applyFormPatch}
          readFieldError={readFieldError}
          caseStudyOptions={caseStudyOptions}
          updateRelatedLessonSlot={updateRelatedLessonSlot}
          lessonRowPreview={lessonRowPreview}
        />
      </fieldset>

      {fieldErrorEntries.length > 0 ? (
        <div
          role="alert"
          className="mt-8 space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <p>This case study can&apos;t be sent yet:</p>
          <ul className="list-inside list-disc text-xs">
            {fieldErrorEntries.map(([fieldPath, messages]) => (
              <li key={fieldPath}>
                <span className="font-medium">{describeCaseStudyFieldPath(fieldPath)}</span>:{" "}
                {messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitError === undefined ? null : (
        <div className="mt-8">
          <MutationErrorNotice error={submitError.apiError} />
        </div>
      )}

      {/* A DRAFT THAT WOULD NOT REOPEN. Said once, and the form below is the empty one rather than
          a half-restored one — a partly-applied draft is worse than none, because the writer cannot
          tell which fields are theirs. */}
      {resumeError === null ? null : (
        <div className="mt-4 max-w-2xl rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          {resumeError}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={handleSendClick}
          disabled={sendBlockedReason !== null || isSending}
          className="rounded-full bg-primary-imprint px-5 py-2.5 text-sm font-medium text-primary-imprint-foreground transition-colors hover:bg-primary-imprint-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSending ? "Sending…" : "Send for review"}
        </button>
        {/* A DISABLED BUTTON SAYS WHY, beside itself. */}
        {sendBlockedReason === null ? null : (
          <p className="max-w-md text-xs text-muted-foreground">{sendBlockedReason}</p>
        )}
      </div>

      {/* BESIDE THE SUBMIT, NOT ABOVE THE FORM. This is where a writer looks when deciding whether
          it is safe to leave, and a refusal has to be in the same glance as the button they were
          about to not press. */}
      <div className="mt-3 max-w-2xl">
        <DraftAutosaveStatus state={autosaveState} />
      </div>
    </div>
  );
}
