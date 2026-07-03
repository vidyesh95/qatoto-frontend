"use client";

import Image from "next/image";
import Link from "next/link";
import { useStudioVideos, StudioVideo, StudioVideoVisibility } from "@/state/studio-videos-context";

// Minimal "My videos" list (UI phase) — one row per saved upload with
// visibility + status badges. Anime episodes are excluded here; they live in
// /studio/queue until approved. The full channel-content table (tabs, filters,
// bulk actions) comes later per VIDEO_LIST_STRUCTURE.md.
export default function VideosList() {
  const { videos } = useStudioVideos();
  const creatorVideos = videos.filter((video) => video.videoType !== "anime-episode");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">My videos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Uploads you saved from the upload flow. Anime episodes appear in{" "}
        <Link href="/studio/queue" className="text-[#1DBDC5] hover:underline">
          Queue
        </Link>{" "}
        until approved.
      </p>

      {creatorVideos.length === 0 ? (
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
          {creatorVideos.map((video) => (
            <VideoRow key={video.id} video={video} />
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoRow({ video }: { video: StudioVideo }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
      <span className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Image
          src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
        <p className="truncate text-xs text-muted-foreground">{video.fileName}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <VisibilityBadge visibility={video.visibility} />
        <StatusBadge video={video} />
        <span className="w-24 text-right text-xs text-muted-foreground">
          {video.uploadedAtLabel}
        </span>
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
// story. Review states never reach this list (anime is filtered out above) but
// the switch stays exhaustive so new status variants become compile errors.
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
    case "approved":
      return null;
    case "rejected":
      return null;
    default: {
      const exhaustiveCheck: never = video.status;
      return exhaustiveCheck;
    }
  }
}
