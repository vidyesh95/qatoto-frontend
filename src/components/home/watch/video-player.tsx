"use client";

// TRANSPORT: client-query — the YouTube branch reports watch progress to the backend through
// `useWatchProgressBeacon`. The hosted branch renders and fetches nothing.
//
// THIS COMPONENT IS WHY THE WATCH PAGE WORKS AT ALL. Every video row in the system is a
// YouTube link (STUDIO_BACKEND Appendix A), and the previous version of this file was a bare
// native `<video>` — it could not play a single video in the catalogue.
//
// `videoSource` is on the wire (`GET /feed/watch/:videoId`), so the branch is data-driven
// rather than a guess from the URL shape.

import { useCallback, useEffect, useRef, useState } from "react";

import { useWatchProgressBeacon } from "@/hooks/feed/use-watch-progress-beacon";
import type { FeedSource, VideoSource } from "@/lib/feed/schemas";
import {
  loadYoutubeIframeApi,
  YOUTUBE_PLAYER_STATE,
  type YoutubePlayer,
} from "@/lib/youtube-iframe-api";

export type VideoPlayerChapter = {
  title: string;
  time: string;
};

export type VideoPlayerProps = {
  /** Which engine to use. `youtube` needs `youtubeVideoId`; `hosted` needs `src`. */
  videoSource: VideoSource;
  /** The 11-character id, for the YouTube branch. */
  youtubeVideoId?: string | null;
  /** A media URL, for the hosted branch. */
  src?: string;
  label: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  /** Chapter markers rendered on the seek bar (times as "mm:ss" or "hh:mm:ss"). */
  chapters?: VideoPlayerChapter[];
  /** WebVTT storyboard file for seek-bar hover previews. */
  thumbnailsSrc?: string;
  /** Initial playback position, e.g. from a `?t=` deep link. */
  startTimeSeconds?: number;
  /**
   * The backend row id, and where the viewer arrived from. Both are required to report watch
   * progress; without a `videoId` the player still plays but reports nothing.
   */
  videoId?: string;
  feedSource?: FeedSource;
};

const DEFAULT_PLAYER_CLASS = "w-full aspect-video rounded-xl overflow-hidden bg-black";

export default function VideoPlayer(props: VideoPlayerProps) {
  return props.videoSource === "youtube" ? (
    <YoutubeVideoPlayer {...props} />
  ) : (
    <HostedVideoPlayer {...props} />
  );
}

/**
 * The native HTML5 `<video>` engine — the ONLY path for a `hosted` row.
 *
 * No rows use it today. It is kept rather than deleted because Studio Appendix A is a
 * deliberate "later", not a "never", and re-deriving this branch when self-hosting lands would
 * be work for no reason.
 *
 * `chapters` and `thumbnailsSrc` remain unimplemented here for the same reasons as before: no
 * browser renders chapter markers on the native seek bar, and HTML5 has no storyboard API.
 * Both need a custom controls UI on top of `<video>`.
 */
function HostedVideoPlayer({
  src,
  label,
  poster,
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
  playsInline = true,
  className = DEFAULT_PLAYER_CLASS,
  startTimeSeconds,
}: VideoPlayerProps) {
  // Media fragment (#t=) makes the native player start at the given offset without any JS
  // seeking.
  const srcWithStartTime =
    src !== undefined && startTimeSeconds !== undefined && startTimeSeconds > 0
      ? `${src}#t=${startTimeSeconds}`
      : src;

  if (srcWithStartTime === undefined) return <div className={className} aria-label={label} />;

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption -- caption tracks arrive with real uploads
    <video
      src={srcWithStartTime}
      aria-label={label}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      loop={loop}
      playsInline={playsInline}
      className={className}
    />
  );
}

type YoutubePlayerStatus = "loading" | "ready" | "unavailable";

