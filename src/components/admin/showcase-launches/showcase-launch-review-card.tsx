// TRANSPORT: client-query — renders one launch and sends its decision through
// `useModerateShowcaseMutation`.
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import ShowcaseWriteUp from "@/components/home/blueprints/showcase/sections/showcase-write-up";
import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useModerateShowcaseMutation,
  useRefreshShowcaseReviewQueue,
} from "@/hooks/blueprints/showcase-moderation";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { BLUEPRINT_DIFFICULTY_LABELS } from "@/lib/blueprints/schemas";
import { SHOWCASE_LAUNCH_STATEMENTS } from "@/lib/blueprints/showcase-authoring.schemas";
import {
  SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS,
  ShowcaseModerationDecisionSchema,
  type ShowcaseModerationDecision,
  type ShowcaseModerationResult,
  type ShowcaseReviewItem,
} from "@/lib/blueprints/showcase-moderation.schemas";
import type { ApiError } from "@/lib/http";
import { formatCentsLabel, formatIsoInstantAsDateLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

type DecisionKind = ShowcaseModerationDecision["decision"];

/**
 * THE CARD'S OWN STATE, AS A UNION. `refused` keeps the backend's whole error so a 409 can offer a
 * refresh; `decided` keeps the result so the card can say what happened without waiting for a refetch.
 */
type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirmingPublish" }
  | { readonly status: "deciding"; readonly decision: DecisionKind }
  | { readonly status: "refused"; readonly error: ApiError }
  | { readonly status: "decided"; readonly result: ShowcaseModerationResult };

/**
 * One launch waiting for a decision, shown whole.
 *
 * ⚠️ ONE ATTEMPT KEY PER CARD, AND AN ATTEMPT IS ONE DECISION WITH ONE NOTE, as on the case-study
 * card. The key rotates when the note changes, when the next decision differs from the last one
 * tried, and after a success; an identical retry keeps it. The pathway queue reused one key across a
 * failed Send back and a later Publish, which the server answers with a 409 for a different body.
 *
 * ⚠️ THE DECIDED LINE PRINTS NO PUBLIC ADDRESS. The public showcase pages still read sample launches,
 * so the address has no page behind it and a moderator following it would land on a 404.
 */
export default function ShowcaseLaunchReviewCard({
  submission,
}: {
  readonly submission: ShowcaseReviewItem;
}) {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });
  const [moderatorNote, setModeratorNote] = useState("");
  const moderateShowcase = useModerateShowcaseMutation();
  const refreshQueue = useRefreshShowcaseReviewQueue();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();
  // The decision the current key was last used for. Read and written only in handlers.
  const lastAttemptedDecisionRef = useRef<DecisionKind | null>(null);

  function handleNoteChange(nextNote: string): void {
    setModeratorNote(nextNote);
    // A different note is a different body, so it is a different attempt.
    resetIdempotencyKey();
    lastAttemptedDecisionRef.current = null;
    if (cardState.status === "refused") setCardState({ status: "idle" });
  }

  function decide(decision: DecisionKind): void {
    const trimmedNote = moderatorNote.trim();
    const parsedDecision = ShowcaseModerationDecisionSchema.safeParse(
      decision === "published"
        ? { decision, moderatorNote: trimmedNote === "" ? null : trimmedNote }
        : { decision, moderatorNote: trimmedNote },
    );
    if (!parsedDecision.success) {
      setCardState({
        status: "refused",
        error: {
          code: "422",
          message: parsedDecision.error.issues[0]?.message ?? "That decision could not be read.",
        },
      });
      return;
    }

    if (
      lastAttemptedDecisionRef.current !== null &&
      lastAttemptedDecisionRef.current !== decision
    ) {
      resetIdempotencyKey();
    }
    lastAttemptedDecisionRef.current = decision;

    setCardState({ status: "deciding", decision });
    moderateShowcase.mutate(
      {
        submissionId: submission.submissionId,
        decision: parsedDecision.data,
        idempotencyKey: getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            resetIdempotencyKey();
            lastAttemptedDecisionRef.current = null;
            setCardState({ status: "decided", result: result.data });
            return;
          }
          setCardState({ status: "refused", error: result.error });
        },
        onError: (error) =>
          setCardState({ status: "refused", error: { code: "NETWORK", message: error.message } }),
      },
    );
  }

  if (cardState.status === "decided") {
    return (
      <article className={CARD_CLASS}>
        <h2 className="text-sm font-medium">{submission.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {cardState.result.moderationState === "published"
            ? "Published. It does not appear on the public showcase pages yet, which still show sample launches."
            : "Sent back to the maker with your note."}
        </p>
      </article>
    );
  }

  const isBusy = cardState.status === "deciding";
  const isNoteEmpty = moderatorNote.trim() === "";
  const costRange = submission.billOfMaterialsCostRange;

  return (
    <article className={CARD_CLASS}>
      <header className="flex items-start gap-3">
        <Image
          src={submission.headingImageUrl}
          alt=""
          width={72}
          height={72}
          className="size-18 shrink-0 rounded-lg bg-muted object-cover"
        />
        <div className="min-w-0">
          <h2 className="text-base font-medium">{submission.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{submission.tagline}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {submission.author.displayName}
            {submission.author.handle === null ? "" : ` @${submission.author.handle}`} · sent{" "}
            {formatIsoInstantAsDateLabel(submission.submittedAt)}
          </p>
        </div>
      </header>

      <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
        <p className="text-muted-foreground">
          Ticked:{" "}
          {submission.acceptedLaunchStatementIds
            .map((statementId) => SHOWCASE_LAUNCH_STATEMENTS[statementId].label)
            .join("; ")}
        </p>
      </div>

      <p className="mt-3 text-sm leading-6">{submission.summary}</p>

      <section className="mt-3">
        <h3 className="text-xs font-medium text-muted-foreground">Write-up</h3>
        {submission.writeUp === null ? (
          <p className="mt-1 text-sm text-muted-foreground">No write-up.</p>
        ) : (
          <ShowcaseWriteUp markdown={submission.writeUp} imageSizes={submission.writeUpImages} />
        )}
      </section>

      {submission.callToAction === null ? null : (
        <section className="mt-3">
          <h3 className="text-xs font-medium text-muted-foreground">Link</h3>
          <a
            href={submission.callToAction.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-1 block text-sm text-[#00696E] hover:underline"
          >
            {submission.callToAction.label}
          </a>
          <span className="block text-xs break-all text-muted-foreground">
            {submission.callToAction.url}
          </span>
        </section>
      )}

      <section className="mt-3">
        <h3 className="text-xs font-medium text-muted-foreground">Team</h3>
        {submission.team.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">No team listed.</p>
        ) : (
          <>
            <ul className="mt-1 space-y-1 text-sm">
              {submission.team.map((teamMember) => (
                <li key={teamMember.handle}>
                  {teamMember.displayName} @{teamMember.handle} · {teamMember.role}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Handles are free text and are not verified.
            </p>
          </>
        )}
      </section>

      <section className="mt-3">
        <h3 className="text-xs font-medium text-muted-foreground">Details</h3>
        <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <FactRow label="Launched" value={formatIsoInstantAsDateLabel(submission.launchedAt)} />
          <FactRow
            label="How hard to build again"
            value={BLUEPRINT_DIFFICULTY_LABELS[submission.difficulty]}
          />
          {costRange === null ? null : (
            <FactRow
              label="Parts cost"
              value={`${formatCentsLabel(costRange.minimumInCents, costRange.currency)} to ${formatCentsLabel(costRange.maximumInCents, costRange.currency)}`}
            />
          )}
          {submission.builtFromBlueprintSlug === null ? null : (
            <FactRow label="Built from teardown" value={submission.builtFromBlueprintSlug} />
          )}
        </dl>
      </section>

      {submission.tags.length === 0 ? null : (
        <p className="mt-4 text-xs text-muted-foreground">Tags: {submission.tags.join(", ")}</p>
      )}

      <div className="mt-4 border-t border-[#CAC4D0]/60 pt-3">
        <label className="block text-xs text-muted-foreground">
          Note to the maker
          <textarea
            value={moderatorNote}
            maxLength={SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS}
            rows={3}
            disabled={isBusy}
            onChange={(changeEvent) => handleNoteChange(changeEvent.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {moderatorNote.length} of{" "}
          {SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")}
        </p>

        {cardState.status === "confirmingPublish" ? (
          <div className="mt-2 rounded-lg bg-muted/40 p-3">
            <p className="text-xs">
              Publishing gives this launch a public address under the maker&apos;s name. It will not
              show on the public showcase pages yet.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => decide("published")}
                className={PRIMARY_BUTTON_CLASS}
              >
                Publish it
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
              disabled={isBusy}
              onClick={() => setCardState({ status: "confirmingPublish" })}
              className={PRIMARY_BUTTON_CLASS}
            >
              {cardState.status === "deciding" && cardState.decision === "published"
                ? "Publishing…"
                : "Publish"}
            </button>
            <button
              type="button"
              // A send-back must say why, so it waits for a note rather than failing after a click.
              disabled={isBusy || isNoteEmpty}
              onClick={() => decide("rejected")}
              className={QUIET_BUTTON_CLASS}
            >
              {cardState.status === "deciding" && cardState.decision === "rejected"
                ? "Sending back…"
                : "Send back"}
            </button>
            {isNoteEmpty ? (
              <span className="text-[11px] text-muted-foreground">
                Sending back needs a note. It is the only thing the maker sees.
              </span>
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
      </div>
    </article>
  );
}

function FactRow({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="border-t border-[#CAC4D0]/40 py-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
