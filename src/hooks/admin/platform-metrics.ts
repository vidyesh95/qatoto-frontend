"use client";

// TRANSPORT: client-query — React Query over `@/lib/admin/platform-metrics.api`.

import { useQuery } from "@tanstack/react-query";

import { adminMetricsKeys } from "@/hooks/admin/keys";
import {
  getActiveUsers,
  getActivityByHour,
  getRetentionCohorts,
  getWatchTimeDistribution,
  listUserSegment,
} from "@/lib/admin/platform-metrics.api";
import type {
  ActiveUserWindow,
  MetricsDateWindow,
  UserSegment,
} from "@/lib/admin/platform-metrics.schemas";
import { unwrap } from "@/lib/http";

// `retry: false` ON EVERY READ HERE. The only error these routes produce is a 403 for want of
// `view_platform_metrics`, and a 403 is an answer about the caller, not a flake — retrying it
// three times just delays the refusal the page already knows how to render.

/** Daily active users, plus the rolling distinct count over the chosen width. */
export function useActiveUsersQuery(window: MetricsDateWindow, activeUserWindow: ActiveUserWindow) {
  return useQuery({
    queryKey: adminMetricsKeys.activeUsers(window.fromDate, window.toDate, activeUserWindow),
    queryFn: async () => unwrap(await getActiveUsers(window, activeUserWindow)),
    retry: false,
  });
}

/** Total, median and p90 watch seconds per day. */
export function useWatchTimeDistributionQuery(window: MetricsDateWindow) {
  return useQuery({
    queryKey: adminMetricsKeys.watchTime(window.fromDate, window.toDate),
    queryFn: async () => unwrap(await getWatchTimeDistribution(window)),
    retry: false,
  });
}

/** The 24-bucket hour-of-day histogram, UTC. */
export function useActivityByHourQuery(window: MetricsDateWindow) {
  return useQuery({
    queryKey: adminMetricsKeys.activityHours(window.fromDate, window.toDate),
    queryFn: async () => unwrap(await getActivityByHour(window)),
    retry: false,
  });
}

/** Signup-month cohorts against watch activity. */
export function useRetentionCohortsQuery(monthCount: number) {
  return useQuery({
    queryKey: adminMetricsKeys.retentionCohorts(monthCount),
    queryFn: async () => unwrap(await getRetentionCohorts(monthCount)),
    retry: false,
  });
}

/**
 * One of the two named lists — and the only hook here that is `enabled` by an argument.
 *
 * THIS READ WRITES TO THE PLATFORM AUDIT CHAIN. It returns accounts a human can go and act on,
 * so the backend records who looked. `isRequested` is therefore not a lazy-loading nicety: firing
 * it on mount would stamp an audit entry every time anybody opened the dashboard, and the entries
 * that matter — somebody deliberately pulling a list of people — would be lost among them.
 */
export function useUserSegmentQuery(segment: UserSegment, limit: number, isRequested: boolean) {
  return useQuery({
    queryKey: adminMetricsKeys.userSegment(segment, limit),
    queryFn: async () => unwrap(await listUserSegment(segment, limit)),
    enabled: isRequested,
    // The audit entry is the reason. A refetch on focus would write one every time the admin
    // alt-tabbed back to the tab, which is a lie about how often the list was actually consulted.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    retry: false,
  });
}