function YoutubeVideoPlayer({
  youtubeVideoId,
  label,
  className = DEFAULT_PLAYER_CLASS,
  startTimeSeconds,
  autoPlay = false,
  videoId,
  feedSource = "direct",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YoutubePlayer | null>(null);
  const [status, setStatus] = useState<YoutubePlayerStatus>("loading");

  // Reads straight off the player rather than mirroring position into React state: the beacon
  // needs a number every 15 seconds, and a state update 4 times a second to support that would
  // re-render the whole watch page for a value nothing displays.
  const readProgress = useCallback(() => {
    const player = playerRef.current;
    if (player === null) return null;
    const positionSeconds = player.getCurrentTime();
    const durationSeconds = player.getDuration();
    if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds)) return null;
    return { positionSeconds, durationSeconds };
  }, []);

  const beacon = useWatchProgressBeacon({
    videoId: videoId ?? "",
    feedSource,
    readProgress,
  });

  // The beacon controls are stable per videoId, but re-creating the PLAYER whenever they change
  // would tear down playback. Held in a ref so the mount effect depends only on the video.
  const beaconRef = useRef(beacon);
  useEffect(() => {
    beaconRef.current = beacon;
  }, [beacon]);

  const canReportProgress = videoId !== undefined && videoId !== "";

  useEffect(() => {
    const container = containerRef.current;
    if (container === null || youtubeVideoId === null || youtubeVideoId === undefined) {
      setStatus("unavailable");
      return undefined;
    }

    // Guards the async gap: the component can unmount while the API script is still loading,
    // and constructing a player into a detached node leaks an iframe.
    let isMounted = true;
    setStatus("loading");

    const mountPlayer = async () => {
      const iframeApi = await loadYoutubeIframeApi();
      // The component can unmount while the script is in flight; constructing a player into a
      // detached node leaks an iframe that keeps polling.
      if (!isMounted) return;
      playerRef.current = new iframeApi.Player(container, {
        videoId: youtubeVideoId,
        // Matches `buildYoutubeEmbedUrl`'s cookieless domain, so the player behaves the same
        // here as in the studio preview.
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          // Required for `getCurrentTime` / `getDuration` and the state callbacks.
          enablejsapi: 1,
          // Required by the API when the page is not youtube.com, and the thing most often
          // missing when a player silently refuses to report state.
          origin: window.location.origin,
          autoplay: autoPlay ? 1 : 0,
          // AUTOPLAY WITHOUT THIS DOES NOT AUTOPLAY. Every current browser blocks unmuted
          // autoplay, and the YouTube player obeys that silently — it simply sits on the poster
          // frame. The watch page asks for `autoPlay` and this was missing, so the feature was
          // dead on arrival. Muting is the price of starting on load; the viewer unmutes.
          ...(autoPlay ? { mute: 1 } : {}),
          playsinline: 1,
          rel: 0,
          ...(startTimeSeconds !== undefined && startTimeSeconds > 0
            ? { start: Math.floor(startTimeSeconds) }
            : {}),
        },
        events: {
          onReady: () => {
            if (isMounted) setStatus("ready");
          },
          onStateChange: (event) => {
            if (!isMounted || !canReportProgress) return;
            if (event.data === YOUTUBE_PLAYER_STATE.playing) {
              beaconRef.current.startReporting();
              return;
            }
            if (
              event.data === YOUTUBE_PLAYER_STATE.paused ||
              event.data === YOUTUBE_PLAYER_STATE.ended
            ) {
              beaconRef.current.stopReporting();
            }
            // `buffering` deliberately does NOT stop the heartbeat: a two-second stall is not
            // the end of a watch session, and stopping would send a flush per hiccup.
          },
          onError: (event) => {
            if (!isMounted) return;
            setStatus("unavailable");
            // 101/150 mean the creator disabled embedding, 100 that the video is gone. At
            // three DISTINCT reporters the backend drops the row from the candidate pool
            // immediately rather than waiting up to 24h for the nightly re-check.
            if (canReportProgress) beaconRef.current.reportPlayerError(event.data);
          },
        },
      });
    };

    // A rejection here is an ad blocker, a strict CSP, or an offline tab. All three mean the
    // same thing to the reader, and all three must say so rather than leave a black rectangle.
    void mountPlayer().catch(() => {
      if (isMounted) setStatus("unavailable");
    });

    return () => {
      isMounted = false;
      // Destroying replaces the container's children, so React's own cleanup has nothing left
      // to unmount — this must happen before the node goes away, not after.
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeVideoId, startTimeSeconds, autoPlay, canReportProgress]);

  return (
    <div className={`relative ${className}`}>
      <div ref={containerRef} className="size-full" aria-label={label} />
      {status === "unavailable" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black px-6 text-center">
          <p className="text-sm text-white/80">
            This video can&rsquo;t be played here. The creator may have turned off embedding.
          </p>
        </div>
      )}
    </div>
  );
}
