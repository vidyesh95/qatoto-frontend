"use client";

// TRANSPORT: props-only — renders a timestamp it is handed. No network.
//
// THE WHOLE POINT OF THIS FILE IS THAT IT IS A CLIENT COMPONENT.
//
// `"12 hours ago"` is a function of the current instant. Computing it during a server render
// under `cacheComponents` bakes the string into the cache entry: the page keeps insisting a
// video is 12 hours old for as long as that entry lives, and the browser disagrees with it the
// moment React hydrates. The bug is invisible in development, where nothing is cached long
// enough to drift.
//
// So: the FIRST paint — server-rendered, cacheable, correct forever — is an ABSOLUTE date.
// `useSyncExternalStore` then swaps in the relative label once we are in a browser and know
// what "now" is. `suppressHydrationWarning` sits on that one text node, because the server and
// the first client render agree there by construction and only the post-hydration render differs.
//
// Never compute relative time in a server component.

import { useSyncExternalStore } from "react";

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 604_800;
const SECONDS_PER_MONTH = 2_592_000; // 30 days — a display approximation, not a calendar month
const SECONDS_PER_YEAR = 31_536_000; // 365 days, same caveat

/** No clock to tick — the label is computed once after hydration, the same as the old effect. */
const subscribeToNothing = () => () => {};

function toUnitLabel(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
}

/**
 * `"12 hours ago"` for an instant in the past.
 *
 * A FUTURE timestamp reads "just now" rather than "-3 hours ago". Scheduled publishing exists,
 * and a row whose `publishedAt` is a few seconds ahead of the reader's clock is a clock skew,
 * not a video from the future.
 */
export function formatRelativeTimeLabel(isoInstant: string, nowMs: number): string {
  const publishedMs = Date.parse(isoInstant);
  if (Number.isNaN(publishedMs)) return "";

  const elapsedSeconds = Math.floor((nowMs - publishedMs) / 1000);
  if (elapsedSeconds < SECONDS_PER_MINUTE) return "just now";
  if (elapsedSeconds < SECONDS_PER_HOUR) {
    return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_MINUTE), "minute");
  }
  if (elapsedSeconds < SECONDS_PER_DAY) {
    return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_HOUR), "hour");
  }
  if (elapsedSeconds < SECONDS_PER_WEEK) {
    return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_DAY), "day");
  }
  if (elapsedSeconds < SECONDS_PER_MONTH) {
    return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_WEEK), "week");
  }
  if (elapsedSeconds < SECONDS_PER_YEAR) {
    return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_MONTH), "month");
  }
  return toUnitLabel(Math.floor(elapsedSeconds / SECONDS_PER_YEAR), "year");
}

/**
 * The cache-safe absolute label, and the first thing painted.
 *
 * `toISOString().slice(0, 10)` rather than `toLocaleDateString`: the latter reads the server's
 * locale and time zone during a server render, which produces a string the client would have
 * formatted differently — a hydration mismatch on top of the one we are already managing.
 */
function formatAbsoluteDateLabel(isoInstant: string): string {
  const publishedMs = Date.parse(isoInstant);
  if (Number.isNaN(publishedMs)) return "";
  return new Date(publishedMs).toISOString().slice(0, 10);
}

export default function RelativeTime({
  isoInstant,
  className,
}: {
  readonly isoInstant: string;
  readonly className?: string;
}) {
  const absoluteLabel = formatAbsoluteDateLabel(isoInstant);
  const label = useSyncExternalStore(
    subscribeToNothing,
    () => formatRelativeTimeLabel(isoInstant, Date.now()),
    () => absoluteLabel,
  );

  if (absoluteLabel === "") return null;

  return (
    <time dateTime={isoInstant} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
