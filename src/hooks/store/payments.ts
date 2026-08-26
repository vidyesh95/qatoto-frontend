"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/payments.api`.
//
// THIS IS THE HOOK FILE WHERE A `202` BECOMES A VERDICT, and the whole design follows from that.
//
// `POST …/payment-intents` answers 202 with an intent in state `created`. The provider call happens
// afterwards, through an outbox. So the mutation cannot report whether the order was paid, and the
// only honest thing it can do is hand back an id and let a query watch it.
//
// THE DECISION TO KEEP POLLING IS MADE FROM THE FETCHED INTENT, never from a flag the caller passes.
// A caller-supplied `shouldPoll` goes stale the moment the server disagrees, and on this surface
// that means either a spinner that never stops on a settled payment or a poll that stops on a
// payment still in flight. `refetchInterval` reads `query.state.data` instead, which is by
// construction the freshest answer anyone has.
//
// NOTHING HERE IS OPTIMISTIC. There is no `onMutate` and no cached intent written ahead of the
// server. An optimistic payment state is an optimistic receipt.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import type { CreateRefundInput, Refund } from "@/lib/store/payments.schemas";
import {
  createPaymentIntent,
  createRefund,
  getPaymentIntent,
  listRefunds,
} from "@/lib/store/payments.api";
import { isPaymentIntentInFlight, type PaymentIntent } from "@/lib/store/payments.schemas";

/**
 * How often to re-ask while a payment is in flight.
 *
 * Two seconds, matching `useEffortClaimQuery` in the R&D domain — the same shape of problem, and one
 * cadence across the app beats two arbitrary ones. Fast enough that a settled payment appears while
 * the buyer is still looking at the screen, slow enough that a stuck outbox is not a request storm.
 */
const PAYMENT_INTENT_POLL_INTERVAL_MS = 2_000;

/**
 * One payment intent, self-polling while its verdict is outstanding.
 *
 * `enabled` on a non-null id, because the id comes from `order.paymentIntentId` and null there is a
 * real state — nothing created yet, or every attempt terminally failed — not a loading one.
 *
 * `retry: false`: a 403 or 404 from this route is an answer about who the caller is, not a flake.
 *
 * WHEN IT STOPS. `isPaymentIntentInFlight` is false for `settled`, `failed`, `cancelled` and the
 * three post-settlement states, so the poll ends on every terminal answer. A failed FETCH also stops
 * it — `data.success === false` is not an in-flight intent, and hammering a route that just refused
 * would spend the caller's rate limit to re-read the same refusal.
 */
export function usePaymentIntentQuery(paymentIntentId: string | null) {
  return useQuery({
    queryKey: storeKeys.paymentIntent(paymentIntentId ?? "none"),
    queryFn: () => {
      if (paymentIntentId === null) throw new Error("Missing payment intent id");
      return getPaymentIntent(paymentIntentId);
    },
    enabled: paymentIntentId !== null,
    retry: false,
    refetchInterval: (query) => {
      const result = query.state.data;
      if (result === undefined || !result.success) return false;
      return isPaymentIntentInFlight(result.data.state) ? PAYMENT_INTENT_POLL_INTERVAL_MS : false;
    },
  });
}

/**
 * Refunds against one order.
 *
 * Keyed by order id and always filtered by it: this hook is the order page's refund history, not the
 * organization-wide inbox. Both parties may read it.
 */
export function useOrderRefundsQuery(orderId: string) {
  return useQuery({
    queryKey: storeKeys.orderRefunds(orderId),
    queryFn: () => listRefunds({ orderId }),
    enabled: orderId.length > 0,
  });
}

/**
 * Starts paying an order.
 *
 * ON SUCCESS IT INVALIDATES THE ORDER RATHER THAN WRITING A STATE. The 202 tells us a row exists and
 * nothing else; the order's `state` and its `paymentIntentId` both change server-side, and the order
 * read is what knows them. Writing `payment_processing` into the cache from here would be the client
 * asserting a transition it did not observe.
 *
 * IT DOES NOT SEED THE INTENT CACHE EITHER, deliberately. The returned intent is `created` by
 * construction, and `setQueryData`-ing it would start the poll from a value already one round trip
 * stale — the query fetches it fresh, which is the same request the poll was going to make anyway.
 *
 * Both order lists are invalidated because a paid order moves in the buyer's queue and the seller's.
 */
export function useCreatePaymentIntent(): UseMutationResult<
  ActionResponse<PaymentIntent>,
  Error,
  { readonly orderId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, idempotencyKey }) =>
      // REQUIRED BY THE ROUTE — without the header the middleware answers 400 before the service is
      // reached. Minted once per attempt in the component, never here: a key minted in this hook
      // would be fresh on every call, and a retried payment with a fresh key is a second charge.
      createPaymentIntent(orderId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.order(orderId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("buyer") });
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderList("provider") });
    },
  });
}

/**
 * Requests a refund against an order.
 *
 * NOTHING OPTIMISTIC, for the same reason the payment mutation above writes nothing: a `202` says a
 * row exists and the provider has been asked, not that money moved. The refund history query is
 * invalidated so the new row appears in whatever state the server actually gave it.
 *
 * THE ORDER IS INVALIDATED TOO. A refund moves `order.paymentState` to `partially_refunded` or
 * `refunded`, and that transition belongs to the order read — writing it here would be the client
 * asserting a state it did not observe.
 *
 * The key is minted in the component, never in this hook: a key minted here would be fresh on every
 * call, and a retried refund with a fresh key refunds twice.
 */
export function useCreateRefund(): UseMutationResult<
  ActionResponse<Refund>,
  Error,
  { readonly orderId: string; readonly input: CreateRefundInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input, idempotencyKey }) =>
      createRefund(orderId, input, idempotencyKey),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.orderRefunds(orderId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.order(orderId) });
    },
  });
}
