"use client";

// TRANSPORT: client-query — `GET/POST /videos/admin/content-reports*`, `moderate_content`.
//
// `restricted` IS A VIEW STATE AND IT WINS OVER `loading`. "Nothing to show because you may
// not look" is a different answer from "nothing to show", and a disabled React Query sits in
// `pending` forever — so a page that checks `isPending` first renders a spinner that never
// resolves for anyone without the capability. `community-moderation-page.tsx` established
// both the union and that ordering.
//
// THERE IS NO AUTOMATIC HIDE ON THIS SURFACE, which is what makes this queue different from
// the commerce one it is modelled on. Commerce takes a review down at three reporters and a
// moderator's dismissal has to un-hide it. Here nothing is hidden until someone on this page
// decides it, and dismissing a report un-hides nothing — restoring is its own control, below.

import { useState } from "react";

import { describeEngagementError } from "@/hooks/feed/mutations";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  useDecideVideoReportMutation,
  useRestoreVideoMutation,
  useVideoReportQueueQuery,
} from "@/hooks/videos/content-reports";
import {
  VIDEO_REPORT_REASON_LABELS,
  type VideoReportStatus,
} from "@/lib/videos/content-reports.api";
import type { VideoReportQueueRow } from "@/lib/videos/admin-content-reports.api";

type QueueViewState =
  | { readonly status: "restricted" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly rows: readonly VideoReportQueueRow[] };

const STATUS_FILTERS: readonly VideoReportStatus[] = ["open", "actioned", "dismissed"];

