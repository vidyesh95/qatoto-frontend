"use client";

// TRANSPORT: client-query — debounced writes through `@/hooks/blueprints/drafts`.
//
// AUTOSAVE FOR THE SINGLE-PAGE COMPOSERS, and the backend was built for it. The limiter behind
// these writes is 600 per 15 minutes where a submit limiter is 5, and its own comment says why:
// "an autosave fires every few seconds while they type, so the five-per-fifteen-minutes shape used
// for submissions would break the feature it is meant to protect."
//
// ⚠️ **THE DOCUMENT IS A STRING THE CALLER SERIALIZES**, so this hook never learns an arm's shape.
// The draft store deliberately does not parse the document either — a half-answered form is what it
// exists to hold — so a typed document here would be this file inventing a contract neither end has.
//
// ⚠️ **IT WILL NOT SAVE A FORM NOBODY HAS TOUCHED.** `isSavable` is the caller's promise that a
// real edit happened. Without it a debounce fires on mount and mints a junk row on every visit to
// the composer, against a store capped at 25 rows per author — turning "I opened the page twice a
// day" into "I can no longer save drafts".
//
// ⚠️ **A REFUSAL STOPS THE LOOP AND SAYS SO.** Retrying a stale revision produces the same 409
// forever, and the danger in a silent failure is specific: the author believes their work is safe
// because a box said "Saved" a minute ago. When this surfaces a refusal it means nothing has been
// stored since, and the copy in the caller must say that rather than "could not save".

import { useEffect, useRef, useState } from "react";

import { useCreateDraftMutation, useReplaceDraftMutation } from "@/hooks/blueprints/drafts";
import type { BlueprintDraftArm, BlueprintDraftView } from "@/lib/blueprints/drafts.schemas";
import { ApiRequestError } from "@/lib/http";

/** How long the author stops typing before a save goes out. */
const AUTOSAVE_IDLE_DELAY_MS = 2_500;

/**
 * The version stamped on every document this app writes.
 *
 * ONE NUMBER FOR EVERY ARM, because the field answers "can this build read that document", not
 * "which wizard wrote it" — the `arm` column already says that. Raise it when a restore function
 * stops being able to read what the previous version wrote.
 */
const DRAFT_DOCUMENT_SCHEMA_VERSION = 1;

export type DraftAutosaveState =
  | { readonly status: "idle" }
  | { readonly status: "saving" }
  | { readonly status: "saved"; readonly savedAtLabel: string }
  | { readonly status: "refused"; readonly message: string };

export function useBlueprintDraftAutosave({
  arm,
  documentJson,
  label,
  isSavable,
  resumedDraft,
}: {
  readonly arm: BlueprintDraftArm;
  /** The whole form, already stringified. Changing it restarts the idle timer. */
  readonly documentJson: string;
  /** What the author will recognise in their drafts list. */
  readonly label: string;
  /** The caller's promise that a real edit happened. False means never save. */
  readonly isSavable: boolean;
  /** A draft being resumed, so the first save replaces it instead of minting a second row. */
  readonly resumedDraft: BlueprintDraftView | undefined;
}): DraftAutosaveState {
  const createDraftMutation = useCreateDraftMutation();
  const replaceDraftMutation = useReplaceDraftMutation(resumedDraft?.draftId ?? "");

  const [autosaveState, setAutosaveState] = useState<DraftAutosaveState>({ status: "idle" });

  /**
   * The row this composer is writing to, and the revision it last saw.
   *
   * A REF, NOT STATE, BECAUSE NOTHING RENDERS IT. Held in state it would re-render the whole
   * composer on every save purely to store a number the author never sees — and it is read inside
   * the timer callback, where a stale closure over state would send an old revision and 409.
   */
  const draftRowRef = useRef<{ draftId: string; revision: number } | null>(null);
  /** What was last written, so an unchanged document never spends a request. */
  const lastSavedDocumentRef = useRef<string | null>(null);
  /** Stops the loop after a refusal that retrying cannot fix. */
  const isHaltedRef = useRef(false);

  // SEEDING A RESUMED DRAFT, guarded on its id so a later refetch of the same row cannot reset the
  // revision this composer has since moved past. An effect, not a render-phase write, because React
  // may replay or discard a render; declared ABOVE the save effect so it runs first in a commit that
  // delivers both the resumed row and its restored document.
  const seededDraftIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (resumedDraft === undefined || seededDraftIdRef.current === resumedDraft.draftId) return;
    seededDraftIdRef.current = resumedDraft.draftId;
    draftRowRef.current = { draftId: resumedDraft.draftId, revision: resumedDraft.revision };
    lastSavedDocumentRef.current = resumedDraft.document;
  }, [resumedDraft]);

  useEffect(() => {
    // ONE GUARD, ONE RETURN. Early `return;` beside a `return () => …` is an effect with two
    // return shapes, which `typescript(consistent-return)` flags and a reader has to squint at.
    const shouldSchedule =
      isSavable && !isHaltedRef.current && documentJson !== lastSavedDocumentRef.current;
    if (!shouldSchedule) return undefined;

    const idleTimer = setTimeout(() => {
      // `void`: the timer cannot await, and every failure path below is handled inside.
      void (async () => {
        setAutosaveState({ status: "saving" });
        try {
          const existingRow = draftRowRef.current;
          const receipt =
            existingRow === null
              ? await createDraftMutation.mutateAsync({
                  arm,
                  label,
                  document: documentJson,
                  documentSchemaVersion: DRAFT_DOCUMENT_SCHEMA_VERSION,
                })
              : await replaceDraftMutation.mutateAsync({
                  label,
                  document: documentJson,
                  documentSchemaVersion: DRAFT_DOCUMENT_SCHEMA_VERSION,
                  revision: existingRow.revision,
                });

          draftRowRef.current = { draftId: receipt.draftId, revision: receipt.revision };
          lastSavedDocumentRef.current = documentJson;
          setAutosaveState({
            status: "saved",
            savedAtLabel: new Date(receipt.updatedAt).toLocaleTimeString(),
          });
        } catch (saveError) {
          setAutosaveState({
            status: "refused",
            message: describeAutosaveRefusal(saveError),
          });
          // A stale revision and a full store both answer the same way to a retry, so the loop
          // stops rather than spending the author's rate limit on a settled answer.
          isHaltedRef.current = true;
        }
      })();
    }, AUTOSAVE_IDLE_DELAY_MS);

    return () => clearTimeout(idleTimer);
    // The mutation objects are recreated every render and are deliberately not dependencies:
    // including them would restart the idle timer on every keystroke's re-render and no save would
    // ever fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentJson, isSavable, arm, label]);

  return autosaveState;
}

/**
 * Turns a failed save into a sentence an author can act on.
 *
 * THE SERVER'S OWN WORDS WHERE IT HAS THEM. "That draft is too large to save" names the actual
 * problem far better than a generic failure, and a 409 needs the reader to know a second tab
 * exists — neither survives a paraphrase.
 */
function describeAutosaveRefusal(saveError: unknown): string {
  if (!(saveError instanceof ApiRequestError)) {
    return "Your draft has not been saved. Check your connection; your work is still on this page.";
  }
  if (saveError.apiError.code === "409") {
    return "This draft was changed in another tab, so saving here has stopped to avoid overwriting it. Copy anything you need, then reload.";
  }
  return `${saveError.apiError.message} Saving has stopped; your work is still on this page.`;
}
