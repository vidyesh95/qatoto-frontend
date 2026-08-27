"use client";

// TRANSPORT: client-query — `GET/POST /users/admin/*`, behind `moderate_content`.
//
// `restricted` IS A VIEW STATE AND IT WINS OVER `loading`, the ordering `video-report-queue-page`
// established: "nothing to show because you may not look" is a different answer from "nothing to
// show", and a disabled React Query sits in `pending` forever — so checking `isPending` first would
// spin permanently for anyone without the capability.
//
// ## WHAT UPHOLDING DOES HERE, AND WHAT IT DELIBERATELY DOES NOT
//
// It hides the subject's DESCRIPTION AND LINKS. Not their name, not their avatar, not one video,
// and not their ability to sign in. There is no account-level suspension behind this queue and the
// copy must never imply one — a moderator reading "hidden" should know exactly how much was hidden.
//
// `openReportCount` IS CONTEXT, NEVER A THRESHOLD. Nothing hides a profile because that number
// crossed a line; every hide names a human. Rendering it as a score would make brigading measurable
// and then effective.

import { useState } from "react";

import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useDecideUserReportMutation,
  useRestoreProfileTextMutation,
  useUserReportQueueQuery,
} from "@/hooks/users/user-reports";
import { newIdempotencyKey } from "@/lib/idempotency";
import {
  USER_REPORT_REASON_LABELS,
  type UserReportQueueItem,
  type UserReportStatus,
} from "@/lib/users/user-reports.schemas";

type QueueViewState =
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly rows: readonly UserReportQueueItem[] };

const STATUS_FILTERS: readonly UserReportStatus[] = ["open", "actioned", "dismissed"];

export default function ProfileReportQueuePage() {
  const [statusFilter, setStatusFilter] = useState<UserReportStatus>("open");
  const [noteByReportId, setNoteByReportId] = useState<Record<string, string>>({});

  const staffContextQuery = useOwnStaffContextQuery();
  const canModerateContent =
    staffContextQuery.data?.capabilities.includes("moderate_content") ?? false;

  const reportQueueQuery = useUserReportQueueQuery({ status: statusFilter }, canModerateContent);
  const decideReportMutation = useDecideUserReportMutation();
  const restoreProfileTextMutation = useRestoreProfileTextMutation();

  // `canModerateContent` first — see the header.
  const viewState: QueueViewState = !canModerateContent
    ? { status: "restricted" }
    : reportQueueQuery.isPending
      ? { status: "loading" }
      : reportQueueQuery.data === undefined || !reportQueueQuery.data.success
        ? {
            status: "error",
            message:
              reportQueueQuery.data?.success === false
                ? reportQueueQuery.data.error.message
                : "The queue could not be loaded.",
          }
        : reportQueueQuery.data.data.rows.length === 0
          ? { status: "empty" }
          : { status: "ready", rows: reportQueueQuery.data.data.rows };

  function handleDecide(reportId: string, decision: "actioned" | "dismissed") {
    const note = noteByReportId[reportId]?.trim() ?? "";
    decideReportMutation.mutate({
      reportId,
      input: { decision, ...(note === "" ? {} : { note }) },
      // Minted per press: each decision appends a hash-chained audit entry, and a retry carrying a
      // fresh key would make the chain claim two decisions were taken.
      idempotencyKey: newIdempotencyKey(),
    });
  }

  function handleRestore(reportedUserId: string, reportId: string) {
    const note = noteByReportId[reportId]?.trim() ?? "";
    if (note === "") return;
    restoreProfileTextMutation.mutate({
      input: { reportedUserId, reasonNote: note },
      idempotencyKey: newIdempotencyKey(),
    });
  }

  return (
    <div className="p-6">
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Profile reports</h1>
        <p className="text-xs text-muted-foreground">
          Reports about a person&apos;s channel description and links. Upholding one hides that text
          — it does not hide their videos, their name or their account.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 pb-4">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === status
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground outline -outline-offset-1 outline-border"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {viewState.status === "restricted" && (
        <p className="text-sm text-muted-foreground">
          You do not hold the capability that opens this queue.
        </p>
      )}
      {viewState.status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
      {viewState.status === "error" && (
        <p className="text-sm text-muted-foreground">{viewState.message}</p>
      )}
      {viewState.status === "empty" && (
        <p className="text-sm text-muted-foreground">Nothing in this queue.</p>
      )}

      {viewState.status === "ready" && (
        <ul className="space-y-4">
          {viewState.rows.map((report) => (
            <li key={report.reportId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {report.subject.name}
                  {report.subject.handle !== null && (
                    <span className="text-muted-foreground"> @{report.subject.handle}</span>
                  )}
                </p>
                <span className="text-xs text-muted-foreground">
                  {USER_REPORT_REASON_LABELS[report.reason]}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-muted-foreground">
                {/* Context, not a score. See the header. */}
                {report.openReportCount} open report(s) about this person ·{" "}
                {report.subject.profileModerationState === "hidden_by_moderator"
                  ? "profile text is hidden"
                  : "profile text is visible"}
              </p>

              {report.detailText !== null && (
                <p className="mt-2 text-sm whitespace-pre-line text-foreground">
                  {report.detailText}
                </p>
              )}

              <div className="mt-2 rounded-lg bg-muted px-3 py-2">
                <p className="text-[11px] font-medium text-foreground">The reported description</p>
                <p className="text-xs whitespace-pre-line text-foreground">
                  {report.subject.bio ?? "No description set."}
                </p>
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-medium text-muted-foreground">
                  Note (required to restore)
                </span>
                <textarea
                  value={noteByReportId[report.reportId] ?? ""}
                  onChange={(changeEvent) =>
                    setNoteByReportId((existing) => ({
                      ...existing,
                      [report.reportId]: changeEvent.target.value,
                    }))
                  }
                  rows={2}
                  maxLength={2000}
                  className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
              </label>

              {report.status === "open" && (
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={decideReportMutation.isPending}
                    onClick={() => handleDecide(report.reportId, "actioned")}
                    className="cursor-pointer rounded-full bg-destructive px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Hide the profile text
                  </button>
                  <button
                    type="button"
                    disabled={decideReportMutation.isPending}
                    onClick={() => handleDecide(report.reportId, "dismissed")}
                    className="cursor-pointer text-sm font-medium text-foreground underline disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {report.subject.profileModerationState === "hidden_by_moderator" && (
                <div className="mt-2">
                  {/* Restoring overturns another moderator's decision, so the note is mandatory —
                      the button stays disabled until there is one. */}
                  <button
                    type="button"
                    disabled={
                      restoreProfileTextMutation.isPending ||
                      (noteByReportId[report.reportId]?.trim() ?? "") === ""
                    }
                    onClick={() => handleRestore(report.subject.userId, report.reportId)}
                    className="cursor-pointer text-sm font-medium text-primary underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Restore this profile text
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
