"use client";

// TRANSPORT: client-query — the staff pathway moderation queue.
//
// ⚠️ `useKeysetList` HAS NO `enabled`, so the capability gate is "do not mount" — the component
// renders the queue only once `moderate_commerce` is confirmed. A locally-refusing `fetchPage`
// would write an invented refusal into the cache.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import type { ActionResponse } from "@/lib/http";
import { listPathwayModerationQueue, moderatePathway } from "@/lib/store/admin-pathways.api";
import type {
  ModeratePathwayInput,
  PathwayAuthoring,
  PathwayModeration,
} from "@/lib/store/pathway-authoring.schemas";

export const pathwayModerationKeys = {
  all: ["store", "admin", "pathways"] as const,
  queue: () => ["store", "admin", "pathways", "queue"] as const,
};

export function usePathwayModerationQueue(): KeysetListResult<PathwayModeration> {
  return useKeysetList<PathwayModeration>({
    queryKey: pathwayModerationKeys.queue(),
    // A client island with no server-rendered first page. Seeding an empty one would write a
    // fabricated, authoritative-looking empty queue that never refetches.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listPathwayModerationQueue(
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

/**
 * Publishes or rejects one set.
 *
 * ⚠️ **`publish` IS IRREVERSIBLE** — see the api file. The component confirms before calling.
 */
export function useModeratePathwayMutation(): UseMutationResult<
  ActionResponse<PathwayAuthoring>,
  Error,
  {
    readonly pathwayId: string;
    readonly input: ModeratePathwayInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pathwayId, input, idempotencyKey }) =>
      moderatePathway(pathwayId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: pathwayModerationKeys.all });
    },
  });
}
