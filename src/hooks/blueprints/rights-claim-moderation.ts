"use client";

// TRANSPORT: client-query — the rights-claim queue and its dismissal, over
// `@/lib/blueprints/rights-claim-moderation.api`. Flagging or quarantining against a claim is
// `useBlueprintModerationMutation` with `rightsClaimId`, in `content-moderation.ts`.
//
// ⚠️ NOTHING IS OPTIMISTIC. A 409 means another moderator answered the claim first; the card
// renders the server's sentence and offers a refresh.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  dismissRightsClaim,
  listRightsClaimQueue,
} from "@/lib/blueprints/rights-claim-moderation.api";
import type {
  DismissedRightsClaim,
  RightsClaimQueueItem,
  RightsClaimStatus,
} from "@/lib/blueprints/rights-claim-moderation.schemas";
import type { ActionResponse } from "@/lib/http";

/**
 * One tab of the claim queue. No `enabled`: the page mounts this only once `moderate_content` is
 * confirmed, the gate every blueprint review queue uses.
 */
export function useRightsClaimQueue(
  status: RightsClaimStatus,
): KeysetListResult<RightsClaimQueueItem> {
  return useKeysetList<RightsClaimQueueItem>({
    queryKey: blueprintKeys.rightsClaimQueue(status),
    // No server-rendered first page; seeding an empty one would fake an empty queue.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listRightsClaimQueue({
        status,
        ...(typeof token === "string" ? { cursor: token } : {}),
      });
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

export function useRefreshRightsClaimQueue(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: blueprintKeys.rightsClaimQueueRoot() });
  };
}

/** Dismiss one claim. ⚠️ This restores nothing — see the transport's docblock. */
export function useDismissRightsClaimMutation(): UseMutationResult<
  ActionResponse<DismissedRightsClaim>,
  Error,
  { readonly claimId: string; readonly resolutionNote: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables) => dismissRightsClaim(variables),
    onSuccess: (result) => {
      if (!result.success) return;
      // Every tab: the row leaves Open and arrives in Dismissed.
      void queryClient.invalidateQueries({ queryKey: blueprintKeys.rightsClaimQueueRoot() });
    },
  });
}
