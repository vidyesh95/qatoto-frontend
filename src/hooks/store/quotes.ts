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

import { useKeysetList, toCursorKeysetPage } from "@/hooks/keyset-list";
import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  acceptQuote,
  appendQuoteRevision,
  compareQuotesForQuote,
  compareQuotesForRfq,
  createQuoteShell,
  declineQuote,
  getQuote,
  listProviderQuotes,
  submitQuoteRevision,
  withdrawQuote,
} from "@/lib/store/quotes.api";
import type { CommerceOrder } from "@/lib/store/cart.schemas";
import type {
  AppendQuoteRevisionInput,
  AppendedQuoteRevision,
  ListProviderQuotesFilter,
  ProviderQuoteQueueItem,
  QuoteShell,
  SubmittedQuoteRevision,
} from "@/lib/store/quotes.schemas";

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

/**
 * Creates the empty quote shell on an RFQ.
 *
 * INVALIDATES THE RFQ ITSELF, not only the comparison, and that is not cosmetic: creating a shell
 * flips this provider's invitation to `responded`, which the RFQ detail renders as "Quoted". Leaving
 * the RFQ cached would show the provider a stale "not yet responded" beside a quote they just
 * started.
 */
export function useCreateQuoteShell(): UseMutationResult<
  ActionResponse<QuoteShell>,
  Error,
  { readonly rfqId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rfqId, idempotencyKey }) =>
      createQuoteShell(rfqId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quoteComparison(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfq(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerQuoteList() });
    },
  });
}

/**
 * Appends a priced revision to an existing shell.
 *
 * `rfqId` RIDES ON THE VARIABLES purely so the RFQ-scoped comparison key can be invalidated without a
 * second read — the mutation itself never sends it.
 *
 * NOTHING OPTIMISTIC AND NOTHING SEEDED. The response carries the server-computed money, and writing
 * it straight into the quote cache would be seeding a detail entry from a projection that has no
 * lines on it. Invalidate and let the read answer.
 */
export function useAppendQuoteRevision(): UseMutationResult<
  ActionResponse<AppendedQuoteRevision>,
  Error,
  {
    readonly quoteId: string;
    readonly rfqId: string;
    readonly input: AppendQuoteRevisionInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, input, idempotencyKey }) =>
      appendQuoteRevision(quoteId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { quoteId, rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quote(quoteId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.quoteComparison(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerQuoteList() });
    },
  });
}

/**
 * Freezes a revision and offers it to the buyer. Irreversible — the caller confirms first.
 *
 * Invalidates the provider's RFQ queue as well: a submitted quote is the thing that moves an RFQ out
 * of "waiting on me".
 */
export function useSubmitQuoteRevision(): UseMutationResult<
  ActionResponse<SubmittedQuoteRevision>,
  Error,
  {
    readonly quoteId: string;
    readonly rfqId: string;
    readonly revisionNumber: number;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quoteId, revisionNumber, idempotencyKey }) =>
      submitQuoteRevision(quoteId, revisionNumber, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result, { quoteId, rfqId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.quote(quoteId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.quoteComparison(rfqId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.rfqList("provider") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.providerQuoteList() });
    },
  });
}

/**
 * The provider's own bids, across every RFQ — the only list that yields a DRAFT quote's id.
 *
 * Keyset-paginated through the shared `useKeysetList`, so an abandoned quote is recoverable from one
 * page rather than by fanning out per RFQ.
 */
export function useProviderQuotesList(filter: ListProviderQuotesFilter = {}) {
  return useKeysetList<ProviderQuoteQueueItem>({
    queryKey: storeKeys.providerQuoteList(filter.status),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(
        await listProviderQuotes({
          ...filter,
          ...(token === null ? {} : { cursor: String(token) }),
        }),
      ),
  });
}
