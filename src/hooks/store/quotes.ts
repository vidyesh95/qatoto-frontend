"use client";

// TRANSPORT: client-query — React Query hooks over quotes and quote comparison.
//
// THE ACCEPT MUTATION TAKES AN IDEMPOTENCY KEY AND AN EXPECTED REVISION, and neither is minted here.
// The key belongs in component state, once per attempt — the same rule checkout follows. The expected
// revision belongs to whatever the buyer was LOOKING AT when they decided, which is a fact about the
// rendered page and not something a hook can know.
//
// NOTHING IS OPTIMISTIC. Acceptance creates immutable orders; a UI that showed "accepted" before the
// server agreed would be claiming an order exists.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  acceptQuote,
  compareQuotesForQuote,
  compareQuotesForRfq,
  declineQuote,
  getQuote,
  withdrawQuote,
} from "@/lib/store/quotes.api";
import type { CommerceOrder } from "@/lib/store/cart.schemas";
import type { QuoteShell } from "@/lib/store/quotes.schemas";

export function useQuoteQuery(quoteId: string) {
  return useQuery({
    queryKey: storeKeys.quote(quoteId),
    queryFn: () => getQuote(quoteId),
  });
}

/** The canonical comparison read: keyed on the RFQ, because that is what the quotes answer. */
export function useQuoteComparisonQuery(rfqId: string) {
  return useQuery({
    queryKey: storeKeys.quoteComparison(rfqId),
    queryFn: () => compareQuotesForRfq(rfqId),
  });
}

/**
 * The quote-scoped comparison — two round trips, because there is no quote-scoped endpoint.
 *
 * Keyed by QUOTE id rather than RFQ id, deliberately: the cache entry has to be invalidatable from a
 * page that only knows the quote. It returns the resolved `rfqId` alongside the rows so the page can
 * link to the canonical route.
 */
export function useQuoteComparisonByQuoteQuery(quoteId: string) {
  return useQuery({
    queryKey: storeKeys.quoteComparisonByQuote(quoteId),
    queryFn: () => compareQuotesForQuote(quoteId),
  });
}

/**
 * Accepts one revision.
 *
 * Invalidates the quote, its comparison, and BOTH order lists — acceptance creates orders, so the buyer
 * queue and the counterparty queue are both stale the moment this returns. It does NOT invalidate the
 * RFQ: awarding it is the server's business and the RFQ read will say so on its own next fetch.
 */
export function useAcceptQuote(): UseMutationResult<
  ActionResponse<CommerceOrder>,
  Error,
  {
    readonly quoteId: string;
    readonly expectedRevision: number;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, expectedRevision, idempotencyKey }) =>
      acceptQuote(
        quoteId,
        // `settlementAgreementId` omitted: the DEFAULT rail is `direct_offline`, where nobody holds the
        // funds. Naming one is an explicit act both parties negotiated first, and this surface has none.
        { expectedRevision },
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (result, { quoteId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quote(quoteId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("provider") });
    },
  });
}

export function useDeclineQuote(): UseMutationResult<
  ActionResponse<QuoteShell>,
  Error,
  { readonly quoteId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId }) => declineQuote(quoteId),
    onSuccess: (result, { quoteId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quote(quoteId) });
    },
  });
}

export function useWithdrawQuote(): UseMutationResult<
  ActionResponse<QuoteShell>,
  Error,
  { readonly quoteId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId }) => withdrawQuote(quoteId),
    onSuccess: (result, { quoteId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quote(quoteId) });
    },
  });
}
