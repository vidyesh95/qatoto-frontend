// TRANSPORT: client-query — the five `/admin/metrics/*` reads, all from a client island.
//
// EVERY QUERY SCHEMA ON THIS SURFACE IS `.strict()`. An unknown or misspelled key is a 422 that
// kills the whole read rather than an ignored filter, so `buildQueryString` is handed exactly the
// keys the backend declares and nothing else.
//
// `fromDate` AND `toDate` ARE BOTH REQUIRED — there is no default window. A read that omits one is
// a 422, which is the backend refusing to guess how much history a dashboard meant to scan.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  ActiveUsersSeriesSchema,
  ActivityHourSeriesSchema,
  RetentionCohortListSchema,
  SegmentUserListSchema,
  WatchTimeSeriesSchema,
  type ActiveUsersPoint,
  type ActiveUserWindow,
  type ActivityHourBucket,
  type MetricsDateWindow,
  type RetentionCohortRow,
  type SegmentUserRow,
  type UserSegment,
  type WatchTimePoint,
} from "@/lib/admin/platform-metrics.schemas";

/** Daily active users plus the rolling distinct count over the chosen width. */
export function getActiveUsers(
  window: MetricsDateWindow,
  activeUserWindow: ActiveUserWindow,
  options?: RequestOptions,
): Promise<ActionResponse<ActiveUsersPoint[]>> {
  return getJson(
    `/admin/metrics/active-users${buildQueryString({
      fromDate: window.fromDate,
      toDate: window.toDate,
      window: activeUserWindow,
    })}`,
    ActiveUsersSeriesSchema,
    options,
  );
}

/** Total, median and p90 watch seconds per day across the window. */
export function getWatchTimeDistribution(
  window: MetricsDateWindow,
  options?: RequestOptions,
): Promise<ActionResponse<WatchTimePoint[]>> {
  return getJson(
    `/admin/metrics/watch-time${buildQueryString({
      fromDate: window.fromDate,
      toDate: window.toDate,
    })}`,
    WatchTimeSeriesSchema,
    options,
  );
}

/** The 24-bucket histogram, summed across the window. UTC, always. */
export function getActivityByHour(
  window: MetricsDateWindow,
  options?: RequestOptions,
): Promise<ActionResponse<ActivityHourBucket[]>> {
  return getJson(
    `/admin/metrics/activity-hours${buildQueryString({
      fromDate: window.fromDate,
      toDate: window.toDate,
    })}`,
    ActivityHourSeriesSchema,
    options,
  );
}

/** Signup-month cohorts against watch activity, `monthCount` months wide (1..25). */
export function getRetentionCohorts(
  monthCount: number,
  options?: RequestOptions,
): Promise<ActionResponse<RetentionCohortRow[]>> {
  return getJson(
    `/admin/metrics/retention-cohorts${buildQueryString({ months: String(monthCount) })}`,
    RetentionCohortListSchema,
    options,
  );
}

/**
 * One of the two named lists — THE AUDITED READ.
 *
 * It answers "who watches the most" and "who has gone quiet" with accounts a human can act on,
 * assembled from a behavioural record the subject cannot see being assembled, so the backend
 * stamps the platform audit chain on every call. The caller must therefore fire it on an explicit
 * action, never on page load: a dashboard that refreshed this would bury the entries that name a
 * person under entries nobody asked for.
 */
export function listUserSegment(
  segment: UserSegment,
  limit: number,
  options?: RequestOptions,
): Promise<ActionResponse<SegmentUserRow[]>> {
  return getJson(
    `/admin/metrics/users${buildQueryString({ segment, limit: String(limit) })}`,
    SegmentUserListSchema,
    options,
  );
}
