"use client";

// TRANSPORT: props-only — the row and the decision handlers come from `review-queue-page.tsx`.
//
// THE PLAYER IS REAL NOW. It used to show a placeholder MP4 because `StudioVideo` carried only
// a `fileName`; the queue row carries `youtubeVideoId`, so a reviewer watches THE ACTUAL VIDEO
// they are approving. That is not a nicety — approving content you have not seen is the one
// thing this screen exists to prevent.

import { useState } from "react";

import RejectReasonModal from "@/components/admin/review/reject-reason-modal";
import RelativeTime from "@/components/home/shared/relative-time";
import VideoPlayer from "@/components/home/watch/video-player";
import type { ReviewQueueRow } from "@/lib/videos/admin-review.api";
import type { ContentReviewStatus } from "@/lib/videos/schemas";

type EpisodeReviewDetailProps = {
  video: ReviewQueueRow;
  isDecisionPending: boolean;
  decisionErrorMessage: string | null;
  onBackToQueueClick: () => void;
  onApprove: () => void;
  onRejectWithReason: (rejectionReason: string) => void;
};

/**
 * The reviewer's whole job: watch the video, read the metadata beside it, decide.
 *
 * Approve / Reject show only while the row is `pending` — a decided item is read-only, because
 * the backend has no re-decide route and offering one would be a button that 409s.
 */
export default function EpisodeReviewDetail({
  video,
  isDecisionPending,
  decisionErrorMessage,
  onBackToQueueClick,
  onApprove,
  onRejectWithReason,
}: EpisodeReviewDetailProps) {
  const [isRejectReasonModalOpen, setIsRejectReasonModalOpen] = useState(false);

  const isAnimeEpisode = video.seriesTitle !== null;

  return (
    <div>
      <button
        type="button"
        onClick={onBackToQueueClick}
        className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to queue
      </button>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {video.youtubeVideoId === null ? (
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-secondary">
              <p className="px-6 text-center text-sm text-muted-foreground">
                This video has no playable source yet. Do not approve what you cannot watch.
              </p>
            </div>
          ) : (
            <VideoPlayer
              videoSource="youtube"
              youtubeVideoId={video.youtubeVideoId}
              label={video.title}
            />
          )}
          <h1 className="mt-4 text-xl font-semibold text-foreground">{video.title}</h1>
          {/*
            RESTORED. The description sat beside the player in the mock and was dropped when this
            screen was wired, because the queue projection did not select it. A reviewer comparing
            a claim against a video needs the claim.
          */}
          {video.description !== null && video.description !== "" && (
            <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {video.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">Review decision</h2>
            <div className="mt-3 flex items-center gap-2">
              <ReviewStatusBadge reviewStatus={video.reviewStatus} />
            </div>
            {video.rejectionReason !== null && (
              <p className="mt-2 text-xs text-destructive">Reason: {video.rejectionReason}</p>
            )}
            {video.reviewStatus === "pending" && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={isDecisionPending}
                  className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isDecisionPending ? "Working…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejectReasonModalOpen(true)}
                  disabled={isDecisionPending}
                  className="cursor-pointer rounded-full border border-destructive px-5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                >
                  Reject…
                </button>
              </div>
            )}
            {decisionErrorMessage !== null && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {decisionErrorMessage}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {isAnimeEpisode ? "Episode details" : "Video details"}
            </h2>
            <dl className="mt-3 flex flex-col gap-2">
              {isAnimeEpisode && (
                <>
                  <MetadataRow label="Series" value={video.seriesTitle} />
                  <MetadataRow label="Season" value={video.seasonLabel} />
                  <MetadataRow
                    label="Episode"
                    value={
                      video.episodeNumber === null
                        ? null
                        : `Ep ${video.episodeNumber}${
                            video.episodeTitle === null ? "" : ` — ${video.episodeTitle}`
                          }`
                    }
                  />
                  <MetadataRow
                    label="Premiere date"
                    value={video.premiereDate?.slice(0, 10) ?? null}
                  />
                  <MetadataRow
                    label="Release schedule"
                    value={joinPresent(
                      [video.releaseScheduleDay, video.releaseScheduleTime],
                      " · ",
                    )}
                  />
                  <MetadataRow
                    label="Audio"
                    value={joinPresent([video.audioMode, video.audioLanguage], " · ")}
                  />
                  <MetadataRow label="Age rating" value={video.ageRating} />
                  <MetadataRow
                    label="Genres"
                    value={joinPresent(video.seriesGenreTags ?? [], ", ")}
                  />
                </>
              )}
              {/*
                THE REAL CREATOR, joined into the queue projection server-side.
                This briefly showed a raw UUID, and before that a hardcoded mock name identical
                for every submission. `GET /users/:id` was NOT the fix: it is public,
                unauthenticated, and returns an email rather than a name — resolving a reviewer's
                view through it would have both failed to answer the question and exposed personal
                email addresses through an open route.
              */}
              <MetadataRow
                label="Creator"
                value={
                  video.creatorHandle === null
                    ? video.creatorName
                    : `${video.creatorName} (@${video.creatorHandle})`
                }
              />
              <div className="flex items-baseline justify-between gap-4">
                <dt className="shrink-0 text-xs text-muted-foreground">Submitted</dt>
                <dd className="text-right text-xs font-medium text-foreground">
                  <RelativeTime isoInstant={video.submittedAt} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {isRejectReasonModalOpen && (
        <RejectReasonModal
          episodeTitle={video.title}
          onSubmitRejection={(rejectionReason) => {
            setIsRejectReasonModalOpen(false);
            onRejectWithReason(rejectionReason);
          }}
          onCancel={() => setIsRejectReasonModalOpen(false)}
        />
      )}
    </div>
  );
}

/** Joins the parts that are actually present, or null when none are. Keeps a row from reading " · ". */
function joinPresent(parts: readonly (string | null)[], separator: string): string | null {
  const present = parts.filter((part) => part !== null && part !== "");
  return present.length > 0 ? present.join(separator) : null;
}

/** A null value renders nothing rather than an empty row — absence is not a blank string. */
function MetadataRow({ label, value }: { label: string; value: string | null }) {
  if (value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

// Same pill styling as the creator-side StatusBadge in videos-list.tsx; the switch stays
// exhaustive so a new review status becomes a compile error.
function ReviewStatusBadge({ reviewStatus }: { reviewStatus: ContentReviewStatus }) {
  switch (reviewStatus) {
    case "pending":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Pending review
        </span>
      );
    case "approved":
      return (
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Approved
        </span>
      );
    case "rejected":
      return (
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          Rejected
        </span>
      );
    case "not_required":
      return (
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          Not in review
        </span>
      );
    default: {
      const exhaustiveCheck: never = reviewStatus;
      return exhaustiveCheck;
    }
  }
}
