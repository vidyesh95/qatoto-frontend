// TRANSPORT: props-only — the video arrives from whichever detail page rendered it.
"use client";

import Image from "next/image";
import { useState } from "react";

import { formatDurationLabel } from "@/lib/blueprints/format";
import type { BlueprintVideo } from "@/lib/blueprints/schemas";

/**
 * A build's walkthrough or demo video.
 *
 * NO PLAYER LIBRARY, AND NOT `watch/video-player.tsx` EITHER. That component is a dual-engine
 * YouTube/hosted player wired to `useWatchProgressBeacon` — it reports playback progress to the
 * backend for the watch history, which is a claim a blueprint page has no business making. These
 * are hosted mp4 files, and `<video controls>` plays them.
 *
 * POSTER FIRST, SOURCE SECOND. `preload="none"` plus a click-to-start means the megabyte is not
 * fetched by a visitor who came for the schematic. The `<video>` element is not rendered at all
 * until then, so there is nothing for a browser to speculatively buffer.
 *
 * `unoptimized` FOR AN https POSTER, mirroring `blueprints-hero-carousel.tsx:140`: an uploaded
 * asset is already a finished Cloudinary URL, and re-optimising it spends a transform on an image
 * that has had one.
 */
export default function BlueprintVideoBlock({
  video,
  title,
}: {
  readonly video: BlueprintVideo;
  /** Names the video for a screen reader — "Walkthrough", "Demo". */
  readonly title: string;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const durationLabel = formatDurationLabel(video.durationSeconds);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>

      <div className="relative mt-2 aspect-video max-w-3xl overflow-hidden rounded-xl bg-muted">
        {isPlaying ? (
          // A `<track>` IS rendered below, but only when the row carries a `captionsUrl`, and the
          // rule cannot see a conditional child. An unconditional `<track src={null}>` would
          // satisfy the linter and break the player, which is the wrong way round. Every fixture
          // is `captionsUrl: null` today, so the caption-less branch is the one that runs — the
          // gap is the missing captions, not the markup.
          // oxlint-disable-next-line media-has-caption
          <video
            src={video.url}
            poster={video.posterUrl}
            controls
            autoPlay
            preload="none"
            className="size-full"
          >
            {/* A `<track>` only when the row carries one. Every fixture is `captionsUrl: null`
                today, and an empty track element is worse than no element at all. */}
            {video.captionsUrl === null ? null : (
              <track kind="captions" src={video.captionsUrl} default />
            )}
          </video>
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
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
