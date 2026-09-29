// TRANSPORT: client-query — one rights claim, answered by a flag or quarantine on its teardown
// (`@/hooks/blueprints/content-moderation`) or by a dismissal (`@/hooks/blueprints/rights-claim-moderation`).
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useBlueprintModerationMutation } from "@/hooks/blueprints/content-moderation";
import {
  useDismissRightsClaimMutation,
  useRefreshRightsClaimQueue,
} from "@/hooks/blueprints/rights-claim-moderation";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  RIGHTS_CLAIM_TARGET_KIND_LABELS,
  type RightsClaimQueueItem,
} from "@/lib/blueprints/rights-claim-moderation.schemas";
import { RIGHTS_CLAIM_KIND_LABELS } from "@/lib/blueprints/rights-claim.schemas";
import type { ActionResponse, ApiError } from "@/lib/http";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-outline-variant/60 p-4";
const NOTE_CLASS =
  "mt-1 w-full resize-y rounded-md border border-outline-variant/60 bg-background px-2.5 py-1.5 text-sm";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const LINK_CLASS = "font-medium text-primary-imprint underline-offset-2 hover:underline";

type ClaimAnswer = "flag" | "quarantine" | "dismiss";

/**
 * What the MODERATOR is doing, as five arms — the same five the three review cards use, with the
 * confirm step on quarantine rather than publish, because quarantine is the verb that withholds
 * somebody's files.
 */
type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirmingQuarantine" }
  | { readonly status: "deciding"; readonly answer: ClaimAnswer }
  | { readonly status: "refused"; readonly error: ApiError }
  | { readonly status: "decided"; readonly answer: ClaimAnswer };

/** `sendJson` returns failures as values; this covers a throw below it. */
const UNREACHABLE_RESPONSE: ActionResponse<unknown> = {
  success: false,
  error: { code: "NETWORK", message: "Could not reach the server. Try again." },
};

const DECIDED_SENTENCES: Readonly<Record<ClaimAnswer, string>> = {
  flag: "Flagged the teardown and marked this claim actioned.",
  quarantine: "Quarantined the teardown and marked this claim actioned.",
  dismiss: "Dismissed the claim. The teardown is unchanged.",
};

/**
 * One rights claim.
 *
 * ⚠️ THE CLAIMANT'S IDENTITY IS ON THIS CARD AND NOWHERE ELSE. The teardown's publisher never sees
 * it. The note you write is stored against the decision and is not shown to the publisher either.
 *
 * ⚠️ EVERY ANSWER ACTS ON THE WHOLE TEARDOWN, EVEN WHEN THE CLAIM NAMES ONE FILE. No verb acts on a
 * single file; a quarantine withholds all of them. The target is shown so you can judge whether
 * that is proportionate.
 *
 * ⚠️ NO RESTORE HERE. Restoring answers nobody's claim; it lives on the report queue, where
 * overturning a decision gets its own note.
 */
