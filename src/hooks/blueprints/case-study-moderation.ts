"use client";

// TRANSPORT: client-query — the case-study review queue and its decision, over
// `@/lib/blueprints/case-study-moderation.api`, which is mock-backed today. Written as if the api
// were real, so this file does not change on the day it is.
//
// ⚠️ `useKeysetList` HAS NO `enabled`, so the capability gate is "do not mount", as on the pathway
// queue: the page renders the queue only once `moderate_content` is confirmed.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  listCaseStudyReviewQueue,
  moderateCaseStudySubmission,
} from "@/lib/blueprints/case-study-moderation.api";
import type {
  CaseStudyModerationDecision,
  CaseStudyModerationResult,
  CaseStudyReviewItem,
} from "@/lib/blueprints/case-study-moderation.schemas";
import type { ActionResponse } from "@/lib/http";

export function useCaseStudyReviewQueue(): KeysetListResult<CaseStudyReviewItem> {
  return useKeysetList<CaseStudyReviewItem>({
    queryKey: blueprintKeys.caseStudyReviewQueue(),
    // No server-rendered first page; seeding an empty one would fake an empty queue.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listCaseStudyReviewQueue(
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
export function useRefreshCaseStudyReviewQueue(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: blueprintKeys.caseStudyReviewQueue() });
  };
}

/**
 * Publishes or sends back one case study.
 *
 * Returns the `ActionResponse` rather than throwing, on the pathway queue's pattern, so the card
 * branches on `success` and can tell a 409 from any other refusal. The key is the card's.
 */
export function useModerateCaseStudyMutation(): UseMutationResult<
  ActionResponse<CaseStudyModerationResult>,
  Error,
  {
    readonly submissionId: string;
    readonly decision: CaseStudyModerationDecision;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => moderateCaseStudySubmission(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.caseStudyReviewQueue() });
    },
  });
}
