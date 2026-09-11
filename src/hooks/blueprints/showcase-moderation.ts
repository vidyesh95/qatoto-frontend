"use client";

// TRANSPORT: client-query — the showcase launch review queue and its decision, over
// `@/lib/blueprints/showcase-moderation.api`.
//
// ⚠️ `useKeysetList` HAS NO `enabled`, so the capability gate is "do not mount", as on the case-study
// queue: the page renders the queue only once `moderate_content` is confirmed.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  listShowcaseReviewQueue,
  moderateShowcaseSubmission,
} from "@/lib/blueprints/showcase-moderation.api";
import type {
  ShowcaseModerationDecision,
  ShowcaseModerationResult,
  ShowcaseReviewItem,
} from "@/lib/blueprints/showcase-moderation.schemas";
import type { ActionResponse } from "@/lib/http";

export function useShowcaseReviewQueue(): KeysetListResult<ShowcaseReviewItem> {
  return useKeysetList<ShowcaseReviewItem>({
    queryKey: blueprintKeys.showcaseReviewQueue(),
    // No server-rendered first page; seeding an empty one would fake an empty queue.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listShowcaseReviewQueue(
        typeof token === "string" ? { cursor: token } : {},
      );
      return toCursorKeysetPage(
        result.success
          ? {
              success: true,
              data: { rows: result.data.items, nextCursor: result.data.page.nextCursor },
            }
          : result,
      );
    },
  });
}

/** Refetches the queue, for the card's "Refresh the queue" after a 409. */
export function useRefreshShowcaseReviewQueue(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: blueprintKeys.showcaseReviewQueue() });
  };
}

/**
 * Publishes or sends back one launch.
 *
 * Returns the `ActionResponse` rather than throwing, so the card branches on `success` and can tell
 * a 409 from any other refusal. The key is the card's.
 */
export function useModerateShowcaseMutation(): UseMutationResult<
  ActionResponse<ShowcaseModerationResult>,
  Error,
  {
    readonly submissionId: string;
    readonly decision: ShowcaseModerationDecision;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => moderateShowcaseSubmission(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.showcaseReviewQueue() });
    },
  });
}
