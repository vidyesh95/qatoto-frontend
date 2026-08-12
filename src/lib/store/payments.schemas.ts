// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for `POST /commerce/orders/:orderId/payment-intents`,
// `GET /commerce/payments/:paymentIntentId` and `GET /commerce/refunds`.
//
// Transcribed from `commerce-payments.service.ts` — `PaymentIntentProjection` (:65),
// `RefundProjection` (:80) and `CreatePaymentIntentOutcome` (:94).
//
// THE ONE THING THIS FILE HAS TO KEEP TRUE: A `202` IS NOT A PAYMENT.
//
// `POST …/payment-intents` answers 202. The row exists; the money has not moved. The provider call
// runs through an outbox after the response is written, and until Phase 24 that outbox failed on
// every live order — `applyPaymentSettlement` posted `buyer_clearing → order_held`, a pair the
// `direct_processor` rail forbids, so every settlement threw and the order sat in
// `payment_processing` through eight retries and a dead-letter. Nothing in the 202 said so.
//
// So the intent's own `state` is the only thing that says what happened, and it is fetched, never
// inferred from the fact that the POST returned.

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------
// Postgres `pgEnum` labels, sent verbatim in both directions. DATA, not identifiers — do not
// "correct" them to kebab-case (CLAUDE.md wire-casing rule).

/**
 * `commerce_payment_intent_state`. TEN values, and they do not form a simple ladder.
 *
 * The first four are in flight. `settled` is the one that means paid. `failed` and `cancelled` are
 * terminal without payment. The last three are what happens AFTER a settled payment —
 * `partially_refunded`, `refunded` and `disputed` — which is why "has a payment intent" can never be
 * read as "is still waiting to pay".
 */
export const PAYMENT_INTENT_STATES = [
  "created",
  "requires_action",
  "processing",
  "authorized",
  "settled",
  "failed",
  "cancelled",
  "partially_refunded",
  "refunded",
  "disputed",
] as const;

export type PaymentIntentState = (typeof PAYMENT_INTENT_STATES)[number];

/** `commerce_payment_provider`. `fake` is the development adapter and reaches real responses. */
export const PAYMENT_PROVIDERS = ["fake", "stripe"] as const;

export const REFUND_STATES = ["created", "processing", "settled", "failed", "cancelled"] as const;

export type RefundState = (typeof REFUND_STATES)[number];

/**
 * The states in which nothing has been decided yet, so a poll is still worth making.
 *
 * DERIVED FROM THE INTENT, NOT FROM A FLAG THE CALLER PASSES. The four here are exactly the
 * non-terminal ones: `created` and `processing` are waiting on the outbox and the provider,
 * `requires_action` is waiting on the buyer, and `authorized` is money held but not yet captured.
 * Everything else — settled, failed, cancelled, and the three post-settlement states — is an answer,
 * and polling one forever is a spinner that never stops on a screen about money.
 */
const IN_FLIGHT_PAYMENT_INTENT_STATES: readonly PaymentIntentState[] = [
  "created",
  "requires_action",
  "processing",
  "authorized",
];

export function isPaymentIntentInFlight(state: PaymentIntentState): boolean {
  return IN_FLIGHT_PAYMENT_INTENT_STATES.includes(state);
}

// --- Projections ------------------------------------------------------------

/**
 * One payment intent.
 *
 * EVERY NULLABLE FIELD HERE IS AN ABSENCE, NOT A ZERO OR AN EMPTY STRING. `settledAt` null on a
 * `settled` intent would be a contradiction worth showing as one; `failureReason` null on a `failed`
 * intent means the provider gave none, which is different from "no failure". Render what is there
 * and name what is not — never a default date and never "Unknown error".
 *
 * `providerPaymentRef` is the id at the processor. It is a support-desk reference, not a receipt,
 * and it is null until the provider has answered at all.
 */
export const PaymentIntentSchema = z
  .object({
    id: z.string(),
    orderId: z.string(),
    state: z.enum(PAYMENT_INTENT_STATES),
    amountInCents: z.number().int(),
    currency: z.string(),
    provider: z.enum(PAYMENT_PROVIDERS),
    providerPaymentRef: z.string().nullable(),
    failureReason: z.string().nullable(),
    authorizedAt: IsoDateTimeSchema.nullable(),
    settledAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

// `POST …/payment-intents` ANSWERS A BARE PAYMENT INTENT, and there is no separate schema for it.
//
// THIS FILE BRIEFLY HAD A `CreatePaymentIntentOutcomeSchema` OF `{ paymentIntent, accepted: true }`,
// transcribed from the service's `CreatePaymentIntentOutcome` (`commerce-payments.service.ts:94`).
// That is the SERVICE's return type and it is not the wire shape: the controller answers
// `data: result.value.paymentIntent`, unwrapping it. The schema parsed nothing on the first live
// call and the pay button would have rendered a contract error on every press.
//
// The lesson is the one CLAUDE.md already states — the authority is the code, and for a wire shape
// the code is the CONTROLLER, not the service behind it. Several routes here do pass a service value
// through verbatim (the freight admin reads answer `{ items, page }` exactly as the service builds
// it), which is what made the assumption feel safe.
//
// `accepted: true` therefore never reaches a client at all, which costs nothing: it was a constant.
// The 202 status is what says "accepted, not decided", and the intent's own `state` is what says
// what happened.

/**
 * One refund against a payment intent.
 *
 * `amountInCents` is the refund's own amount, never the order total, and refunds are partial by
 * default — an order can carry several. Do not sum them client-side to decide what is left
 * refundable: the server holds that figure and returns it on the refusal when it matters.
 */
export const RefundSchema = z
  .object({
    id: z.string(),
    paymentIntentId: z.string(),
    orderId: z.string(),
    state: z.enum(REFUND_STATES),
    amountInCents: z.number().int(),
    currency: z.string(),
    providerRefundRef: z.string().nullable(),
    reason: z.string().nullable(),
    failureReason: z.string().nullable(),
    settledAt: IsoDateTimeSchema.nullable(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

export type Refund = z.infer<typeof RefundSchema>;

export const RefundListPageSchema = cursorPageOf(RefundSchema);

export type RefundListPage = z.infer<typeof RefundListPageSchema>;

/** `GET /commerce/refunds`. `orderId` narrows an inbox to one order's history. */
export interface ListRefundsFilter {
  readonly orderId?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Display ----------------------------------------------------------------

/**
 * WHAT EACH STATE MEANS TO A BUYER, and none of these sentences says "paid" unless it is.
 *
 * `authorized` is the one worth being careful with: the money is held and has not moved, which reads
 * as done and is not. `processing` covers both the outbox and the provider, deliberately — the buyer
 * cannot act on the difference and naming it would invite them to try.
 */
export const PAYMENT_INTENT_STATE_LABELS: Readonly<Record<PaymentIntentState, string>> = {
  created: "Payment started",
  requires_action: "Needs your confirmation",
  processing: "Payment in progress",
  authorized: "Authorised, not yet taken",
  settled: "Paid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
  partially_refunded: "Partly refunded",
  refunded: "Refunded",
  disputed: "Disputed",
};

export const REFUND_STATE_LABELS: Readonly<Record<RefundState, string>> = {
  created: "Refund requested",
  processing: "Refund in progress",
  settled: "Refunded",
  failed: "Refund failed",
  cancelled: "Refund cancelled",
};
