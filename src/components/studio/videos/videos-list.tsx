"use client";

// TRANSPORT: client-query — `GET /videos/mine` through `useMyVideosQuery`.
//
// Was backed by `useStudioVideos()`, an in-memory array seeded with fixtures. The row shape
// changed with it: `GET /videos/mine` carries no `fileName` and no `uploadedAtLabel`, so the
// date column reads `updatedAt` — which is what the list is actually ordered by — and the
// second line names the video TYPE rather than a file that no longer exists.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import RelativeTime from "@/components/home/shared/relative-time";
import UploadVideoModal from "@/components/studio/upload/upload-modal";
import {
  useDeleteVideoMutation,
  useMyVideosQuery,
  usePublishVideoMutation,
  useUnpublishVideoMutation,
} from "@/hooks/videos";
import { describePublishBlock, describePublishRefusal } from "@/lib/videos/publish-refusal";
import type { StudioVideoType, StudioVideoVisibility, VideoListRow } from "@/lib/videos/schemas";

type VideosListState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly videos: VideoListRow[] };

export default function VideosList() {
  const videosQuery = useMyVideosQuery({ limit: 50 });
  const [videoIdBeingEdited, setVideoIdBeingEdited] = useState<string | null>(null);

  const state: VideosListState = videosQuery.isPending
    ? { status: "loading" }
    : videosQuery.error !== null
      ? { status: "error", message: "Couldn't load your videos. Please try again." }
      : videosQuery.data.rows.length === 0
        ? { status: "empty" }
        : { status: "ready", videos: videosQuery.data.rows };

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
        <UploadLink label="Upload video" />
      </div>

      {renderVideos(state, setVideoIdBeingEdited)}

      {videoIdBeingEdited !== null && (
        <UploadVideoModal
          key={videoIdBeingEdited}
          mode="edit"
          videoIdToEdit={videoIdBeingEdited}
          onClose={() => setVideoIdBeingEdited(null)}
        />
      )}
    </div>
  );
}

