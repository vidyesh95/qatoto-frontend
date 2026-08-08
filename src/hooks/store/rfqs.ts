"use client";

// TRANSPORT: client-query — React Query hooks over RFQs.
//
// NO VIEWER-ORGANIZATION QUERY HERE, unlike the order hooks. `RfqDetailProjection` carries
// `callerRelation`, so the relation arrives with the record and there is nothing to derive. One query,
// not two — which is also why the RFQ detail renders a step sooner than the order detail does.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  closeRfq,
  createDraftRfq,
  getRfq,
  listBuyerRfqs,
  listProviderRfqs,
  openRfq,
} from "@/lib/store/rfqs.api";
import type { CreateDraftRfqInput, RfqDetail } from "@/lib/store/rfqs.schemas";

/** `which` picks the ENDPOINT. The provider queue never contains a draft — see `rfqs.api.ts`. */
export function useRfqListQuery(which: "buyer" | "provider") {
  return useQuery({
    queryKey: storeKeys.rfqList(which),
    queryFn: () => (which === "buyer" ? listBuyerRfqs() : listProviderRfqs()),
  });
}

/**
 * One RFQ.
 *
 * GATED ON A NON-EMPTY ID because one caller reads this DEPENDENTLY: the quote detail learns its `rfqId`
 * from the quote, so it has to call this hook — unconditionally, as hook rules require — before it knows
 * the id. Without the gate that first render fires `GET /commerce/rfqs/` and caches a 404 under the empty
 * key. Every other caller has the id from its route params and is unaffected.
 */
export function useRfqQuery(rfqId: string) {
  return useQuery({
    queryKey: storeKeys.rfq(rfqId),
    queryFn: () => getRfq(rfqId),
    enabled: rfqId.length > 0,
  });
}

/**
 * Opens a draft, or fails with the server's findings.
 *
 * Invalidates BOTH lists on success: opening moves the RFQ out of the buyer's draft set and into every
 * matched provider's queue, so the provider list is stale the moment this returns.
 */
export function useOpenRfq(): UseMutationResult<
  ActionResponse<RfqDetail>,
  Error,
  { readonly rfqId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId }) => openRfq(rfqId),
    onSuccess: (result, { rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfq(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("provider") });
    },
  });
}

export function useCloseRfq(): UseMutationResult<
  ActionResponse<RfqDetail>,
  Error,
  { readonly rfqId: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId }) => closeRfq(rfqId),
    onSuccess: (result, { rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfq(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("provider") });
    },
  });
}

/**
 * Creates a DRAFT RFQ.
 *
 * INVALIDATES ONLY THE BUYER LIST. A draft is invisible to every provider — `/provider/rfqs` never contains
 * one — so invalidating the provider queue would refetch a list that cannot have changed. Opening the RFQ
 * is what makes it visible, and `useOpenRfq` invalidates both.
 *
 * NOT OPTIMISTIC and no cache seeding. The created RFQ's id comes from the server; writing a synthesised
 * draft into the cache would put a row on the buyer's list that nothing can open.
 */
export function useCreateDraftRfq(): UseMutationResult<
  ActionResponse<RfqDetail>,
  Error,
  { readonly input: CreateDraftRfqInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createDraftRfq(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("buyer") });
    },
  });
}
