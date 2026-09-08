// TRANSPORT: props-only — the video arrives from whichever detail page rendered it. Loads a
// third-party script; makes no Qatoto backend call.

"use client";

import { useEffect, useRef, useState } from "react";

import { loadYoutubeIframeApi, type YoutubePlayer } from "@/lib/youtube-iframe-api";

export interface BlueprintYoutubePlayerProps {
  readonly youtubeVideoId: string;
  /** Names the video for a screen reader — "Walkthrough", "Demo". */
  readonly title: string;
}

/**
 * ⚠️ THIS ARM CANNOT BE SEEKED, AND THAT IS A PRODUCT DECISION, NOT A LIMIT. It briefly could:
 * step rows drove `player.seekTo` through a command handle. It came out because YouTube already
 * gives an author CHAPTERS and a scrubbable timeline inside its own player, so a second set of
 * timestamps here duplicates a control the reader has — and duplicates it worse, since ours cannot
 * know the chapter titles. Same boundary `/studio/subtitles` records: Qatoto does not reach inside
 * somebody else's player. The contract enforces it from the other end, rejecting a step timestamp
 * beside a YouTube walkthrough outright, so there is nothing left to seek FOR.
 *
 * THE IFRAME API SURVIVED THAT REMOVAL, AND A BARE `<iframe>` WAS THE REJECTED ALTERNATIVE. Two
 * things pay for the script now that the seek does not:
 *
 *   1. **Autoplay straight off the poster click.** This player is mounted BY that click, so the
 *      reader has already asked once; `playerVars.autoplay` honours it. A cross-origin iframe
 *      needs `allow="autoplay"` delegation and gets best-effort behaviour, which risks a second
 *      click for the same intent.
 *   2. **`onError` is our own failure panel.** A deleted, private or embedding-disabled video
 *      becomes an in-place message with a "Watch on YouTube" link, instead of YouTube's grey box
 *      inside a frame we cannot inspect.
 *
 * NOT `watch/video-player.tsx`: `useWatchProgressBeacon` is called unconditionally at the top of
 * that component's YouTube branch and reports playback against a feed row id, which a blueprint
 * does not have and must not invent.
 */
type YoutubePlayerState =
  | { readonly status: "loading-api" }
  | { readonly status: "ready" }
  | { readonly status: "unavailable"; readonly message: string };

export default function BlueprintYoutubePlayer({
  youtubeVideoId,
  title,
}: BlueprintYoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<YoutubePlayer | null>(null);
  // `loading-api` and `ready` render the same thing — YouTube paints its own loading state inside
  // the frame — so only `unavailable` is branched on below. The other two are kept apart because
  // they are genuinely different moments in the mount, and collapsing them would leave nothing to
  // hang a future spinner or a load-timeout on.
  const [playerState, setPlayerState] = useState<YoutubePlayerState>({ status: "loading-api" });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;
    let isMounted = true;

    async function mountPlayer(): Promise<void> {
      let iframeApi: Awaited<ReturnType<typeof loadYoutubeIframeApi>>;
      try {
        iframeApi = await loadYoutubeIframeApi();
      } catch {
        // AN ERROR VALUE, NOT A THROW — an ad blocker or a strict CSP fails this load routinely,
        // and a boundary would take the whole page down for a video nobody may watch.
        if (isMounted) {
          setPlayerState({
            status: "unavailable",
            message: "This video could not be loaded. It may be blocked by an extension.",
          });
        }
        return;
      }
      if (!isMounted || container === null) return;

      youtubePlayerRef.current = new iframeApi.Player(container, {
        videoId: youtubeVideoId,
        // The no-cookie host is what the rest of the repo embeds through.
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          rel: 0,
          // The reader already pressed play — this component is mounted BY that click — so
          // starting on arrival honours an intent rather than hijacking attention.
          autoplay: 1,
        },
        events: {
          onReady: () => {
            if (!isMounted) return;
            setPlayerState({ status: "ready" });
          },
          onError: () => {
            if (!isMounted) return;
            setPlayerState({
              status: "unavailable",
              message: "This video is unavailable.",
            });
          },
        },
      });
    }

    void mountPlayer();
    return () => {
      isMounted = false;
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
    // The video id is the only thing this effect reads, so the list is exhaustive as written.
    // It used to carry a suppression, because a start position was read here and deliberately left
    // out — making a start position a dep is what rebuilds the iframe in `watch/video-player.tsx`.
    // With no seek there is no start position, and the suppression went with it.
  }, [youtubeVideoId]);

  return (
    <div className="relative size-full">
      {/* The API replaces this node with the iframe it creates. */}
      <div ref={containerRef} className="size-full" title={title} />
      {playerState.status === "unavailable" ? (
        <div className="absolute inset-0 grid place-content-center justify-items-center gap-2 bg-muted p-4">
          <p className="max-w-xs text-center text-xs leading-5 text-[#6F7979]">
            {playerState.message}
          </p>
          {/*
            A LINK, NOT JUST AN APOLOGY. "Embedding disabled" is a real and common state and the
            video still exists, so sending the reader to it is the truthful thing to render.
          */}
          <a
            href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-foreground underline hover:text-[#00696E]"
          >
            Watch on YouTube
          </a>
        </div>
      ) : null}
    </div>
  );
}
