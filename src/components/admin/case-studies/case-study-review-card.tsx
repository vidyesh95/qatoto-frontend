// TRANSPORT: client-query — renders one submission and sends its decision through
// `useModerateCaseStudyMutation`, which is mock-backed today.
"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useModerateCaseStudyMutation,
  useRefreshCaseStudyReviewQueue,
} from "@/hooks/blueprints/case-study-moderation";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES,
  CASE_STUDY_STATEMENTS,
} from "@/lib/blueprints/case-study-authoring.schemas";
import {
  CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS,
  CaseStudyModerationDecisionSchema,
  type CaseStudyModerationDecision,
  type CaseStudyModerationResult,
  type CaseStudyReviewItem,
} from "@/lib/blueprints/case-study-moderation.schemas";
import { formatBlueprintMetricValue } from "@/lib/blueprints/format";
import { BLUEPRINT_DISCIPLINE_LABELS, buildBlueprintHref } from "@/lib/blueprints/schemas";
import type { ApiError } from "@/lib/http";
import { formatCentsLabel, formatIsoInstantAsDateLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";
const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";
const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";
const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm outline-none focus:border-primary";

type DecisionKind = CaseStudyModerationDecision["decision"];

/**
 * THE CARD'S OWN STATE, AS A UNION. `refused` keeps the backend's whole error so a 409 can offer a
 * refresh; `decided` keeps the result so the card can say what happened without waiting for a refetch.
 */
type CardState =
  | { readonly status: "idle" }
  | { readonly status: "confirmingPublish" }
  | { readonly status: "deciding"; readonly decision: DecisionKind }
  | { readonly status: "refused"; readonly error: ApiError }
  | { readonly status: "decided"; readonly result: CaseStudyModerationResult };

/**
 * One case study waiting for a decision, shown whole, in the order the published record reads.
 *
 * ⚠️ ONE ATTEMPT KEY PER CARD, AND AN ATTEMPT IS ONE DECISION WITH ONE NOTE. The key rotates when the
 * note changes, when the next decision differs from the last one tried, and after a success; an
 * identical retry keeps it. The pathway queue reused one key across a failed Send back and a later
 * Publish, which a real server answers with a replay of the wrong body (`todo.md`, launches 2b).
 */
export default function CaseStudyReviewCard({
  submission,
}: {
  readonly submission: CaseStudyReviewItem;
}) {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });
  const [moderatorNote, setModeratorNote] = useState("");
  const moderateCaseStudy = useModerateCaseStudyMutation();
  const refreshQueue = useRefreshCaseStudyReviewQueue();
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
    const parsedDecision = CaseStudyModerationDecisionSchema.safeParse(
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
    moderateCaseStudy.mutate(
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
            ? `Published at /blueprints/case-studies/${cardState.result.publicSlug ?? ""}.`
            : "Sent back to the writer with your note."}
        </p>
      </article>
    );
  }

  const isBusy = cardState.status === "deciding";
  const isNoteEmpty = moderatorNote.trim() === "";
  const relationshipChoice = CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES[submission.authorRelationship];

  return (
    <article className={CARD_CLASS}>
      <header>
        <p className="text-[11px] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          {submission.sector} · {BLUEPRINT_DISCIPLINE_LABELS[submission.discipline]}
        </p>
        <h2 className="mt-1 text-base font-medium">{submission.title}</h2>
        <p className="mt-1 text-sm font-medium">{submission.oneLineAction}</p>
        {submission.outcomeSummary === null ? null : (
          <p className="mt-1 text-sm text-muted-foreground">{submission.outcomeSummary}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {submission.author.displayName} @{submission.author.handle} · sent{" "}
          {formatIsoInstantAsDateLabel(submission.submittedAt)}
        </p>
      </header>

      <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
        <p className="font-medium text-foreground">{relationshipChoice.label}</p>
        <p className="mt-1 text-muted-foreground">
          Ticked:{" "}
          {submission.acceptedStatementIds
            .map((statementId) => CASE_STUDY_STATEMENTS[statementId].label)
            .join("; ")}
        </p>
      </div>

      <p className="mt-3 text-sm leading-6">{submission.summary}</p>
      <ReviewProse heading="Problem" body={submission.problem} />
      <ReviewProse heading="Context" body={submission.context} />
      <ReviewList heading="What they did" items={submission.actionSteps} isOrdered />
      <ReviewList heading="What to avoid" items={submission.pitfalls} isOrdered={false} />
      <ReviewFacts submission={submission} />
      <ReviewSources submission={submission} />

      {submission.relatedLessonSlugs.length === 0 ? null : (
        <section className="mt-4">
          <h3 className="text-xs font-medium text-muted-foreground">Related lessons</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {submission.relatedLessonSlugs.map((relatedLessonSlug) => (
              <li key={relatedLessonSlug}>
                <Link
                  href={buildBlueprintHref({ category: "case_study", slug: relatedLessonSlug })}
                  className="text-[#00696E] hover:underline"
                >
                  {relatedLessonSlug}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {submission.tags.length === 0 ? null : (
        <p className="mt-4 text-xs text-muted-foreground">Tags: {submission.tags.join(", ")}</p>
      )}

      <div className="mt-4 border-t border-[#CAC4D0]/60 pt-3">
        <label className="block text-xs text-muted-foreground">
          Note to the writer
          <textarea
            value={moderatorNote}
            maxLength={CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS}
            rows={3}
            disabled={isBusy}
            onChange={(changeEvent) => handleNoteChange(changeEvent.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
          {moderatorNote.length} of{" "}
          {CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")}
        </p>

        {cardState.status === "confirmingPublish" ? (
          <div className="mt-2 rounded-lg bg-muted/40 p-3">
            <p className="text-xs">
              Publishing puts this case study in the public list under the writer&apos;s name.
              Withheld company names stay hidden from readers.
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
                Sending back needs a note. It is the only thing the writer sees.
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

/** One prose section. An empty body renders nothing. */
function ReviewProse({ heading, body }: { readonly heading: string; readonly body: string }) {
  if (body === "") return null;
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </section>
  );
}

/** Steps (ordered) or pitfalls (not). The contract makes each item unique, so it is its own key. */
function ReviewList({
  heading,
  items,
  isOrdered,
}: {
  readonly heading: string;
  readonly items: readonly string[];
  readonly isOrdered: boolean;
}) {
  if (items.length === 0) return null;
  const listItems = items.map((item) => (
    <li key={item} className="text-sm leading-6">
      {item}
    </li>
  ));
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">{heading}</h3>
      {isOrdered ? (
        <ol className="mt-1 list-decimal space-y-1 pl-5">{listItems}</ol>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5">{listItems}</ul>
      )}
    </section>
  );
}

/**
 * Timeline, capital, companies and figures.
 *
 * ⚠️ A WITHHELD COMPANY SHOWS ITS REAL NAME, with a quiet marker. The marker is a bordered neutral chip
 * with words, not a colour: nothing about the name is wrong, it is only private.
 */
function ReviewFacts({ submission }: { readonly submission: CaseStudyReviewItem }) {
  const hasFacts =
    submission.timelineLabel !== null ||
    submission.capitalRaised !== null ||
    submission.evidenceCompanies.length > 0 ||
    submission.outcomeMetrics.length > 0;
  if (!hasFacts) return null;

  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">The business facts</h3>
      <dl className="mt-1 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {submission.timelineLabel === null ? null : (
          <FactRow label="Timeline" value={submission.timelineLabel} />
        )}
        {submission.capitalRaised === null ? null : (
          <FactRow
            label="Capital raised"
            value={formatCentsLabel(
              submission.capitalRaised.amountInCents,
              submission.capitalRaised.currency,
            )}
          />
        )}
        {submission.evidenceCompanies.map((company) => (
          <div key={company.name} className="border-t border-[#CAC4D0]/40 py-1">
            <dt className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{company.name}</span>
              {company.isNameWithheld ? (
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                  Withheld from readers
                </span>
              ) : null}
            </dt>
            <dd>
              {company.locationLabel}, {company.yearLabel}
            </dd>
          </div>
        ))}
        {submission.outcomeMetrics.map((metric) => (
          <FactRow
            key={metric.label}
            label={metric.label}
            value={formatBlueprintMetricValue(metric.value)}
          />
        ))}
      </dl>
    </section>
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

/** Sources, opened in a new tab. None is allowed first-hand, and says so rather than going blank. */
function ReviewSources({ submission }: { readonly submission: CaseStudyReviewItem }) {
  return (
    <section className="mt-3">
      <h3 className="text-xs font-medium text-muted-foreground">Sources</h3>
      {submission.sources.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">No sources linked.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {submission.sources.map((source) => (
            <li key={source.url} className="text-sm">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[#00696E] hover:underline"
              >
                {source.label}
              </a>
              <span className="block text-xs text-muted-foreground">{source.publisherLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
