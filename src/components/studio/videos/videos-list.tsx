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
            Uploads you saved from the upload flow.
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

function VideoRowThumbnail({ thumbnailUrl }: { readonly thumbnailUrl: string | null }) {
  return (
    <span className="flex aspect-video w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
      {thumbnailUrl === null ? (
        <Image
          src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      ) : (
        <Image
          src={thumbnailUrl}
          alt=""
          width={112}
          height={63}
          className="size-full object-cover"
        />
      )}
    </span>
  );
}

function VideoRowActionButtons({
  isPublished,
  isBusy,
  isDeletePending,
  isPublishPending,
  isUnpublishPending,
  publishBlockReason,
  onEditClick,
  onPublishClick,
  onUnpublishClick,
  onDeleteClick,
  onCancelDelete,
}: {
  readonly isPublished: boolean;
  readonly isBusy: boolean;
  readonly isDeletePending: boolean;
  readonly isPublishPending: boolean;
  readonly isUnpublishPending: boolean;
  readonly publishBlockReason: string | null;
  readonly onEditClick: () => void;
  readonly onPublishClick: () => void;
  readonly onUnpublishClick: () => void;
  readonly onDeleteClick: () => void;
  readonly onCancelDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
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
          onClick={onUnpublishClick}
          disabled={isBusy}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50"
        >
          {isUnpublishPending ? "Working…" : "Unpublish"}
        </button>
      ) : (
        <button
          type="button"
          onClick={onPublishClick}
          disabled={isBusy || publishBlockReason !== null}
          title={publishBlockReason ?? undefined}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
        >
          {isPublishPending ? "Publishing…" : "Publish"}
        </button>
      )}
      <button
        type="button"
        onClick={onDeleteClick}
        onBlur={onCancelDelete}
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
  );
}

function VideoRowInlineFeedback({
  isPublished,
  publishBlockReason,
  rowMessage,
  hasDeleteError,
}: {
  readonly isPublished: boolean;
  readonly publishBlockReason: string | null;
  readonly rowMessage: string | null;
  readonly hasDeleteError: boolean;
}) {
  return (
    <>
      {!isPublished && publishBlockReason !== null && (
        <p className="text-xs text-muted-foreground">{publishBlockReason}</p>
      )}
      {rowMessage !== null && (
        <p role="alert" className="text-xs text-destructive">
          {rowMessage}
        </p>
      )}
      {hasDeleteError && (
        <p role="alert" className="text-xs text-destructive">
          Couldn&rsquo;t delete this video. Please try again.
        </p>
      )}
    </>
  );
}

function VideoRow({
  video,
  onEditClick,
}: {
  readonly video: VideoListRow;
  readonly onEditClick: () => void;
}) {
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
      setRowMessage(
        published.publishStatus === "scheduled"
          ? "Scheduled. It will not appear on the homepage until it is published."
          : null,
      );
    } catch (error) {
      const refusal = describePublishRefusal(error);
      setRowMessage(refusal.message);
    }
  }

  function handleDeleteClick() {
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
        <VideoRowThumbnail thumbnailUrl={video.thumbnailUrl} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{video.title}</p>
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
          <VideoRowActionButtons
            isPublished={isPublished}
            isBusy={isBusy}
            isDeletePending={isDeletePending}
            isPublishPending={publishMutation.isPending}
            isUnpublishPending={unpublishMutation.isPending}
            publishBlockReason={publishBlockReason}
            onEditClick={onEditClick}
            onPublishClick={() => void handlePublishClick()}
            onUnpublishClick={() => unpublishMutation.mutate(video.id)}
            onDeleteClick={handleDeleteClick}
            onCancelDelete={() => setIsDeletePending(false)}
          />
        </div>
      </div>

      <VideoRowInlineFeedback
        isPublished={isPublished}
        publishBlockReason={publishBlockReason}
        rowMessage={rowMessage}
        hasDeleteError={deleteMutation.error !== null}
      />
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
 * backend. It cannot now — there is one place that decides, and it is the one that owns the
 * columns.
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
    default: {
      const exhaustiveCheck: never = video.derivedStatus;
      return exhaustiveCheck;
    }
  }
}
