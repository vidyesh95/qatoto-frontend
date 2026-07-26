"use client";

import { useState } from "react";

import { formatIsoInstant } from "@/components/home/research-and-development/sections/compensation-format";
import { IMMORTAL_PAPER_CATEGORY_LABELS } from "@/mocks/project-immortal-mocks";
import type {
  ImmortalPaperModerationEntry,
  ImmortalPaperModerationStatus,
} from "@/types/research-and-development";

const MODERATION_STATUS_BADGES: Record<
  ImmortalPaperModerationStatus,
  { label: string; className: string }
> = {
  queued: { label: "Awaiting review", className: "bg-blue-100 text-blue-800" },
  approved: { label: "Approved", className: "bg-[#00696E]/10 text-[#00696E]" },
  needs_changes: { label: "Changes requested", className: "bg-amber-100 text-amber-800" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
};

const REVIEW_ACTIONS: { status: ImmortalPaperModerationStatus; label: string }[] = [
  { status: "approved", label: "Approve" },
  { status: "needs_changes", label: "Request changes" },
  { status: "rejected", label: "Reject" },
];

// Formal-track moderation queue (§14.6). The formal library claims citations
// and proofs; something has to check that claim before the program's name goes
// on a paper. A rejection here is not a ban — the informal track exists exactly
// so an unproven idea still has somewhere to live. Local state only this phase.
export default function PaperModerationQueue({
  entries,
}: {
  entries: ImmortalPaperModerationEntry[];
}) {
  const [localStatusById, setLocalStatusById] = useState<
    Record<string, ImmortalPaperModerationStatus>
  >({});

  const resolveStatus = (entry: ImmortalPaperModerationEntry) =>
    localStatusById[entry.id] ?? entry.status;

  const queuedCount = entries.filter((entry) => resolveStatus(entry) === "queued").length;

  return (
    <div className="space-y-3 px-4 lg:px-6">
      <p className="text-xs text-muted-foreground">
        {queuedCount === 0
          ? "Nothing is waiting on a reviewer."
          : `${queuedCount} paper${queuedCount === 1 ? "" : "s"} waiting on a reviewer.`}{" "}
        The informal track has no queue — it claims nothing, so there is nothing to check.
      </p>

      <ul className="space-y-3">
        {entries.map((entry) => {
          const resolvedStatus = resolveStatus(entry);
          const statusBadge = MODERATION_STATUS_BADGES[resolvedStatus];
          const isAwaitingReview = resolvedStatus === "queued";

          return (
            <li key={entry.id} className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-medium">{entry.paperTitle}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {entry.authorName} · {entry.authorAffiliation} ·{" "}
                {IMMORTAL_PAPER_CATEGORY_LABELS[entry.category]} · submitted{" "}
                {formatIsoInstant(entry.submittedAt)}
              </p>

              {entry.flagReasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.flagReasons.map((flagReason) => (
                    <span
                      key={flagReason}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                    >
                      {flagReason}
                    </span>
                  ))}
                </div>
              )}

              {entry.reviewerNote && (
                <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                  {entry.reviewerName ?? "A reviewer"}
                  {entry.reviewedAt ? ` · ${formatIsoInstant(entry.reviewedAt)}` : ""} —{" "}
                  {entry.reviewerNote}
                </p>
              )}

              {isAwaitingReview && (
                <div className="flex flex-wrap gap-2">
                  {REVIEW_ACTIONS.map((reviewAction) => (
                    <button
                      key={reviewAction.status}
                      type="button"
                      onClick={() =>
                        setLocalStatusById((currentStatuses) => ({
                          ...currentStatuses,
                          [entry.id]: reviewAction.status,
                        }))
                      }
                      className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      {reviewAction.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Moderation decisions live in this session only — the queue and its notifications are
        backend-owned later.
      </p>
    </div>
  );
}
