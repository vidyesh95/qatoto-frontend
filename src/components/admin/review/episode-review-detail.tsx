"use client";

import { useState } from "react";
import { MOCK_CREATOR_NAME } from "@/lib/admin-staff";
import { StudioVideo } from "@/state/studio-videos-context";
import VideoPlayer from "@/components/home/watch/video-player";
import RejectReasonModal from "@/components/admin/review/reject-reason-modal";

// StudioVideo carries no playable source yet (only fileName) — the review
// player uses the same placeholder clip src/lib/videos.ts ships until real
// uploads exist.
const REVIEW_PLACEHOLDER_VIDEO_SRC = "/dummy/video/Sintel_1080_10s_1MB.mp4";

type EpisodeReviewDetailProps = {
  video: StudioVideo;
  onBackToQueueClick: () => void;
  onApprove: () => void;
  onRejectWithReason: (rejectionReason: string) => void;
};

// The reviewer's whole job: watch the video, read the metadata beside it,
// decide. Approve / Reject only show while the video is pending — decided
// items are read-only in the mock phase (no re-decide flow).
export default function EpisodeReviewDetail({
  video,
  onBackToQueueClick,
  onApprove,
  onRejectWithReason,
}: EpisodeReviewDetailProps) {
  const [isRejectReasonModalOpen, setIsRejectReasonModalOpen] = useState(false);

  const episodeDetails = video.animeEpisodeDetails;

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
          <VideoPlayer src={REVIEW_PLACEHOLDER_VIDEO_SRC} label={video.title} />
          <h1 className="mt-4 text-xl font-semibold text-foreground">{video.title}</h1>
          {video.description !== "" && (
            <p className="mt-2 text-sm text-muted-foreground">{video.description}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">Review decision</h2>
            <div className="mt-3 flex items-center gap-2">
              <ReviewStatusBadge video={video} />
            </div>
            {video.status.kind === "rejected" && (
              <p className="mt-2 text-xs text-destructive">
                Reason: {video.status.rejectionReason}
              </p>
            )}
            {video.status.kind === "pending-review" && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejectReasonModalOpen(true)}
                  className="cursor-pointer rounded-full border border-destructive px-5 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Reject…
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">
              {episodeDetails ? "Episode details" : "Video details"}
            </h2>
            <dl className="mt-3 flex flex-col gap-2">
              {episodeDetails && (
                <>
                  <MetadataRow label="Series" value={episodeDetails.seriesName} />
                  <MetadataRow label="Season" value={episodeDetails.seasonLabel} />
                  <MetadataRow
                    label="Episode"
                    value={`Ep ${episodeDetails.episodeNumber} — ${episodeDetails.episodeTitle}`}
                  />
                  <MetadataRow label="Premiere date" value={episodeDetails.premiereDate} />
                  <MetadataRow
                    label="Release schedule"
                    value={`${episodeDetails.releaseScheduleDay} · ${episodeDetails.releaseScheduleTime}`}
                  />
                  <MetadataRow
                    label="Audio"
                    value={`${episodeDetails.audioMode} · ${episodeDetails.audioLanguage}`}
                  />
                  <MetadataRow label="Age rating" value={episodeDetails.ageRating} />
                  {episodeDetails.genreTags.length > 0 && (
                    <MetadataRow label="Genres" value={episodeDetails.genreTags.join(", ")} />
                  )}
                </>
              )}
              <MetadataRow label="Creator" value={MOCK_CREATOR_NAME} />
              <MetadataRow label="File" value={video.fileName} />
              <MetadataRow label="File size" value={formatFileSizeLabel(video.fileSizeInBytes)} />
              <MetadataRow label="Submitted" value={video.uploadedAtLabel} />
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

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-xs font-medium text-foreground capitalize">{value}</dd>
    </div>
  );
}

function formatFileSizeLabel(fileSizeInBytes: number): string {
  const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
  return `${fileSizeInMegabytes.toFixed(1)} MB`;
}

// Same pill styling as the creator-side StatusBadge in videos-list.tsx; the
// switch stays exhaustive so new status variants become compile errors.
function ReviewStatusBadge({ video }: { video: StudioVideo }) {
  switch (video.status.kind) {
    case "pending-review":
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
    case "processing":
    case "draft":
    case "scheduled":
    case "published":
      return (
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
          Not in review
        </span>
      );
    default: {
      const exhaustiveCheck: never = video.status;
      return exhaustiveCheck;
    }
  }
}