// Exhaustive switch with a `never` default (CLAUDE.md Pattern 1): adding a variant to
// `VideosListState` becomes a compile error here rather than a silently unhandled state.
function renderVideos(state: VideosListState, onEditClick: (videoId: string) => void) {
  switch (state.status) {
    case "loading":
      return <p className="mt-10 text-sm text-muted-foreground">Loading your videos…</p>;
    case "error":
      return <p className="mt-10 text-sm text-destructive">{state.message}</p>;
    case "empty":
      return (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No videos yet</p>
          <UploadLink label="Upload video" />
        </div>
      );
    case "ready":
      return (
        <ul className="mt-6 flex flex-col gap-2">
          {state.videos.map((video) => (
            <VideoRow key={video.id} video={video} onEditClick={() => onEditClick(video.id)} />
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function UploadLink({ label }: { label: string }) {
  return (
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
      {label}
    </Link>
  );
}

function VideoRow({ video, onEditClick }: { video: VideoListRow; onEditClick: () => void }) {
  const publishMutation = usePublishVideoMutation();
  const unpublishMutation = useUnpublishVideoMutation();
  const deleteMutation = useDeleteVideoMutation();

  const [rowMessage, setRowMessage] = useState<string | null>(null);
  const [isDeletePending, setIsDeletePending] = useState(false);

  const isBusy =
    publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending;
  const publishBlockReason = describePublishBlock(video);
  const isPublished = video.publishStatus === "published";

  async function handlePublishClick() {
    setRowMessage(null);
    try {
      const published = await publishMutation.mutateAsync(video.id);
      // AN ANIME EPISODE DOES NOT PUBLISH. The backend moves it to `reviewStatus: "pending"`
      // and leaves `publishStatus: "draft"`, so saying "published" here would be a lie the
      // creator acts on — they would go looking for it on the homepage.
      setRowMessage(
        published.reviewStatus === "pending"
          ? "Submitted for review. It goes live once a moderator approves it."
          : published.publishStatus === "scheduled"
            ? "Scheduled. It will not appear on the homepage until it is published."
            : null,
      );
    } catch (error) {
      const refusal = describePublishRefusal(error);
      setRowMessage(refusal.message);
    }
  }

  function handleDeleteClick() {
    // Click once to arm, once to confirm — same as the playlists page. There is no undo route.
    if (!isDeletePending) {
      setIsDeletePending(true);
      return;
    }
    deleteMutation.mutate(video.id);
    setIsDeletePending(false);
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
      <div className="flex items-center gap-4">
        <span className="flex aspect-video w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
          {video.thumbnailUrl === null ? (
            /*
              The anime/`live_tv` distinction came back with `videoType` on the list projection.
              Without it every row used the same generic icon, so an episode bound for moderation
              looked exactly like a pitch that publishes straight away.
            */
            <Image
              src={
                video.videoType === "anime_episode"
                  ? "/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  : "/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              }
              alt=""
              width={24}
              height={24}
            />
          ) : (
            <Image
              src={video.thumbnailUrl}
              alt=""
              width={112}
              height={63}
              className="size-full object-cover"
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
          {/*
            The second line the mock had. It showed the file name, which no longer exists — the
            useful thing now is the KIND, because that is what decides whether this row goes
            through moderation.
          */}
          <p className="truncate text-xs text-muted-foreground">
            {VIDEO_TYPE_LABELS[video.videoType]}
          </p>
          {video.rejectionReason !== null && (
            <p className="mt-1 text-xs text-destructive">Reason: {video.rejectionReason}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SourceBadge videoSource={video.videoSource} uploadStatus={video.uploadStatus} />
          <VisibilityBadge visibility={video.visibility} />
          <StatusBadge video={video} />
          <RelativeTime
            isoInstant={video.updatedAt}
            className="w-24 text-right text-xs text-muted-foreground"
          />
          <button
            type="button"
            onClick={onEditClick}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Edit
          </button>
          {isPublished ? (
            <button
              type="button"
              onClick={() => unpublishMutation.mutate(video.id)}
              disabled={isBusy}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50"
            >
              {unpublishMutation.isPending ? "Working…" : "Unpublish"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handlePublishClick()}
              disabled={isBusy || publishBlockReason !== null}
              // The tooltip carries the reason. Without it the button is just inert, and an
              // inert button with no explanation is what sent the creator to the docs.
              title={publishBlockReason ?? undefined}
              className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
            >
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteClick}
            onBlur={() => setIsDeletePending(false)}
            disabled={isBusy}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isDeletePending
                ? "bg-destructive/10 text-destructive"
                : "border border-border text-muted-foreground hover:text-destructive"
            }`}
          >
            {isDeletePending ? "Confirm" : "Delete"}
          </button>
        </div>
      </div>

      {/*
        The publish block reason is shown INLINE as well as in the tooltip. A disabled button
        with a hover-only explanation is invisible on touch, and this is the exact message that
        answers "why is my video not on the homepage".
      */}
      {!isPublished && publishBlockReason !== null && (
        <p className="text-xs text-muted-foreground">{publishBlockReason}</p>
      )}
      {rowMessage !== null && (
        <p role="alert" className="text-xs text-destructive">
          {rowMessage}
        </p>
      )}
      {deleteMutation.error !== null && (
        <p role="alert" className="text-xs text-destructive">
          Couldn&rsquo;t delete this video. Please try again.
        </p>
      )}
    </li>
  );
}

/**
 * The source badge, and the "verifying…" state a creator needs to understand a blocked publish.
 *
 * A YouTube row is created with `isSourceVerified: false` and a background job confirms the id
 * with YouTube's oEmbed. PUBLISH IS REFUSED with a 409 for as long as that flag is false — so
 * without this badge, an oEmbed outage looks like a publish button that silently does nothing.
 *
 * The LIST row does not carry `isSourceVerified` (thirteen fields, and that is not one of
 * them), so this keys on `uploadStatus`, which is `processing` over the same window and
 * `failed` once the video is unplayable.
 */
function SourceBadge({
  videoSource,
  uploadStatus,
}: {
  videoSource: VideoListRow["videoSource"];
  uploadStatus: VideoListRow["uploadStatus"];
}) {
  if (videoSource !== "youtube") return null;

  if (uploadStatus === "processing" || uploadStatus === "uploading") {
    return (
      <span
        title="We are confirming this link with YouTube. Publishing unlocks once it is verified."
        className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
      >
        Verifying…
      </span>
    );
  }

  if (uploadStatus === "failed") {
    return (
      <span
        title="YouTube would not confirm this video. It may have been removed, or embedding may be turned off."
        className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive"
      >
        Unavailable
      </span>
    );
  }

  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
      YouTube
    </span>
  );
}

const VIDEO_TYPE_LABELS: Record<StudioVideoType, string> = {
  pitch: "Pitch",
  demo: "Demo",
  update: "Update",
  ama: "AMA",
  anime_episode: "Anime episode",
};

const VISIBILITY_BADGE_LABELS: Record<StudioVideoVisibility, string> = {
  private: "Private",
  unlisted: "Unlisted",
  public: "Public",
  // snake_case: this is a pgEnum label, not an identifier. The mock spelled it "investor-only",
  // which the backend's `.strict()` schema rejects outright.
  investor_only: "Investor-only",
};

function VisibilityBadge({ visibility }: { visibility: StudioVideoVisibility }) {
  const badgeStyle =
    visibility === "public"
      ? "bg-primary text-primary-foreground"
      : visibility === "investor_only"
        ? "bg-foreground text-background"
        : "border border-border text-muted-foreground";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyle}`}>
      {VISIBILITY_BADGE_LABELS[visibility]}
    </span>
  );
}

/**
 * `derivedStatus` is computed SERVER-SIDE from the four status columns.
 *
 * The mock derived it in a local `resolveVideoStatus` helper, which could disagree with the
 * backend about whether an anime episode needed review. It cannot now — there is one place that
 * decides, and it is the one that owns the columns.
 */
function StatusBadge({ video }: { video: VideoListRow }) {
  switch (video.derivedStatus) {
    case "published":
      // No badge — the visibility pill already tells the story.
      return null;
    case "processing":
      return <span className="text-xs text-muted-foreground">Processing…</span>;
    case "failed":
      return (
        <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
          Failed
        </span>
      );
    case "draft":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Draft
        </span>
      );
    case "scheduled":
      return (
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {video.scheduledPublishAt === null
            ? "Scheduled"
            : `Scheduled for ${video.scheduledPublishAt.slice(0, 10)}`}
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
      const exhaustiveCheck: never = video.derivedStatus;
      return exhaustiveCheck;
    }
  }
}
