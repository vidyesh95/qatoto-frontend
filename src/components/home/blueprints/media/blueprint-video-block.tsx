// TRANSPORT: props-only — the video arrives from whichever detail page rendered it.
"use client";

import Image from "next/image";
import { useImperativeHandle, useRef, useState } from "react";

import BlueprintHostedPlayer from "@/components/home/blueprints/media/blueprint-hosted-player";
import BlueprintYoutubePlayer from "@/components/home/blueprints/media/blueprint-youtube-player";
import {
  useWalkthroughSeek,
  type WalkthroughPlayerHandle,
} from "@/components/home/blueprints/media/walkthrough-seek-context";
import { formatDurationLabel } from "@/lib/blueprints/format";
import type { BlueprintVideo } from "@/lib/blueprints/schemas";

/**
 * A build's walkthrough or demo video.
 *
 * TWO ENGINES BEHIND ONE POSTER. The contract's `source` discriminator decides which; the poster,
 * the play button and the duration badge are shared, so the two arms look identical until clicked.
 *
 * ⚠️ THE SEEK IS HOSTED-ONLY, and this component is where that becomes true at runtime. A YouTube
 * walkthrough carries no step timestamps at all (the teardown arm's refinement rejects them,
 * because YouTube's own player already offers chapters), so nothing can ask for a seek into one —
 * and the handle below is registered only on the hosted arm so nothing could even if it tried.
 *
 * NOT `watch/video-player.tsx`. That component is wired to `useWatchProgressBeacon` — it reports
 * playback progress to the backend for the watch history, which is a claim a blueprint page has no
 * business making — and its `startTimeSeconds` rebuilds the iframe rather than seeking. Both
 * reasons are recorded again in `blueprint-youtube-player.tsx`, where the second one bites.
 *
 * POSTER FIRST, SOURCE SECOND. `preload="none"` plus a click-to-start means the megabyte is not
 * fetched by a visitor who came for the schematic. Neither player is rendered at all until then,
 * so there is nothing for a browser to speculatively buffer and no third-party script loaded for
 * a reader who never presses play.
 *
 * `unoptimized` FOR AN https POSTER, mirroring `blueprints-hero-carousel.tsx:140`: an uploaded
 * asset is already a finished Cloudinary URL — and a YouTube still is already a finished ytimg
 * URL — so re-optimising spends a transform on an image that has had one.
 */

/**
 * The playing `<video>`, in TWO BRANCHES rather than one with a conditional child.
 *
 * THE SPLIT IS WHAT LETS THE LINTER DO ITS JOB. `media-has-caption` cannot see a `<track>` inside a
 * JSX expression container, so a single element with `{captionsUrl === null ? null : <track/>}`
 * had to suppress the rule for BOTH paths — including the captioned one, which is the path worth
 * checking. Written this way the captioned branch is linted normally and the suppression covers
 * only the case where suppressing is correct: there are genuinely no captions to render.
 *
 * ⚠️ THE OTHER WAY OUT OF THIS IS A LIE, and the repo already contains it —
 * `studio/upload/video-preview-card.tsx:95` renders `<track kind="captions" />` with no `src`,
 * which satisfies the rule and delivers no captions to anyone. Do not do that twice.
 *
 * `playerProps` is shared so the two branches cannot drift apart.
 */
/** `poster` until someone presses play; then the position the arm mounts at. */
type WalkthroughPlaybackState =
  | { readonly status: "poster" }
  | { readonly status: "playing"; readonly startAtSeconds: number };

export default function BlueprintVideoBlock({
  video,
  title,
}: {
  readonly video: BlueprintVideo;
  /** Names the video for a screen reader — "Walkthrough", "Demo". */
  readonly title: string;
}) {
  const [playback, setPlayback] = useState<WalkthroughPlaybackState>({ status: "poster" });
  /**
   * Narrowed once, read twice. The handle registration and the arm dispatch have to agree about
   * which arm can be commanded, and a single `const` is what keeps them from drifting apart.
   */
  const isSeekable = video.source === "hosted";
  const frameRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<WalkthroughPlayerHandle | null>(null);
  // `null` on the showcase page, where a demo video has no step list to be driven by.
  const seekChannel = useWalkthroughSeek();

  // A null ref is a documented no-op — the mechanism that makes both the showcase path (no
  // provider) and the YouTube path (no seekable arm) free. Every ref read happens inside this
  // factory, never while rendering.
  useImperativeHandle(
    isSeekable ? (seekChannel?.playerRef ?? null) : null,
    () => ({
      seekToSeconds(positionSeconds) {
        // A null arm means "not mounted yet", never "not ready": both arms queue internally once
        // they exist. So this branch is only ever about getting past the poster, and the arm picks
        // the position up through `startAtSeconds`.
        if (armRef.current === null) {
          setPlayback({ status: "playing", startAtSeconds: positionSeconds });
        } else {
          armRef.current.seekToSeconds(positionSeconds);
        }
        // `block: "nearest"` is a no-op when the player is already on screen and the smallest
        // possible scroll otherwise — which is why it is unconditional rather than measured.
        frameRef.current?.scrollIntoView({
          block: "nearest",
          // Reduced motion turns the glide into a jump, matching the 3D viewer's own probe.
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      },
    }),
    [],
  );

  const durationLabel = formatDurationLabel(video.durationSeconds);

  function renderPlayer(startAtSeconds: number) {
    switch (video.source) {
      case "hosted":
        return (
          <BlueprintHostedPlayer
            video={video}
            title={title}
            playerRef={armRef}
            startAtSeconds={startAtSeconds}
          />
        );
      case "youtube":
        // No `playerRef` and no `startAtSeconds`: this arm cannot be seeked, so it takes neither.
        return <BlueprintYoutubePlayer youtubeVideoId={video.youtubeVideoId} title={title} />;
      default: {
        const exhaustiveCheck: never = video;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>

      <div
        ref={frameRef}
        className="relative mt-2 aspect-video max-w-3xl overflow-hidden rounded-xl bg-muted"
      >
        {playback.status === "playing" ? (
          renderPlayer(playback.startAtSeconds)
        ) : (
          <button
            type="button"
            onClick={() => setPlayback({ status: "playing", startAtSeconds: 0 })}
            aria-label={`Play ${title.toLowerCase()}`}
            className="group/play absolute inset-0 cursor-pointer"
          >
            <Image
              src={video.posterUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              unoptimized={video.posterUrl.startsWith("https://")}
              className="object-cover"
            />
            <span className="absolute inset-0 bg-black/20 transition-colors group-hover/play:bg-black/30" />
            <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/70">
              <svg viewBox="0 0 24 24" aria-hidden className="size-8 fill-white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            {durationLabel === null ? null : (
              <span className="absolute right-2 bottom-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium text-white">
                {durationLabel}
              </span>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
