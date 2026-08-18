"use client";

// TRANSPORT: client-query — the React Query key factory for the staff metrics console.
//
// Every key starts with the literal `"admin-metrics"`, so `invalidateQueries({ queryKey:
// adminMetricsKeys.all })` clears this domain and nothing else. The staff CONTEXT read
// (`GET /admin/whoami`) is deliberately not here — it lives under `rndKeys.ownStaffContext()` and
// is shared with every other staff surface, so a second key for it would mean two cache entries
// disagreeing about what the caller may do.

import type { ActiveUserWindow, UserSegment } from "@/lib/admin/platform-metrics.schemas";

export const adminMetricsKeys = {
  all: ["admin-metrics"] as const,

  /**
   * THE WINDOW IS IN EVERY KEY, because it is the question rather than a filter over one answer.
   * Two windows are two different aggregations, and sharing an entry between them would show
   * ninety days of bars under a "last 7 days" heading for one render.
   */
  activeUsers: (fromDate: string, toDate: string, window: ActiveUserWindow) =>
    ["admin-metrics", "active-users", fromDate, toDate, window] as const,

  watchTime: (fromDate: string, toDate: string) =>
    ["admin-metrics", "watch-time", fromDate, toDate] as const,

  activityHours: (fromDate: string, toDate: string) =>
    ["admin-metrics", "activity-hours", fromDate, toDate] as const,

  retentionCohorts: (monthCount: number) =>
    ["admin-metrics", "retention-cohorts", monthCount] as const,

  /** The audited read. See `useUserSegmentQuery` for why it is not fetched on mount. */
  userSegment: (segment: UserSegment, limit: number) =>
    ["admin-metrics", "user-segment", segment, limit] as const,
};
