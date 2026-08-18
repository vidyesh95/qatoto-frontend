// TRANSPORT: props-only — schemas and pure window arithmetic, no network of its own.
//
// Client contract for the five `/admin/metrics/*` reads (backend HOME_BACKEND_STRUCTURE.md §3.3a).
// Every one of them is behind `view_platform_metrics`, held by `admin` alone.
//
// FOUR OF THE FIVE NAME NOBODY. `active-users`, `watch-time`, `activity-hours` and
// `retention-cohorts` are aggregates. `users` returns named accounts and is the ONE read on this
// surface that writes to the platform audit chain — see `user-segment-list.tsx` for why it is
// behind a click rather than fired on page load.
//
// `null` IS NOT ZERO on the median and p90 columns: there is no median of an empty set, so a day
// nobody watched answers `null` and must render as a gap rather than a floor.

import { z } from "zod";

/** A bare UTC calendar date, `YYYY-MM-DD`. Not an instant — every column these filter is a date. */
const IsoDateSchema = z.string();

export const ActiveUsersPointSchema = z
  .object({
    date: IsoDateSchema,
    activeUserCount: z.number().int().nonnegative(),
    /**
     * Distinct users in the N days ENDING on this date, where N is the chosen window — not the sum
     * of the daily counts beside it. One person watching every day is seven daily counts and one
     * weekly one.
     */
    rollingActiveUserCount: z.number().int().nonnegative(),
  })
  .strip();

export const WatchTimePointSchema = z
  .object({
    date: IsoDateSchema,
    totalWatchedSeconds: z.number().int().nonnegative(),
    watchingUserCount: z.number().int().nonnegative(),
    medianWatchedSecondsPerUser: z.number().int().nonnegative().nullable(),
    p90WatchedSecondsPerUser: z.number().int().nonnegative().nullable(),
  })
  .strip();

export const ActivityHourBucketSchema = z
  .object({
    /** 0..23, UTC. There is no per-user zone on this platform, so this axis cannot be localised. */
    hour: z.number().int().min(0).max(23),
    /**
     * A SUM OF PER-DAY DISTINCTS, and the label on the chart says so. One person watching at 21:00
     * every night for a month contributes thirty, which is the number that answers "how busy is
     * 21:00" — a distinct-across-the-window count would answer a different question.
     */
    activeUserDayCount: z.number().int().nonnegative(),
    watchedSeconds: z.number().int().nonnegative(),
  })
  .strip();

export const RetentionCohortRowSchema = z
  .object({
    /** `YYYY-MM` — the month these accounts signed up in. */
    cohortMonth: z.string(),
    cohortUserCount: z.number().int().nonnegative(),
    /**
     * RETAINED COUNTS, NOT PERCENTAGES, and the array is RAGGED: its length is the largest offset
     * that had any activity, so trailing offsets are absent rather than zero. Index 0 is the signup
     * month itself, which is why it is rarely the whole cohort.
     */
    retainedByMonthOffset: z.array(z.number().int().nonnegative()),
  })
  .strip();

export const SegmentUserRowSchema = z
  .object({
    userId: z.string(),
    handle: z.string().nullable(),
    displayName: z.string(),
    watchedSecondsInWindow: z.number().int().nonnegative(),
    lastActiveDate: IsoDateSchema.nullable(),
  })
  .strip();

export const ActiveUsersSeriesSchema = z.array(ActiveUsersPointSchema);
export const WatchTimeSeriesSchema = z.array(WatchTimePointSchema);
export const ActivityHourSeriesSchema = z.array(ActivityHourBucketSchema);
export const RetentionCohortListSchema = z.array(RetentionCohortRowSchema);
export const SegmentUserListSchema = z.array(SegmentUserRowSchema);

export type ActiveUsersPoint = z.infer<typeof ActiveUsersPointSchema>;
export type WatchTimePoint = z.infer<typeof WatchTimePointSchema>;
export type ActivityHourBucket = z.infer<typeof ActivityHourBucketSchema>;
export type RetentionCohortRow = z.infer<typeof RetentionCohortRowSchema>;
export type SegmentUserRow = z.infer<typeof SegmentUserRowSchema>;

/**
 * The rolling width the active-users read is asked for. `"day"` is DAU, `"week"` WAU, `"month"` MAU.
 * A named enum rather than a free integer, because an arbitrary width is a different question with
 * no agreed name — the backend takes exactly these three.
 */
export const ACTIVE_USER_WINDOWS = ["day", "week", "month"] as const;
export type ActiveUserWindow = (typeof ACTIVE_USER_WINDOWS)[number];

/**
 * The two named lists. SNAKE_CASE ON THE WIRE, verbatim — these byte-match the backend's own enum
 * and "correcting" one to kebab-case is a 422 (CLAUDE.md — wire casing).
 */
export const USER_SEGMENTS = ["top_watchers", "at_risk"] as const;
export type UserSegment = (typeof USER_SEGMENTS)[number];

/** The window every windowed read is asked for. Both ends inclusive, both `YYYY-MM-DD`. */
export interface MetricsDateWindow {
  readonly fromDate: string;
  readonly toDate: string;
}
