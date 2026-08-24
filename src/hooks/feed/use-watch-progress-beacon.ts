"use client";

// TRANSPORT: client-query — POSTs watch progress to `/videos/:id/view-beacon`.
//
// THIS IS BEST-EFFORT BY CONSTRUCTION, AND NOTHING HERE SHOULD BE WRITTEN AS THOUGH IT IS NOT.
//
// The beacon is a CLAIM about a measurement, not a measurement. The server clamps the reported
// position against wall-clock elapsed, floors the delta at zero so seeking backwards adds
// nothing, and pins the duration on the first beacon so a later one cannot shrink the
// denominator. A dropped beacon under-reports watch time; a duplicated one is absorbed by the
// clamp. Neither is worth a retry queue, and a retry queue would itself be an attack surface
// on the only unauthenticated write on the platform.
//
// THE FLUSH USES `fetch(..., { keepalive: true })`, NOT `navigator.sendBeacon`.
//
// `sendBeacon` looks like the textbook answer and is silently WRONG here. The API is on a
// different origin, and a `Blob` typed `application/json` is not a CORS-safelisted content
// type — so the request needs a preflight, and `sendBeacon` cannot preflight. It returns
// `true` (the browser queued it) and the request never arrives. `keepalive` survives page
// teardown the same way and goes through the normal CORS path with credentials.

import { useCallback, useEffect, useRef } from "react";

import { recordViewBeacon, reportPlaybackError } from "@/lib/feed/api";
import { PLAYBACK_ERROR_CODES, type FeedSource, type PlaybackErrorCode } from "@/lib/feed/schemas";

/**
 * Matches `BEACON_INTERVAL_SECONDS` on the backend clamp.
 *
 * Sending faster does not buy accuracy — the clamp bounds each delta by wall-clock elapsed —
 * it only burns the tightest rate limiter on the platform (60/min AND 200/hr).
 */
const BEACON_INTERVAL_MS = 15_000;

/** The backend's `MAXIMUM_VIDEO_SECONDS`. Anything past it is a 422, so we never send it. */
const MAXIMUM_VIDEO_SECONDS = 43_200;

export interface WatchProgressSnapshot {
  readonly positionSeconds: number;
  readonly durationSeconds: number;
}

export interface WatchProgressBeaconControls {
  /** Playback started — begin the heartbeat. Safe to call repeatedly. */
  readonly startReporting: () => void;
  /** Playback paused or ended — stop the heartbeat and send one final beacon. */
  readonly stopReporting: () => void;
  /** The player raised an error code. Unknown codes are DROPPED, not forwarded. */
  readonly reportPlayerError: (errorCode: number) => void;
}

function isReportablePlaybackErrorCode(errorCode: number): errorCode is PlaybackErrorCode {
  return (PLAYBACK_ERROR_CODES as readonly number[]).includes(errorCode);
}

export function useWatchProgressBeacon({
  videoId,
  feedSource,
  readProgress,
}: {
  readonly videoId: string;
  readonly feedSource: FeedSource;
  /** Reads the player's current position and duration, or null when it is not ready. */
  readonly readProgress: () => WatchProgressSnapshot | null;
}): WatchProgressBeaconControls {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // The reader is re-created on every render of the player component; holding it in a ref keeps
  // the interval and the unmount cleanup from closing over a stale one.
  const readProgressRef = useRef(readProgress);
  useEffect(() => {
    readProgressRef.current = readProgress;
  }, [readProgress]);

  // Sending the SAME playback-error code twice from one session tells the backend nothing new —
  // its threshold counts DISTINCT fingerprints, not reports — and would just spend the limiter.
  const reportedErrorCodesRef = useRef(new Set<number>());

  const sendBeacon = useCallback(
    (options: { readonly isFinalFlush: boolean }) => {
      const progress = readProgressRef.current();
      if (progress === null) return;

      const positionSeconds = Math.floor(progress.positionSeconds);
      const reportedDurationSeconds = Math.floor(progress.durationSeconds);

      // The player reports 0 for both until metadata lands. The backend requires
      // `reportedDurationSeconds >= 1`, so sending early is a guaranteed 422 rather than a
      // recorded sample — and 422s on the platform's tightest limiter are pure waste.
      if (reportedDurationSeconds < 1) return;
      if (positionSeconds < 0 || positionSeconds > MAXIMUM_VIDEO_SECONDS) return;
      if (reportedDurationSeconds > MAXIMUM_VIDEO_SECONDS) return;

      const body = { positionSeconds, reportedDurationSeconds, feedSource };

      if (options.isFinalFlush) {
        // The page may be going away mid-request. `keepalive` is what lets it finish.
        void recordViewBeacon(videoId, body, { keepalive: true });
        return;
      }
      void recordViewBeacon(videoId, body);
    },
    [videoId, feedSource],
  );

  const stopInterval = useCallback(() => {
    if (intervalRef.current === null) return;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const startReporting = useCallback(() => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(
      () => sendBeacon({ isFinalFlush: false }),
      BEACON_INTERVAL_MS,
    );
  }, [sendBeacon]);

  const stopReporting = useCallback(() => {
    stopInterval();
    // One last beacon so a viewer who watched 14 seconds and paused is not recorded as having
    // watched nothing. The clamp makes a slightly-early final report harmless.
    sendBeacon({ isFinalFlush: false });
  }, [stopInterval, sendBeacon]);

  const reportPlayerError = useCallback(
    (errorCode: number) => {
      // The backend validates against a closed union of five literals, so anything else is a
      // 422. Dropping it here is the honest move: we have no way to describe the failure in a
      // vocabulary the server accepts.
      if (!isReportablePlaybackErrorCode(errorCode)) return;
      if (reportedErrorCodesRef.current.has(errorCode)) return;
      reportedErrorCodesRef.current.add(errorCode);
      void reportPlaybackError(videoId, errorCode);
    },
    [videoId],
  );

  // Backgrounding a tab or navigating away is the COMMON exit from a video, not the rare one —
  // most sessions never reach a clean pause. Without this, most watch time on the platform is
  // whatever happened to land on a 15-second boundary.
  useEffect(() => {
    const flushOnLeave = () => {
      if (intervalRef.current === null) return;
      sendBeacon({ isFinalFlush: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushOnLeave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", flushOnLeave);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", flushOnLeave);
    };
  }, [sendBeacon]);

  // Unmount — navigating to another video within the app, which fires no `pagehide`.
  useEffect(
    () => () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        sendBeacon({ isFinalFlush: true });
      }
    },
    [sendBeacon],
  );

  return { startReporting, stopReporting, reportPlayerError };
}
