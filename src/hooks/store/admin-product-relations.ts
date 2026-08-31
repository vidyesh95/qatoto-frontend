"use client";

// TRANSPORT: client-query — the moderator's relation review list and its one action.
//
// ⚠️ `useKeysetList` HAS NO `enabled`, so the capability gate is "do not mount": the component
// renders the list only once `moderate_commerce` is confirmed. A locally-refusing `fetchPage` would
// write an invented refusal into the cache.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import type { ActionResponse } from "@/lib/http";
import {
  listProductRelationsForModeration,
  dismissProductRelation,
  verifyProductRelation,
  type ModerationProductRelation,
} from "@/lib/store/admin-product-relations.api";

export const productRelationModerationKeys = {
  all: ["store", "admin", "product-relations"] as const,
  queue: () => ["store", "admin", "product-relations", "queue"] as const,
};

export function useProductRelationModerationList(): KeysetListResult<ModerationProductRelation> {
  return useKeysetList<ModerationProductRelation>({
    queryKey: productRelationModerationKeys.queue(),
    // A client island with no server-rendered first page. Seeding an empty one would write a
    // fabricated, authoritative-looking empty list that then never refetches.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listProductRelationsForModeration(
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
 * Confirms one claim.
 *
 * ⚠️ **IRREVERSIBLE** — see the api file. The card confirms before calling this.
 *
 * Invalidates the root: a confirmed claim changes source kind, so it leaves this list entirely.
 */
export function useVerifyProductRelationMutation(): UseMutationResult<
  ActionResponse<unknown>,
  Error,
  { readonly relationId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ relationId, idempotencyKey }) =>
      verifyProductRelation(relationId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: productRelationModerationKeys.all });
    },
  });
}

/**
 * Refuses one claim.
 *
 * ⚠️ **IRREVERSIBLE, AND IT SUPPRESSES THE CLAIM FROM BUYERS** — see the api file. The card
 * confirms before calling this.
 *
 * ⚠️ **THE CARD OWNS A SEPARATE IDEMPOTENCY KEY FOR THIS ACTION.** A key shared with the confirm
 * mutation would replay the WRONG response: keys rotate only on success, so a failed confirm
 * followed by a dismiss would send the dismiss under the confirm attempt's key and the server would
 * hand back the verify result.
 *
 * Invalidates the root: a dismissed claim leaves this list entirely.
 */
export function useDismissProductRelationMutation(): UseMutationResult<
  ActionResponse<unknown>,
  Error,
  { readonly relationId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ relationId, idempotencyKey }) =>
      dismissProductRelation(relationId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: productRelationModerationKeys.all });
    },
  });
}
