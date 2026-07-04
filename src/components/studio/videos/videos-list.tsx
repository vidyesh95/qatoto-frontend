"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StudioVideo, StudioVideoVisibility, useStudioVideos } from "@/state/studio-videos-context";
import UploadVideoModal from "@/components/studio/upload/upload-modal";

// "My videos" list (UI phase) — every saved upload in one place, including
// anime episodes with their review status (Pending / Approved / Rejected +
// reason); there is no separate queue surface. Each row has an Edit button
// that reopens the upload wizard pre-filled. The full channel-content table
// (tabs, filters, bulk actions) comes later per VIDEO_LIST_STRUCTURE.md.
export default function VideosList() {
  const { videos } = useStudioVideos();
  const [videoBeingEdited, setVideoBeingEdited] = useState<StudioVideo | null>(null);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploads you saved from the upload flow. Anime episodes stay in review (Pending) until
            Qatoto staff approve them.
          </p>
        </div>
        <Link
          href="/studio"
          className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <Image
            src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            alt=""
            width={20}
            height={20}
          />
          Upload video
        </Link>
      </div>

      {videos.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No videos yet</p>
          <Link
            href="/studio"
            className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/upload_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Upload video
          </Link>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {videos.map((video) => (
            <VideoRow key={video.id} video={video} onEditClick={() => setVideoBeingEdited(video)} />
          ))}
        </ul>
      )}

      {videoBeingEdited && (
        <UploadVideoModal
          key={videoBeingEdited.id}
          mode="edit"
          videoToEdit={videoBeingEdited}
          onClose={() => setVideoBeingEdited(null)}
        />
      )}
    </div>
  );
}

function VideoRow({ video, onEditClick }: { video: StudioVideo; onEditClick: () => void }) {
  const episodeDetails = video.animeEpisodeDetails;
  const secondaryLineText =
    video.videoType === "anime-episode" && episodeDetails
      ? `${episodeDetails.seriesName} · ${episodeDetails.seasonLabel} · Ep ${episodeDetails.episodeNumber}`
      : video.fileName;

  return (
    <li className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
      <span className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Image
          src={
            video.videoType === "anime-episode"
              ? "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              : "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          }
          alt=""
          width={24}
          height={24}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
        <p className="truncate text-xs text-muted-foreground">{secondaryLineText}</p>
        {video.status.kind === "rejected" && (
          <p className="mt-1 text-xs text-destructive">Reason: {video.status.rejectionReason}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <VisibilityBadge visibility={video.visibility} />
        <StatusBadge video={video} />
        <span className="w-24 text-right text-xs text-muted-foreground">
          {video.uploadedAtLabel}
        </span>
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Edit
        </button>
      </div>
    </li>
  );
}

const VISIBILITY_BADGE_LABELS: Record<StudioVideoVisibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
  "investor-only": "Investor-only",
};

function VisibilityBadge({ visibility }: { visibility: StudioVideoVisibility }) {
  const badgeStyle =
    visibility === "public"
      ? "bg-primary text-primary-foreground"
      : visibility === "investor-only"
        ? "bg-foreground text-background"
        : "border border-border text-muted-foreground";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyle}`}>
      {VISIBILITY_BADGE_LABELS[visibility]}
    </span>
  );
}

// Published rows show no extra badge — the visibility pill already tells the
// story. Review states (anime) render alongside everything else now that the
// queue lives in this list; the switch stays exhaustive so new status
// variants become compile errors.
function StatusBadge({ video }: { video: StudioVideo }) {
  switch (video.status.kind) {
    case "published":
      return null;
    case "processing":
      return <span className="text-xs text-muted-foreground">Processing…</span>;
    case "draft":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Draft
        </span>
      );
    case "scheduled":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Scheduled for {video.status.scheduledForLabel}
        </span>
      );
    case "pending-review":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Pending
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
    default: {
      const exhaustiveCheck: never = video.status;
      return exhaustiveCheck;
    }
  }
}
