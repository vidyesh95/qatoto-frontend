// TRANSPORT: client-query — attaches and removes evidence on a review that already exists.
"use client";

// EVIDENCE ON A REVIEW, and the surface `commerce_review_media_state` was built for.
//
// IT ONLY APPEARS ONCE THE REVIEW EXISTS, because media attaches to a review id. Staging a photo
// before the review is written would mean holding a file whose destination might never be created —
// so the composer creates the review first and this panel follows.
//
// THE LIST IS READ BACK FROM THE SERVER, not accumulated from write responses. That used to be
// impossible: the trust router had no author-facing read, so leaving the page made these rows
// unreachable — unlistable, unremovable, and a YouTube video the host later deleted was
// undiscoverable rather than reported. `GET /commerce/reviews/:reviewId` closed that, and this panel
// is the reason it exists.
//
// `unavailable_upstream` IS RENDERED, and it is the reason the author-facing projection differs from
// the public one at all: the public read filters those rows out entirely and carries no state, while
// the author gets the state because only they can replace a video that died on YouTube.

import Image from "next/image";
import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  useAttachReviewPhoto,
  useAttachReviewVideo,
  useDetachReviewMedia,
  useOwnReviewQuery,
} from "@/hooks/store/reviews";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { MAXIMUM_REVIEW_MEDIA_COUNT } from "@/lib/store/reviews.schemas";

export default function ReviewMediaPanel({ reviewId }: { reviewId: string }) {
  const ownReviewQuery = useOwnReviewQuery(reviewId);
  const [youtubeUrl, setYoutubeUrl] = useState("");

  // THE SERVER'S LIST, not a local one. Every write below re-reads rather than splicing its own
  // answer in: removing an attachment re-packs the surviving positions to 0..n-1 server-side, so a
  // locally-edited copy would be wrong about order the moment it diverged.
  const attachedMedia = ownReviewQuery.data?.success ? ownReviewQuery.data.data.media : [];

  const photoAttempt = useResettableAttemptIdempotencyKey();
  const videoAttempt = useResettableAttemptIdempotencyKey();
  const detachAttempt = useResettableAttemptIdempotencyKey();

  const attachPhotoMutation = useAttachReviewPhoto();
  const attachVideoMutation = useAttachReviewVideo();
  const detachMediaMutation = useDetachReviewMedia();

  const isAtCap = attachedMedia.length >= MAXIMUM_REVIEW_MEDIA_COUNT;

  async function handlePhotoSelected(imageFile: File) {
    const result = await attachPhotoMutation.mutateAsync({
      reviewId,
      imageFile,
      idempotencyKey: photoAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    // Rotated only after the server confirmed: a retry of a FAILED upload must carry the original
    // key, or the copy the server already stored becomes a second one.
    photoAttempt.resetIdempotencyKey();
    void ownReviewQuery.refetch();
  }

  async function handleAttachVideoClick() {
    const trimmedUrl = youtubeUrl.trim();
    if (trimmedUrl === "") return;
    const result = await attachVideoMutation.mutateAsync({
      reviewId,
      input: { youtubeUrl: trimmedUrl },
      idempotencyKey: videoAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    videoAttempt.resetIdempotencyKey();
    setYoutubeUrl("");
    void ownReviewQuery.refetch();
  }

  async function handleRemoveClick(mediaId: string) {
    const result = await detachMediaMutation.mutateAsync({
      reviewId,
      mediaId,
      idempotencyKey: detachAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    detachAttempt.resetIdempotencyKey();
    // The server re-packs the surviving positions to 0..n-1, so this re-reads rather than filtering
    // a local copy that would then disagree about order.
    void ownReviewQuery.refetch();
  }

  return (
    <section aria-label="Review evidence" className="rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">Add photos or a video</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Optional, and up to {MAXIMUM_REVIEW_MEDIA_COUNT} attachments. Photos are uploaded; a video
        is a YouTube link, because this platform stores no video of its own.
      </p>

      {attachedMedia.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachedMedia.map((media) => (
            <li
              key={media.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                {media.mediaKind === "photo" && media.url !== null ? (
                  <Image
                    src={media.url}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 rounded object-cover"
                  />
                ) : (
                  <span className="grid size-14 place-items-center rounded bg-muted text-xs text-muted-foreground">
                    Video
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs text-foreground">
                    {media.mediaKind === "photo"
                      ? "Photo"
                      : `YouTube · ${media.youtubeVideoId ?? "unknown"}`}
                  </p>
                  {/* The whole point of the author-facing projection. A buyer who finds an empty slot
                      where they remember attaching something learns nothing; this tells them. */}
                  {media.state === "unavailable_upstream" && (
                    <p className="text-xs text-destructive">
                      This video is no longer available on YouTube, so buyers cannot see it. Remove
                      it and attach another.
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={detachMediaMutation.isPending}
                onClick={() => void handleRemoveClick(media.id)}
                className="cursor-pointer text-xs font-medium text-destructive underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Add a photo</span>
          <input
            type="file"
            accept="image/*"
            disabled={isAtCap || attachPhotoMutation.isPending}
            onChange={(changeEvent) => {
              const selectedFile = changeEvent.target.files?.[0];
              // The input is cleared so the same file can be picked again after a failure — a file
              // input fires no change event when the selection does not change.
              changeEvent.target.value = "";
              if (selectedFile === undefined) return;
              void handlePhotoSelected(selectedFile);
            }}
            className="mt-1 block w-full text-xs text-foreground file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
          />
        </label>

        <div>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Add a YouTube link</span>
            <input
              type="url"
              value={youtubeUrl}
              disabled={isAtCap}
              onChange={(changeEvent) => setYoutubeUrl(changeEvent.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            disabled={isAtCap || youtubeUrl.trim() === "" || attachVideoMutation.isPending}
            onClick={() => void handleAttachVideoClick()}
            className="mt-2 cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            {attachVideoMutation.isPending ? "Attaching…" : "Attach video"}
          </button>
        </div>
      </div>

      {isAtCap && (
        <p className="mt-2 text-xs text-muted-foreground">
          That is the maximum of {MAXIMUM_REVIEW_MEDIA_COUNT}. Remove one to add another.
        </p>
      )}

      <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
        Attachments can only be managed here, while you are on this page — there is no screen yet
        for returning to a review you have already published.
      </p>

      <MutationNotice
        result={attachPhotoMutation.data}
        hasThrown={attachPhotoMutation.isError}
        fallbackMessage="That photo could not be attached."
      />
      <MutationNotice
        result={attachVideoMutation.data}
        hasThrown={attachVideoMutation.isError}
        fallbackMessage="That video could not be attached."
      />
      <MutationNotice
        result={detachMediaMutation.data}
        hasThrown={detachMediaMutation.isError}
        fallbackMessage="That attachment could not be removed."
      />
    </section>
  );
}