export default function RightsClaimCard({ claim }: { readonly claim: RightsClaimQueueItem }) {
  const [note, setNote] = useState("");
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  const moderate = useBlueprintModerationMutation();
  const dismiss = useDismissRightsClaimMutation();
  const refreshQueue = useRefreshRightsClaimQueue();

  const isBusy = cardState.status === "deciding";
  const trimmedNote = note.trim();
  const isNoteEmpty = trimmedNote === "";

  function handleNoteChange(nextNote: string): void {
    if (isBusy) return;
    setNote(nextNote);
    // The server fingerprints the body, so a corrected note under the old key is a replay.
    resetIdempotencyKey();
    if (cardState.status === "refused") setCardState({ status: "idle" });
  }

  function recordOutcome(answer: ClaimAnswer, result: ActionResponse<unknown>): void {
    if (result.success) {
      resetIdempotencyKey();
      setCardState({ status: "decided", answer });
      return;
    }
    // Never rotated on a refusal: a retry of the same answer must carry the same key.
    setCardState({ status: "refused", error: result.error });
  }

  function answerWithVerb(verb: "flag" | "quarantine"): void {
    if (isBusy || isNoteEmpty) return;
    setCardState({ status: "deciding", answer: verb });
    moderate.mutate(
      {
        targetKind: "teardown",
        targetId: claim.teardownId,
        verb,
        reasonNote: trimmedNote,
        rightsClaimId: claim.claimId,
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => recordOutcome(verb, result),
        onError: () => recordOutcome(verb, UNREACHABLE_RESPONSE),
      },
    );
  }

  function answerWithDismissal(): void {
    if (isBusy || isNoteEmpty) return;
    setCardState({ status: "deciding", answer: "dismiss" });
    dismiss.mutate(
      { claimId: claim.claimId, resolutionNote: trimmedNote, idempotencyKey: getIdempotencyKey() },
      {
        onSuccess: (result) => recordOutcome("dismiss", result),
        onError: () => recordOutcome("dismiss", UNREACHABLE_RESPONSE),
      },
    );
  }

  function renderDecision() {
    switch (cardState.status) {
      case "decided":
        return (
          <output className="mt-3 block rounded-xl bg-muted p-3 text-sm">
            {DECIDED_SENTENCES[cardState.answer]}
          </output>
        );
      case "idle":
      case "confirmingQuarantine":
      case "deciding":
      case "refused":
        return (
          <div className="mt-4 border-t border-outline-variant/60 pt-3">
            <label htmlFor={`claim-note-${claim.claimId}`} className="block text-xs font-medium">
              Why — recorded against the decision, and shown to nobody but staff
            </label>
            <textarea
              id={`claim-note-${claim.claimId}`}
              value={note}
              onChange={(event) => handleNoteChange(event.target.value)}
              rows={2}
              disabled={isBusy}
              className={NOTE_CLASS}
            />

            {cardState.status === "confirmingQuarantine" ? (
              <div className="mt-2 rounded-lg bg-muted/40 p-3">
                <p className="text-xs">
                  Quarantining withholds every file, the model, the parts list and the composition
                  from this teardown, not only what the claim names. The page stays up with a
                  notice.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => answerWithVerb("quarantine")}
                    className={PRIMARY_BUTTON_CLASS}
                  >
                    Quarantine it
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardState({ status: "idle" })}
                    className={QUIET_BUTTON_CLASS}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCardState({ status: "confirmingQuarantine" })}
                  disabled={isBusy || isNoteEmpty}
                  className={PRIMARY_BUTTON_CLASS}
                >
                  {cardState.status === "deciding" && cardState.answer === "quarantine"
                    ? "Quarantining…"
                    : "Quarantine"}
                </button>
                <button
                  type="button"
                  onClick={() => answerWithVerb("flag")}
                  disabled={isBusy || isNoteEmpty}
                  className={QUIET_BUTTON_CLASS}
                >
                  {cardState.status === "deciding" && cardState.answer === "flag"
                    ? "Flagging…"
                    : "Flag"}
                </button>
                <button
                  type="button"
                  onClick={answerWithDismissal}
                  disabled={isBusy || isNoteEmpty}
                  className={QUIET_BUTTON_CLASS}
                >
                  {cardState.status === "deciding" && cardState.answer === "dismiss"
                    ? "Dismissing…"
                    : "Dismiss the claim"}
                </button>
                {isNoteEmpty ? (
                  <span className="text-xs text-muted-foreground">Every answer needs a note.</span>
                ) : null}
              </div>
            )}

            {cardState.status === "refused" ? (
              <div className="mt-3 space-y-2">
                <MutationErrorNotice error={cardState.error} />
                {cardState.error.code === "409" ? (
                  <button type="button" onClick={refreshQueue} className={QUIET_BUTTON_CLASS}>
                    Refresh the queue
                  </button>
                ) : null}
              </div>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              Dismissing answers the claimant and changes nothing about the teardown.
            </p>
          </div>
        );
      default: {
        const exhaustiveCheck: never = cardState;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <li className={CARD_CLASS}>
      <ClaimSummary claim={claim} />

      {claim.status === "open" ? renderDecision() : <ClaimResolution claim={claim} />}
    </li>
  );
}

function ClaimSummary({ claim }: { readonly claim: RightsClaimQueueItem }) {
  return (
    <>
      <p className="text-xs tracking-wider text-muted-foreground uppercase">
        {RIGHTS_CLAIM_KIND_LABELS[claim.claimKind]} · filed {formatIsoInstantLabel(claim.createdAt)}
      </p>
      <h2 className="mt-1 text-sm font-medium">
        {claim.teardownTitle}{" "}
        <span className="font-normal text-muted-foreground">({claim.teardownModerationState})</span>
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        <a
          href={`/blueprints/teardowns/${claim.teardownSlug}`}
          target="_blank"
          rel="noreferrer"
          className={LINK_CLASS}
        >
          Open the teardown
        </a>
        {claim.openClaimCountOnTeardown > 1
          ? ` · ${String(claim.openClaimCountOnTeardown)} open claims about this teardown`
          : ""}
      </p>

      <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-xs text-muted-foreground">Claim is about</dt>
        <dd>
          {RIGHTS_CLAIM_TARGET_KIND_LABELS[claim.targetKind]}
          {claim.targetKind === "whole_teardown" ? null : (
            <>
              : {claim.targetTitleSnapshot}{" "}
              <span className="font-mono text-xs text-muted-foreground">{claim.targetId}</span>
            </>
          )}
        </dd>
        <dt className="text-xs text-muted-foreground">Sworn</dt>
        <dd>All three statements, {formatIsoInstantLabel(claim.swornAt)}</dd>
      </dl>

      {claim.claimantDetailsPurgedAt === null ? (
        <>
          <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="text-xs text-muted-foreground">Claimant</dt>
            <dd>
              {claim.claimantFullName}
              {claim.claimantOrganizationName === null
                ? null
                : `, ${claim.claimantOrganizationName}`}
              {claim.claimantHandle === null ? null : (
                <span className="text-muted-foreground"> (@{claim.claimantHandle})</span>
              )}
            </dd>
            <dt className="text-xs text-muted-foreground">Reply to</dt>
            <dd>
              <a href={`mailto:${claim.claimantEmail}`} className={LINK_CLASS}>
                {claim.claimantEmail}
              </a>
            </dd>
            <dt className="text-xs text-muted-foreground">Standing</dt>
            <dd>{claim.relationshipToRightsHolder}</dd>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">What they say</p>
          <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{claim.claimSubstance}</p>
        </>
      ) : (
        <output className="mt-3 block rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          Claimant details removed after the retention period, on{" "}
          {formatIsoInstantLabel(claim.claimantDetailsPurgedAt)}. The record that this claim was
          filed and how it was answered is kept.
        </output>
      )}
    </>
  );
}

function ClaimResolution({ claim }: { readonly claim: RightsClaimQueueItem }) {
  return (
    <div className="mt-4 border-t border-outline-variant/60 pt-3 text-sm">
      <p className="text-xs text-muted-foreground">
        {claim.status === "actioned" ? "Actioned" : "Dismissed"}
        {claim.resolvedAt === null ? null : ` ${formatIsoInstantLabel(claim.resolvedAt)}`}
      </p>
      {claim.resolutionNote === null ? null : (
        <p className="mt-1 leading-6 whitespace-pre-wrap">{claim.resolutionNote}</p>
      )}
    </div>
  );
}
