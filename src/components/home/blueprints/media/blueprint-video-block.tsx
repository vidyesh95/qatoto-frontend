// TRANSPORT: props-only — the video arrives from whichever detail page rendered it.
"use client";

import Image from "next/image";
import { useState } from "react";

import BlueprintYoutubePlayer from "@/components/home/blueprints/media/blueprint-youtube-player";
import { formatDurationLabel } from "@/lib/blueprints/format";
import type { BlueprintVideo } from "@/lib/blueprints/schemas";

/**
 * A build's walkthrough or demo video: a poster, and a YouTube player once someone presses play.
 *
 * ⚠️ ONE ENGINE, BECAUSE THERE IS ONE KIND OF VIDEO. This block used to dispatch on the contract's
 * `source` discriminator to a native `<video>` or to YouTube. The hosted arm is gone: Qatoto holds
 * no video bytes, the studio's file dropzone is `inert`, and `POST /videos` takes a `youtubeUrl`.
 * The discriminator survives in the contract as the seam Appendix A would widen; the second player
 * did not survive with it, because a player no payload can reach is unverified code.
 *
 * NOT `watch/video-player.tsx`. That component is wired to `useWatchProgressBeacon` — it reports
 * playback progress to the backend for the watch history, which is a claim a blueprint page has no
 * business making. The reason is recorded again in `blueprint-youtube-player.tsx`.
 *
 * POSTER FIRST. Click-to-start means no third-party script and no YouTube cookie for a reader who
 * came for the schematic and never presses play. The player is not rendered at all until then.
 *
 * `unoptimized` FOR AN https POSTER, mirroring `blueprints-hero-carousel.tsx:140`: a YouTube still
 * is already a finished ytimg URL, so re-optimising spends a transform on an image that has had one.
 */
export default function BlueprintVideoBlock({
  video,
  title,
  shouldLoadPosterEagerly = false,
}: {
  readonly video: BlueprintVideo;
  /** Names the video for a screen reader — "Walkthrough", "Demo". */
  readonly title: string;
  /**
   * True only where the poster is the first large media on the page. On a showcase the demo follows
   * the summary, or the write-up's first paragraph, and on desktop its poster is still the largest
   * contentful paint: loaded `lazy` it painted at ~490ms against ~150ms eager. No console warning
   * flagged it: the poster is an unoptimised ytimg URL, which Next's LCP check skips. The teardown
   * walkthrough sits far below the fold and keeps the lazy default.
   */
  readonly shouldLoadPosterEagerly?: boolean;
}) {
  // A BOOLEAN, NOT A UNION. It was a union while a seek could mount the player at a position; with
  // no seek the only thing left to say is whether the poster has been clicked, and a two-arm union
  // carrying nothing is a shape that invites a payload back.
  const [isPlaying, setIsPlaying] = useState(false);

  // `null` whenever nobody measured a runtime, which is the ordinary case for a YouTube video —
  // oEmbed does not report one. `formatDurationLabel` returns `null` for `null`, so the badge
  // simply does not render rather than showing an invented time.
  const durationLabel = formatDurationLabel(video.durationSeconds);

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>

      <div className="relative mt-2 aspect-video max-w-3xl overflow-hidden rounded-xl bg-muted">
        {isPlaying ? (
          <BlueprintYoutubePlayer youtubeVideoId={video.youtubeVideoId} title={title} />
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
              loading={shouldLoadPosterEagerly ? "eager" : "lazy"}
              fetchPriority={shouldLoadPosterEagerly ? "high" : "auto"}
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
