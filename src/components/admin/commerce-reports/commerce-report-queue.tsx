"use client";

// The report queue tab. One card per report, each owning its own decision state, note and
// idempotency key.
//
// ⚠️ **EVERY CARD MINTS ITS OWN KEY AND THAT IS THE WHOLE REASON THE ROW IS A COMPONENT.** A key
// shared across the page makes the SECOND decision a replay of the first: the backend returns the
// first report's row, the second report is never decided, and this console renders a success. It is
// the most damaging mistake available here, and it looks like nothing went wrong.
//
// ⚠️ **A CARD SHOWS LESS THAN A VIDEO REPORT CARD DOES, AND NOT BY OMISSION.** The projection
// carries no reporter (the queue hides reporter identity from moderators — one who can see it can
// be lobbied), no target title, no open-report count and no visibility flag. What a moderator gets
// is the kind, the id, the reason and the reporter's own words.
//
// ⚠️ **NO DEEP LINK TO THE TARGET, DELIBERATELY.** `targetId` is an internal UUID while the public
// product route addresses a listing by `publicSlug` — and an `actioned` product is `suspended`,
// which the public read excludes — so a constructed `/store/product/{uuid}` would 404 on every
// single row. A link that always breaks is worse than an id you can copy.

import { useState } from "react";

import {
  useCommerceReportQueue,
  useDecideCommerceReportMutation,
  useRestoreCommerceContentMutation,
} from "@/hooks/store/admin-content-reports";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  COMMERCE_CONTENT_TARGET_KIND_NOUNS,
  COMMERCE_REPORT_REASON_LABELS,
  COMMERCE_REPORT_STATUS_LABELS,
  resolveModerationTarget,
  type CommerceContentReport,
  type CommerceContentTargetKind,
  type CommerceReportStatus,
} from "@/lib/store/content-reports.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

const CARD_CLASS = "rounded-2xl border border-[#CAC4D0]/60 p-4";

const PRIMARY_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-40";

const QUIET_BUTTON_CLASS =
  "cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-40";

const FIELD_CLASS =
  "mt-1 w-full rounded-lg border border-[#CAC4D0]/60 px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary";

type QueueViewState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | {
      readonly status: "ready";
      readonly reports: readonly CommerceContentReport[];
      readonly hasNextPage: boolean;
      readonly isFetchingNextPage: boolean;
      readonly loadMoreErrorMessage: string | null;
      readonly loadNextPage: () => void;
    };

