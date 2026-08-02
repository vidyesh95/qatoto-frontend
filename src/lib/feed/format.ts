// TRANSPORT: props-only — pure formatting, no network and no `Date`.
//
// EVERYTHING HERE IS SAFE IN A SERVER COMPONENT, and that is the whole reason the module
// exists separately from relative time. A view count is not a function of the current
// instant, so formatting it during a cached server render produces a string that stays
// correct for the life of the cache entry. A relative timestamp is the opposite, and lives in
// `src/components/home/shared/relative-time.tsx` behind a client boundary.

/** Below this, print the exact number — "847" reads better than "0.8K". */
const THOUSAND = 1_000;
const MILLION = 1_000_000;
const BILLION = 1_000_000_000;

/**
 * Rounds toward zero at one decimal place and drops a trailing ".0".
 *
 * Integer arithmetic on purpose: `Math.round(value * 10) / 10` reintroduces float error and
 * can print "1000.0K" at the boundary. Truncating also means the label never overstates the
 * count, which is the right direction to be wrong about someone's view count.
 */
function toCompactLabel(count: number, unit: number, suffix: string): string {
  const tenths = Math.trunc((count * 10) / unit);
  const whole = Math.trunc(tenths / 10);
  const remainder = tenths % 10;
  return remainder === 0 ? `${whole}${suffix}` : `${whole}.${remainder}${suffix}`;
}

/**
 * A view count as the card renders it: `"847 views"`, `"25.1K views"`, `"1.4M views"`.
 *
 * Singular at exactly one. A negative count cannot happen — the backend `COALESCE`s these to
 * zero — but clamping is one line and beats rendering "-3 views" if it ever does.
 */
export function formatViewCountLabel(viewCount: number): string {
  const safeCount = Number.isFinite(viewCount) && viewCount > 0 ? Math.trunc(viewCount) : 0;

  if (safeCount === 1) return "1 view";
  if (safeCount < THOUSAND) return `${safeCount} views`;
  if (safeCount < MILLION) return `${toCompactLabel(safeCount, THOUSAND, "K")} views`;
  if (safeCount < BILLION) return `${toCompactLabel(safeCount, MILLION, "M")} views`;
  return `${toCompactLabel(safeCount, BILLION, "B")} views`;
}

/**
 * A bare compact count with no noun — for like/comment/share pills, where the icon says what
 * is being counted.
 */
export function formatCompactCountLabel(count: number): string {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;

  if (safeCount < THOUSAND) return String(safeCount);
  if (safeCount < MILLION) return toCompactLabel(safeCount, THOUSAND, "K");
  if (safeCount < BILLION) return toCompactLabel(safeCount, MILLION, "M");
  return toCompactLabel(safeCount, BILLION, "B");
}

/**
 * `412` -> `"6:52"`, `3725` -> `"1:02:05"`.
 *
 * Returns `null` for a null duration rather than "0:00". `video.durationSeconds` is null until
 * the nightly job has agreed a median across >= 5 independent sessions, and absence is not
 * zero: a card should render no duration badge at all rather than claim the video is empty.
 */
export function formatDurationLabel(durationSeconds: number | null): string | null {
  if (durationSeconds === null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const totalSeconds = Math.trunc(durationSeconds);
  const hours = Math.trunc(totalSeconds / 3600);
  const minutes = Math.trunc((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

/**
 * A subscriber count as the channel block renders it: `"14.2M subscribers"`.
 *
 * Separate from `formatViewCountLabel` only because the noun differs; sharing one function
 * with a noun parameter would read worse at both call sites.
 */
export function formatSubscriberCountLabel(subscriberCount: number): string {
  const safeCount =
    Number.isFinite(subscriberCount) && subscriberCount > 0 ? Math.trunc(subscriberCount) : 0;
  const noun = safeCount === 1 ? "subscriber" : "subscribers";
  return `${formatCompactCountLabel(safeCount)} ${noun}`;
}
