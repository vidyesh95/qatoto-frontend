// TRANSPORT: props-only — pure functions over rows already fetched. No network.
//
// GROUPING WATCH HISTORY INTO DATE HEADERS, AND THE TIME-ZONE TRAP UNDER IT.
//
// "Today" is a function of the reader's clock AND their time zone. Computing it during a
// server render bakes it into the `cacheComponents` entry — the page keeps insisting a
// video was watched "Today" for as long as that entry lives, and the browser disagrees the
// moment React hydrates. This is the same bug `@/components/home/shared/relative-time.tsx`
// was written to document, and it is invisible in development where nothing caches long
// enough to drift.
//
// So there are TWO date keys here, on purpose:
//
//   toUtcDateKey    deterministic, safe in a server render, safe through hydration.
//   toLocalDateKey  correct for the reader, only valid AFTER hydration.
//
// `<HistoryList>` renders the first, then swaps to the second once `useIsHydrated()` flips.
// Never call the local one during a server render.

import type { FeedVideo } from "@/lib/feed/schemas";

const MILLISECONDS_PER_DAY = 86_400_000;

/** One date heading and the rows under it, in the order the server returned them. */
export interface WatchHistoryDateGroup {
  /** Stable across a re-group, so React keys survive the hydration swap. */
  readonly dateKey: string;
  readonly label: string;
  readonly videos: readonly FeedVideo[];
}

/**
 * `2026-08-14` in UTC.
 *
 * `toISOString().slice(0, 10)` rather than `toLocaleDateString`: the latter reads the SERVER's
 * locale and time zone during a server render and produces a string the client would have
 * formatted differently — a second hydration mismatch on top of the one being managed.
 */
export function toUtcDateKey(isoInstant: string): string {
  return isoInstant.slice(0, 10);
}

/**
 * `2026-08-14` for an instant, in the READER's zone. Browser-only — see the banner.
 *
 * Shifts by the zone offset and then formats in UTC, rather than reading `getFullYear()` and
 * friends and padding by hand. Same result, and it cannot produce `2026-8-4`.
 */
export function toLocalDateKey(instant: Date): string {
  const shiftedToLocalMs = instant.getTime() - instant.getTimezoneOffset() * 60_000;
  return new Date(shiftedToLocalMs).toISOString().slice(0, 10);
}

/** `toLocalDateKey` over an ISO string, which is the shape `toWatchHistoryDateGroups` wants. */
export function toLocalDateKeyOf(isoInstant: string): string {
  const parsed = new Date(isoInstant);
  // An unparseable instant falls back to the UTC key rather than throwing mid-render. The
  // boundary schema makes this unreachable; the fallback is here so it stays unreachable.
  return Number.isNaN(parsed.getTime()) ? toUtcDateKey(isoInstant) : toLocalDateKey(parsed);
}

/**
 * `Today` / `Yesterday` / `14 August 2026`, relative to the reader's own day.
 *
 * The comparison is between DATE KEYS, never between instants: "yesterday" means the calendar
 * day before this one, which is not the same as "24 to 48 hours ago" across a DST boundary.
 */
export function toLocalDateLabel(dateKey: string, nowMs: number): string {
  if (dateKey === toLocalDateKey(new Date(nowMs))) return "Today";
  if (dateKey === toLocalDateKey(new Date(nowMs - MILLISECONDS_PER_DAY))) return "Yesterday";

  // Parsed as UTC midnight and formatted in UTC, so the label names the same calendar day the
  // key does — formatting it in the local zone would shift it back a day west of Greenwich.
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Splits an ALREADY-SORTED list into consecutive date groups.
 *
 * ONE PASS, AND NO SORTING. The server orders this list by the same `max(first_beacon_at)`
 * expression it puts in `watchedAt`, and re-sorting a fetched page client-side is exactly what
 * the architecture rules forbid — it would also reorder rows against the pagination the next
 * page continues from. A row whose key repeats after the group closed therefore starts a NEW
 * group rather than rejoining the old one, which is the honest render of a backend that sent
 * them out of order.
 *
 * A row with no `watchedAt` is dropped rather than bucketed under a guess. That only happens if
 * this is called on a non-`watched` feed mode, where the field is absent by contract — and a
 * silent "Today" for a video nobody watched today is worse than an omission.
 */
export function toWatchHistoryDateGroups(
  videos: readonly FeedVideo[],
  toDateKey: (isoInstant: string) => string,
  toLabel: (dateKey: string) => string,
): readonly WatchHistoryDateGroup[] {
  const groups: WatchHistoryDateGroup[] = [];
  let currentKey: string | null = null;
  let currentVideos: FeedVideo[] = [];

  for (const video of videos) {
    if (video.watchedAt === undefined) continue;
    const dateKey = toDateKey(video.watchedAt);

    if (dateKey !== currentKey) {
      if (currentKey !== null) {
        groups.push({ dateKey: currentKey, label: toLabel(currentKey), videos: currentVideos });
      }
      currentKey = dateKey;
      currentVideos = [];
    }
    currentVideos.push(video);
  }

  if (currentKey !== null) {
    groups.push({ dateKey: currentKey, label: toLabel(currentKey), videos: currentVideos });
  }
  return groups;
}
