"use client";

// TRANSPORT: client-query — `GET /videos/admin/review`, plus approve and reject.
//
// WAS A VIEW OVER THE CREATOR'S OWN MOCK STORE. It read `useStudioVideos()` — the same
// in-memory array My Videos read — and "approved" by mutating a local status field, so a
// moderator and a creator in two tabs saw different truths and neither was the database.
//
// TWO CONSEQUENCES OF WIRING IT:
//
//   1. THE TAB COUNTS COME FROM `pagination.total`, one query per tab. The mock counted by
//      filtering a client array it happened to hold all of; a real queue is paginated and the
//      count of pending items is not the count of rows on screen.
//   2. APPROVAL IS NOT ALWAYS "PUBLISHED". An episode with a future premiere date comes back
//      `publishStatus: "scheduled"`, and the confirmation says so.

import Image from "next/image";
import { useState } from "react";

import EpisodeReviewDetail from "@/components/admin/review/episode-review-detail";
import RelativeTime from "@/components/home/shared/relative-time";
import {
  useApproveReviewedVideoMutation,
  useRejectReviewedVideoMutation,
  useReviewQueueQuery,
} from "@/hooks/admin-review";
import { MOCK_CURRENT_STAFF_MEMBER } from "@/lib/admin-staff";
import { ApiRequestError, isForbidden } from "@/lib/http";
import type { ReviewQueueRow as ReviewQueueRowData } from "@/lib/videos/admin-review.api";
import type { ContentReviewStatus } from "@/lib/videos/schemas";
import { useAdminAuditLog } from "@/state/admin-audit-log-context";

type ReviewPageView = { kind: "queue-list" } | { kind: "episode-detail"; videoId: string };