export default function VideoReportQueuePage() {
  const [statusFilter, setStatusFilter] = useState<VideoReportStatus>("open");

  const staffContextQuery = useOwnStaffContextQuery();
  const canModerateContent =
    staffContextQuery.data?.capabilities.includes("moderate_content") ?? false;

  const reportQueueQuery = useVideoReportQueueQuery({ status: statusFilter }, canModerateContent);

  // `isEnabled` first — see the header.
  const viewState: QueueViewState = !canModerateContent
    ? { status: "restricted" }
    : reportQueueQuery.isPending
      ? { status: "loading" }
      : reportQueueQuery.isError
        ? { status: "error", message: reportQueueQuery.error.apiError.message }
        : reportQueueQuery.data.data.length === 0
          ? { status: "empty" }
          : { status: "ready", rows: reportQueueQuery.data.data };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Video reports</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Videos that viewers have flagged. Nothing here is hidden automatically — a video comes
          down only when someone on this page decides it should, because taking one down is an
          action against a creator&apos;s livelihood.
        </p>
      </header>

      {/* Three distinct cases, said apart: failing to CHECK a permission is not the same as
          failing it, and neither is the same as holding it. */}
      {staffContextQuery.isError && (
        <output className="block rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Couldn&apos;t check your permissions, so nothing here is loaded.
        </output>
      )}
      {staffContextQuery.isSuccess && !canModerateContent && (
        <output className="block rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Reviewing video reports needs the `moderate_content` capability. Your role is{" "}
          {staffContextQuery.data.platformRole ?? "none"}, so this queue is not loaded.
        </output>
      )}

      <div className="flex flex-row gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={statusFilter === status}
            onClick={() => setStatusFilter(status)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm capitalize ${
              statusFilter === status
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {renderQueue(viewState)}
    </div>
  );
}

function renderQueue(viewState: QueueViewState) {
  switch (viewState.status) {
    case "restricted":
      // Rendered as nothing, because the banner above already said why. A second empty-state
      // panel here would read as "no reports" to someone who simply may not look.
      return null;
    case "loading":
      return <p className="text-sm text-muted-foreground">Loading reports…</p>;
    case "error":
      return (
        <output className="block rounded-2xl border border-border bg-muted/40 p-3 text-sm text-red-700">
          {viewState.message}
        </output>
      );
    case "empty":
      return <p className="text-sm text-muted-foreground">Nothing in this queue.</p>;
    case "ready":
      return (
        <ul className="space-y-3">
          {viewState.rows.map((report) => (
            <li key={report.id}>
              <VideoReportCard report={report} />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

/**
 * One report, with the two decisions and — when the video is already hidden — the restore.
 *
 * THE NOTE IS PER-CARD STATE, not page state: two reports open at once must not share one
 * textarea, and a note typed for one decision must not survive onto the next card.
 */
function VideoReportCard({ report }: { readonly report: VideoReportQueueRow }) {
  const [note, setNote] = useState("");
  const decideMutation = useDecideVideoReportMutation();
  const restoreMutation = useRestoreVideoMutation();

  const isHidden = report.moderationVisibilityState === "hidden_by_moderator";
  const isBusy = decideMutation.isPending || restoreMutation.isPending;
  const failure = decideMutation.error ?? restoreMutation.error ?? null;

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={`/watch?v=${encodeURIComponent(report.videoId)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-foreground hover:underline"
          >
            {report.videoTitle ?? report.videoId}
          </a>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {report.creatorName ?? "Unknown creator"} · {VIDEO_REPORT_REASON_LABELS[report.reason]}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isHidden && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] text-background">
              Hidden
            </span>
          )}
          {/*
            Volume, NOT a threshold. Nothing acts on this number — it is here because "the
            fourth person to flag it" changes how a borderline case reads, and a reviewer
            with no sense of volume decides each report as if it were the only one.
          */}
          {report.openReportCount > 1 && (
            <span className="text-[11px] text-muted-foreground">
              {report.openReportCount} open reports
            </span>
          )}
        </div>
      </div>

      {report.detailText !== null && (
        <p className="mt-2 border-l-2 border-border pl-2 text-xs text-muted-foreground">
          {report.detailText}
        </p>
      )}

      {report.status === "open" ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Why? (recorded in the audit log)"
            className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex flex-row gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                decideMutation.mutate({
                  reportId: report.id,
                  decision: "actioned",
                  ...(note.trim() === "" ? {} : { note: note.trim() }),
                })
              }
              className="cursor-pointer rounded-full bg-foreground px-3 py-1 text-sm text-background disabled:opacity-40"
            >
              Hide video
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                decideMutation.mutate({
                  reportId: report.id,
                  decision: "dismissed",
                  ...(note.trim() === "" ? {} : { note: note.trim() }),
                })
              }
              className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40"
            >
              Dismiss
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Hiding closes every open report on this video, not just this one.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            {report.status === "actioned" ? "Actioned" : "Dismissed"}
            {report.resolutionNote === null ? "" : ` — ${report.resolutionNote}`}
          </p>
          {/*
            RESTORE IS ONLY REACHABLE FROM A DECIDED REPORT, and that is exactly the state it
            exists for: the video is hidden, every report on it is closed, and there is
            nothing left to dismiss. Without this control it stays hidden forever.
          */}
          {isHidden && (
            <div className="space-y-2">
              <textarea
                value={note}
                onChange={(changeEvent) => setNote(changeEvent.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Why is this being restored? (required)"
                className="w-full resize-none rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                // REQUIRED, unlike a decision note: an un-hide with no stated reason is not a
                // record, and the backend refuses it anyway.
                disabled={isBusy || note.trim() === ""}
                onClick={() =>
                  restoreMutation.mutate({ videoId: report.videoId, reasonNote: note.trim() })
                }
                className="cursor-pointer rounded-full border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Restore video
              </button>
            </div>
          )}
        </div>
      )}

      {/*
        `describeEngagementError` rather than reading `.apiError` directly: a mutation's error
        is typed `Error`, and only that helper knows how to get the backend's own message out
        of one — which matters here, because a 403 on this surface says something specific
        ("you cannot decide a report about your own video") that a generic apology would lose.
      */}
      {failure !== null && (
        <output className="mt-2 block text-xs text-red-700">
          {describeEngagementError(failure).message}
        </output>
      )}
    </div>
  );
}