export default function CommerceReportQueue({
  status,
  targetKind,
}: {
  readonly status: CommerceReportStatus;
  readonly targetKind: CommerceContentTargetKind | "all";
}) {
  const queue = useCommerceReportQueue(status, targetKind);

  const viewState: QueueViewState = (() => {
    if (queue.isLoadingFirstPage) return { status: "loading" };
    if (queue.firstPageErrorMessage !== null) {
      return { status: "error", message: queue.firstPageErrorMessage };
    }
    if (queue.rows.length === 0) return { status: "empty" };
    return {
      status: "ready",
      reports: queue.rows,
      hasNextPage: queue.hasNextPage,
      isFetchingNextPage: queue.isFetchingNextPage,
      loadMoreErrorMessage: queue.loadMoreErrorMessage,
      loadNextPage: queue.loadNextPage,
    };
  })();

  switch (viewState.status) {
    case "loading":
      return <div className={`${CARD_CLASS} h-28 animate-pulse bg-muted/40`} aria-hidden />;
    case "error":
      return (
        <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
          {viewState.message}
        </output>
      );
    case "empty":
      return (
        <p className="rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          {/*
            ⚠️ NEVER "you are not a moderator" HERE. This subtree only exists once the capability
            has been confirmed, so an empty queue means exactly one thing: nothing is waiting.
          */}
          Nothing in this queue.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3">
          {viewState.reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
          {viewState.loadMoreErrorMessage !== null && (
            <output className="block rounded-2xl border border-destructive/40 p-3 text-sm text-muted-foreground">
              {viewState.loadMoreErrorMessage}
            </output>
          )}
          {viewState.hasNextPage && (
            <button
              type="button"
              onClick={viewState.loadNextPage}
              disabled={viewState.isFetchingNextPage}
              className={QUIET_BUTTON_CLASS}
            >
              {/*
                ⚠️ "NEWER", NOT "OLDER". This route orders `asc(createdAt), asc(id)` — oldest
                first, so that the oldest unworked report cannot stay unworked forever — which
                means the next page is FORWARD in time. `certification-review-page.tsx` says
                "Load older" and is right for its own newest-first default; copying that label
                here points the reader backwards.
              */}
              {viewState.isFetchingNextPage ? "Loading…" : "Load newer reports"}
            </button>
          )}
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

/**
 * One report, and everything a moderator can do to it.
 *
 * The note box and the decision state are PER CARD: two reports open at once must not share one
 * textarea, and a note typed for one decision must not survive onto the next.
 */
type ReportRowState =
  | { readonly status: "idle" }
  | { readonly status: "deciding"; readonly decision: "actioned" | "dismissed" }
  | { readonly status: "restoring" }
  | { readonly status: "refused"; readonly message: string };

function ReportCard({ report }: { readonly report: CommerceContentReport }) {
  const [rowState, setRowState] = useState<ReportRowState>({ status: "idle" });
  const [decisionNote, setDecisionNote] = useState("");
  const [restoreReason, setRestoreReason] = useState("");

  const decideMutation = useDecideCommerceReportMutation();
  const restoreMutation = useRestoreCommerceContentMutation();
  const decideKey = useResettableAttemptIdempotencyKey();
  const restoreKey = useResettableAttemptIdempotencyKey();

  const target = resolveModerationTarget(report.targetKind, report.targetId);

  // AN ORGANIZATION IS THE ODD ONE OUT AND THE LABELS SAY SO. Upholding a report on any other
  // kind hides it; `setTargetVisibility`'s organization arm is a documented no-op, so a button
  // reading "Hide" on a company row would be a lie to the moderator pressing it.
  const isOrganizationReport = report.targetKind === "organization";

  const handleDecideClick = (decision: "actioned" | "dismissed") => {
    setRowState({ status: "deciding", decision });
    const trimmedNote = decisionNote.trim();
    decideMutation.mutate(
      {
        reportId: report.id,
        // Omitted when empty — the note is `.optional()` with an inner `.min(1)`.
        input: { decision, ...(trimmedNote === "" ? {} : { note: trimmedNote }) },
        idempotencyKey: decideKey.getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            // Rotated ONLY on a confirmed success. A retry after a network failure must carry
            // the key of the attempt it is retrying — that is the entire mechanism.
            decideKey.resetIdempotencyKey();
            setRowState({ status: "idle" });
            return;
          }
          // ⚠️ A 403 HERE IS PER-ROW, NOT PER-PAGE: "A member of the reported organization
          // cannot decide this report." The client cannot know the moderator's memberships, so
          // the control stays visible and the refusal is surfaced where it happened.
          setRowState({ status: "refused", message: result.error.message });
        },
        onError: (error) => setRowState({ status: "refused", message: error.message }),
      },
    );
  };

  const handleRestoreClick = () => {
    if (target.kind !== "resolved" || restoreReason.trim() === "") return;
    setRowState({ status: "restoring" });
    restoreMutation.mutate(
      {
        input: {
          targetKind: target.targetKind,
          targetId: target.targetId,
          reasonNote: restoreReason.trim(),
        },
        idempotencyKey: restoreKey.getIdempotencyKey(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            restoreKey.resetIdempotencyKey();
            setRestoreReason("");
            setRowState({ status: "idle" });
            return;
          }
          setRowState({ status: "refused", message: result.error.message });
        },
        onError: (error) => setRowState({ status: "refused", message: error.message }),
      },
    );
  };

  const isBusy = rowState.status === "deciding" || rowState.status === "restoring";

  return (
    <article className={CARD_CLASS}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">
          {COMMERCE_CONTENT_TARGET_KIND_NOUNS[report.targetKind]} ·{" "}
          {COMMERCE_REPORT_REASON_LABELS[report.reason]}
        </h2>
        <span className="text-xs text-muted-foreground">
          {COMMERCE_REPORT_STATUS_LABELS[report.status]} · {formatIsoInstantLabel(report.createdAt)}
        </span>
      </header>

      {target.kind === "resolved" ? (
        <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{target.targetId}</p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {/* `projectReport` ends with `readTargetId(report) ?? ""`, so a target whose row has
              gone leaves the id blank rather than null. Nothing can be restored without one. */}
          The reported item no longer resolves, so it cannot be restored from here.
        </p>
      )}

      {report.detailText !== null && (
        <p className="mt-2 text-sm leading-5 text-foreground">{report.detailText}</p>
      )}

      {report.resolvedAt !== null && (
        <p className="mt-2 text-xs text-muted-foreground">
          {/* The decision NOTE is written to the row and never projected back, so a resolved
              report can say when but never why. Stating the time is honest; inventing the
              reason is not. */}
          Decided {formatIsoInstantLabel(report.resolvedAt)}.
        </p>
      )}

      {report.status === "open" && (
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-muted-foreground">
            Note (optional)
            <textarea
              value={decisionNote}
              maxLength={2000}
              rows={2}
              onChange={(changeEvent) => setDecisionNote(changeEvent.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleDecideClick("actioned")}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isOrganizationReport ? "Uphold the report" : "Uphold and hide"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleDecideClick("dismissed")}
              className={QUIET_BUTTON_CLASS}
            >
              Dismiss
            </button>
          </div>
          {isOrganizationReport && (
            <p className="text-xs text-muted-foreground">
              Upholding this records the decision. It does not change the company page — that lever
              is on the organization surface.
            </p>
          )}
          {report.targetKind === "product" && (
            <p className="text-xs text-muted-foreground">
              {/* Not a warning about a bug — the backend really does set `approved`, and a
                  moderator dismissing a report against an unpublished listing is publishing it. */}
              Dismissing approves this listing, including one that was still a draft or awaiting
              review.
            </p>
          )}
        </div>
      )}

      {/*
        RESTORE IS OFFERED ON `actioned` AND NOWHERE ELSE, and the reasoning is worth keeping.
        Nothing in this payload says whether the target is currently hidden — there is no
        visibility field — so `actioned` is the closest honest proxy: that status is proof a hide
        was performed. It is NOT offered on `dismissed`, because a dismissal already un-hides;
        restoring there would write a permanent record of an un-hide that never happened.
      */}
      {report.status === "actioned" && target.kind === "resolved" && !isOrganizationReport && (
        <div className="mt-3 space-y-2 border-t border-[#CAC4D0]/60 pt-3">
          <label className="block text-xs text-muted-foreground">
            Reason for putting this back (required)
            <textarea
              value={restoreReason}
              maxLength={2000}
              rows={2}
              onChange={(changeEvent) => setRestoreReason(changeEvent.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <button
            type="button"
            // Disabled until the box has something in it. Un-hiding reverses a call somebody
            // already made, and a retraction nobody had to justify is one nobody can review.
            disabled={isBusy || restoreReason.trim() === ""}
            onClick={handleRestoreClick}
            className={QUIET_BUTTON_CLASS}
          >
            {rowState.status === "restoring" ? "Restoring…" : "Restore this content"}
          </button>
        </div>
      )}

      {rowState.status === "refused" && (
        <output role="alert" className="mt-2 block text-xs text-red-700">
          {rowState.message}
        </output>
      )}
    </article>
  );
}
