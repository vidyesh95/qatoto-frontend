// TRANSPORT: props-only — the video arrives from whichever detail page rendered it.
"use client";

import Image from "next/image";
import { useState } from "react";

import { BLUEPRINT_MEDIA_COLUMN_CLASS } from "@/components/home/blueprints/media/media-column";
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
  isTitleVisible = true,
  shouldLoadPosterEagerly = false,
}: {
  readonly video: BlueprintVideo;
  /** Names the video for a screen reader — "Walkthrough", "Video". */
  readonly title: string;
  /**
   * False inside a launch write-up, where a visible "Video" heading over every pasted link would
   * interrupt the text. The heading stays for a screen reader, and the write-up's own spacing
   * replaces the section margin.
   */
  readonly isTitleVisible?: boolean;
  /**
   * True only for the first media in a launch write-up. At desktop width it starts inside the first
   * viewport and its poster is the largest contentful paint; loaded `lazy`, Next warns and the paint
   * lands late (~490ms against ~150ms eager, measured when this poster sat under the byline). The
   * teardown walkthrough sits far below the fold and keeps the lazy default.
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
    <section className={isTitleVisible ? "mt-8" : undefined}>
      <h2 className={isTitleVisible ? "text-sm font-medium text-foreground" : "sr-only"}>
        {title}
      </h2>

      <div
        className={`relative aspect-video ${BLUEPRINT_MEDIA_COLUMN_CLASS} overflow-hidden rounded-xl bg-muted ${isTitleVisible ? "mt-2" : ""}`}
      >
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
