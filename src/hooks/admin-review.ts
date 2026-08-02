"use client";

// TRANSPORT: client-query — React Query over `@/lib/videos/admin-review.api`.
//
// `retry: false` on the list: a 403 is an ANSWER — this staff member does not hold
// `moderate_content` — not a flake, and retrying it three times just burns the limiter before
// showing the same refusal.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveReviewedVideo,
  listReviewQueue,
  rejectReviewedVideo,
  type ListReviewQueueFilter,
} from "@/lib/videos/admin-review.api";
import { unwrap } from "@/lib/http";

export const adminReviewKeys = {
  all: ["admin-review"] as const,
  queueRoot: () => ["admin-review", "queue"] as const,
  queue: (filter: ListReviewQueueFilter) =>
    ["admin-review", "queue", filter.status, filter.page, filter.limit] as const,
};

export function useReviewQueueQuery(filter: ListReviewQueueFilter = {}) {
  return useQuery({
    queryKey: adminReviewKeys.queue(filter),
    queryFn: async () => unwrap(await listReviewQueue(filter)),
    retry: false,
  });
}

function useReviewQueueInvalidation() {
  const queryClient = useQueryClient();
  // Invalidates EVERY status tab, not just the one in view: an approval moves a row from
  // `pending` to `approved`, so leaving the other tabs cached would show it twice.
  return (): void => {
    void queryClient.invalidateQueries({ queryKey: adminReviewKeys.queueRoot() });
  };
}

export function useApproveReviewedVideoMutation() {
  const invalidateQueue = useReviewQueueInvalidation();
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await approveReviewedVideo(videoId)),
    onSuccess: invalidateQueue,
  });
}

export function useRejectReviewedVideoMutation() {
  const invalidateQueue = useReviewQueueInvalidation();
  return useMutation({
    mutationFn: async (variables: { readonly videoId: string; readonly reason: string }) =>
      unwrap(await rejectReviewedVideo(variables.videoId, variables.reason)),
    onSuccess: invalidateQueue,
  });
}
