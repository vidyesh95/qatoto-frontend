"use client";

// TRANSPORT: client-query — React Query over the two `/users/me/*` analytics reads and the
// creator's comment inbox.
//
// SESSION-SCOPED, SO NOT PREFETCHED ON THE SERVER. Every one of these describes the caller's own
// account, and the studio pages that use them are client islands behind a session.
//
// NOTHING HERE POLLS. These are counters, not a job whose verdict is pending — a refetch interval
// would put a permanent request on a page a creator leaves open.
import { useQuery } from "@tanstack/react-query";

import { unwrap } from "@/lib/http";
import { getCreatorSummary, listVideoAnalytics } from "@/lib/videos/analytics.api";
import { listMyVideoComments } from "@/lib/videos/comment-inbox.api";

export const creatorAnalyticsKeys = {
  summary: () => ["creator-analytics", "summary"] as const,
  videos: (page: number) => ["creator-analytics", "videos", page] as const,
  /**
   * The PREFIX every inbox page shares. Invalidating one cursor's key would leave the other
   * pages stale, and a deleted comment has to disappear from whichever page it sat on.
   */
  commentInboxRoot: () => ["creator-analytics", "comments"] as const,
  commentInbox: (cursor: string | null) => ["creator-analytics", "comments", cursor] as const,
};

/** Lifetime totals. Zeros for a creator who has published nothing — that is the true answer. */
export function useCreatorSummaryQuery() {
  return useQuery({
    queryKey: creatorAnalyticsKeys.summary(),
    queryFn: async () => unwrap(await getCreatorSummary()),
  });
}

/** Per-video counters, newest published first. Offset-paginated, matching the backend. */
export function useVideoAnalyticsQuery(page: number) {
  return useQuery({
    queryKey: creatorAnalyticsKeys.videos(page),
    queryFn: async () => unwrap(await listVideoAnalytics({ page, limit: 20 })),
  });
}

/**
 * The comment inbox. KEYSET, not offset — pass `null` for the first page and then only a cursor
 * the server handed back. A constructed cursor is a 422 by design.
 */
export function useCreatorInboxCommentsQuery(cursor: string | null) {
  return useQuery({
    queryKey: creatorAnalyticsKeys.commentInbox(cursor),
    queryFn: async () => unwrap(await listMyVideoComments(cursor)),
  });
}
