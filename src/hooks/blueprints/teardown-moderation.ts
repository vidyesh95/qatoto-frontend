"use client";

// TRANSPORT: client-query — the teardown review queue and its decision, over
// `@/lib/blueprints/teardown-moderation.api`.
//
// ⚠️ `useKeysetList` HAS NO `enabled`, so the capability gate is "do not mount", as on both sibling
// queues: the page renders this only once `moderate_content` is confirmed.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  listTeardownReviewQueue,
  moderateTeardownSubmission,
} from "@/lib/blueprints/teardown-moderation.api";
import type {
  TeardownModerationDecision,
  TeardownModerationResult,
  TeardownReviewItem,
} from "@/lib/blueprints/teardown-moderation.schemas";
import type { ActionResponse } from "@/lib/http";

export function useTeardownReviewQueue(): KeysetListResult<TeardownReviewItem> {
  return useKeysetList<TeardownReviewItem>({
    queryKey: blueprintKeys.teardownReviewQueue(),
    // No server-rendered first page; seeding an empty one would fake an empty queue.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listTeardownReviewQueue(
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
export function useRefreshTeardownReviewQueue(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: blueprintKeys.teardownReviewQueue() });
  };
}

/**
 * Publishes or sends back one submission.
 *
 * Returns the `ActionResponse` rather than throwing, on both siblings' pattern, so the card branches
 * on `success` and can tell a 409 from any other refusal. The key is the card's.
 */
export function useModerateTeardownMutation(): UseMutationResult<
  ActionResponse<TeardownModerationResult>,
  Error,
  {
    readonly submissionId: string;
    readonly decision: TeardownModerationDecision;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => moderateTeardownSubmission(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.teardownReviewQueue() });
    },
  });
}
