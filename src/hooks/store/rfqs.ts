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
  inviteRfqProviders,
  getRfq,
  listBuyerRfqs,
  listProviderRfqs,
  openRfq,
} from "@/lib/store/rfqs.api";
import type { CreateDraftRfqInput, RfqDetail, RfqInvitation } from "@/lib/store/rfqs.schemas";

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
  { readonly rfqId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    // ⚠️ **THE KEY IS REQUIRED AND WAS MISSING, SO THIS BUTTON ANSWERED 400 EVERY TIME.** Both
    // `/open` and `/close` carry `idempotency({ required: true })`, and `sendJson` mints no header
    // of its own — so a hook that called `openRfq(rfqId)` with no options sent a request the route
    // refuses outright. `rfqs.api.ts`'s header had already recorded that these two need a key;
    // only the hooks had not caught up. Reproduced against the running backend before fixing:
    // `POST /commerce/rfqs/:id/open` with no header is
    // `400 This request requires an Idempotency-Key header.`
    mutationFn: ({ rfqId, idempotencyKey }) =>
      openRfq(rfqId, { headers: { "Idempotency-Key": idempotencyKey } }),
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
  { readonly rfqId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    // Same required key, same fix — see `useOpenRfq` above.
    mutationFn: ({ rfqId, idempotencyKey }) =>
      closeRfq(rfqId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfq(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("provider") });
    },
  });
}

/**
 * Invites providers to an OPEN RFQ.
 *
 * ⚠️ **ALL OR NOTHING.** The server runs the whole list in one transaction, so one ineligible or
 * duplicate id rolls the entire call back — and the refusal names no id. The picker's job is to
 * offer only providers the gate will accept; this hook's job is to surface the sentence verbatim
 * when it does not.
 *
 * ⚠️ **IRREVERSIBLE** — no withdraw route exists.
 *
 * Invalidates the RFQ rather than painting from the response: the 201 carries only the rows just
 * created, not the full invitation set.
 */
export function useInviteRfqProviders(): UseMutationResult<
  ActionResponse<{ invitations: RfqInvitation[] }>,
  Error,
  {
    readonly rfqId: string;
    readonly providerOrganizationIds: readonly string[];
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId, providerOrganizationIds, idempotencyKey }) =>
      inviteRfqProviders(
        rfqId,
        { providerOrganizationIds },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (result, { rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfq(rfqId) });
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