const REVIEW_TABS: { readonly status: ContentReviewStatus; readonly label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

const QUEUE_PAGE_LIMIT = 50;

export default function ReviewQueuePage() {
  const [activeStatus, setActiveStatus] = useState<ContentReviewStatus>("pending");
  const [reviewPageView, setReviewPageView] = useState<ReviewPageView>({ kind: "queue-list" });
  const [decisionErrorMessage, setDecisionErrorMessage] = useState<string | null>(null);

  const queueQuery = useReviewQueueQuery({ status: activeStatus, limit: QUEUE_PAGE_LIMIT });
  const approveMutation = useApproveReviewedVideoMutation();
  const rejectMutation = useRejectReviewedVideoMutation();
  const { appendAuditLogEntry } = useAdminAuditLog();

  const rows = queueQuery.data?.rows ?? [];

  function recordReviewDecision(row: ReviewQueueRowData, actionLabel: string, detailNote: string) {
    appendAuditLogEntry({
      id: crypto.randomUUID(),
      actorName: MOCK_CURRENT_STAFF_MEMBER.fullName,
      actorRole: MOCK_CURRENT_STAFF_MEMBER.role,
      actionLabel,
      targetLabel: buildReviewTargetLabel(row),
      detailNote,
      occurredAtLabel: "Just now",
    });
  }

  async function handleApproveEpisode(row: ReviewQueueRowData) {
    setDecisionErrorMessage(null);
    try {
      const decision = await approveMutation.mutateAsync(row.videoId);
      recordReviewDecision(
        row,
        "Approved episode",
        // The server decides published vs scheduled; the audit line records what it did, not
        // what we assumed it would do.
        decision.publishStatus === "scheduled" ? "Scheduled for its premiere date" : "Published",
      );
      setReviewPageView({ kind: "queue-list" });
    } catch (error) {
      setDecisionErrorMessage(describeDecisionError(error));
    }
  }

  async function handleRejectEpisode(row: ReviewQueueRowData, rejectionReason: string) {
    setDecisionErrorMessage(null);
    try {
      await rejectMutation.mutateAsync({ videoId: row.videoId, reason: rejectionReason });
      recordReviewDecision(row, "Rejected episode", rejectionReason);
      setReviewPageView({ kind: "queue-list" });
    } catch (error) {
      setDecisionErrorMessage(describeDecisionError(error));
    }
  }

  if (reviewPageView.kind === "episode-detail") {
    const rowBeingReviewed = rows.find((row) => row.videoId === reviewPageView.videoId);
    // A stale id — the row moved tabs under us — falls back to the queue list.
    if (rowBeingReviewed !== undefined) {
      return (
        <EpisodeReviewDetail
          video={rowBeingReviewed}
          isDecisionPending={approveMutation.isPending || rejectMutation.isPending}
          decisionErrorMessage={decisionErrorMessage}
          onBackToQueueClick={() => setReviewPageView({ kind: "queue-list" })}
          onApprove={() => void handleApproveEpisode(rowBeingReviewed)}
          onRejectWithReason={(rejectionReason) =>
            void handleRejectEpisode(rowBeingReviewed, rejectionReason)
          }
        />
      );
    }
  }

  const isRefusedForCapability =
    queueQuery.error instanceof ApiRequestError && isForbidden(queueQuery.error.apiError);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Content review</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anime episodes land here on submit and stay hidden until approved. Approved episodes
        auto-publish on their release date.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {REVIEW_TABS.map((tabConfig) => (
          <ReviewTabButton
            key={tabConfig.status}
            status={tabConfig.status}
            label={tabConfig.label}
            isActive={activeStatus === tabConfig.status}
            onClick={() => setActiveStatus(tabConfig.status)}
          />
        ))}
      </div>

      {isRefusedForCapability ? (
        // A moderator who has lost the capability must SEE that, not an empty queue that reads
        // as "nothing to review".
        <p className="mt-6 text-sm text-destructive">
          Your account does not have the content-moderation capability.
        </p>
      ) : queueQuery.isPending ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading the queue…</p>
      ) : queueQuery.error !== null ? (
        <p className="mt-6 text-sm text-destructive">Couldn&rsquo;t load the review queue.</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">Nothing here</p>
          <p className="text-sm text-muted-foreground">
            No {activeStatus} videos in the queue right now.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((row) => (
            <ReviewQueueRow
              key={row.videoId}
              row={row}
              onRowClick={() => setReviewPageView({ kind: "episode-detail", videoId: row.videoId })}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One tab, with its own count.
 *
 * A SEPARATE QUERY PER TAB, on purpose: the count is `pagination.total`, which is the size of
 * the whole queue for that status, not the number of rows this page happens to have fetched.
 * Three small reads beat one wrong number.
 */
function ReviewTabButton({
  status,
  label,
  isActive,
  onClick,
}: {
  readonly status: ContentReviewStatus;
  readonly label: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}) {
  const countQuery = useReviewQueueQuery({ status, limit: 1 });
  const total = countQuery.data?.pagination.total;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {total === undefined ? label : `${label} (${total})`}
    </button>
  );
}

function describeDecisionError(error: unknown): string {
  if (error instanceof ApiRequestError) return error.apiError.message;
  return "Couldn't record that decision. Please try again.";
}

/** "Stellar Drift · Season 1 · Ep 3" for anime episodes; plain title otherwise. */
export function buildReviewTargetLabel(row: ReviewQueueRowData): string {
  if (row.seriesTitle === null) return row.title;
  const seasonPart = row.seasonLabel === null ? "" : ` · ${row.seasonLabel}`;
  const episodePart = row.episodeNumber === null ? "" : ` · Ep ${row.episodeNumber}`;
  return `${row.seriesTitle}${seasonPart}${episodePart}`;
}

function ReviewQueueRow({
  row,
  onRowClick,
}: {
  readonly row: ReviewQueueRowData;
  readonly onRowClick: () => void;
}) {
  const isAnimeEpisode = row.seriesTitle !== null;

  return (
    <li>
      <button
        type="button"
        onClick={onRowClick}
        className="flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border px-4 py-3 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="flex aspect-video w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
          {row.thumbnailUrl === null ? (
            <Image
              src={
                isAnimeEpisode
                  ? "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  : "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              }
              alt=""
              width={24}
              height={24}
            />
          ) : (
            <Image
              src={row.thumbnailUrl}
              alt=""
              width={112}
              height={63}
              className="size-full object-cover"
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
          {isAnimeEpisode && (
            <p className="truncate text-xs text-muted-foreground">{buildReviewTargetLabel(row)}</p>
          )}
          {row.rejectionReason !== null && (
            <p className="mt-1 text-xs text-destructive">Reason: {row.rejectionReason}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
          <span className="max-w-40 truncate">{row.creatorName}</span>
          <RelativeTime isoInstant={row.submittedAt} className="w-24 text-right" />
        </div>
      </button>
    </li>
  );
}
