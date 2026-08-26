// TRANSPORT: client-query — payments are session- and organization-scoped, so they are read and
// written from client islands rather than server components. `RequestOptions` is threaded so a
// server read could be added.
//
// WIRED, and it is the piece that was missing entirely rather than mocked. Until Phase 24 there was
// nothing worth wiring: `POST …/payment-intents` answered 202, the order moved to
// `payment_processing`, and it stayed there forever because `applyPaymentSettlement` posted a
// custody pair the `direct_processor` rail forbids. A41 made the postings rail-aware; these three
// calls are what let a buyer use that.
//
// FOUR ROUTES NOW. `POST /commerce/orders/:orderId/refunds` used to be deliberately absent, and the
// reason it was is worth keeping because it explains the shape of what replaced it: requesting a
// refund needs a control that can render `409 OVER_REFUND`, whose remaining refundable balance
// rides in the envelope's `data` — and the shared transport dropped `data` on every failure, so
// the number was unreachable from anywhere in the app.
//
// THAT HOLE IS CLOSED, ADDITIVELY. `ApiError` gained an optional `details?: unknown` and
// `readEnvelope` passes the failure envelope's `data` through untouched. `unknown` rather than a
// typed shape on purpose: `ApiError` is shared by every surface, and promoting one route's payload
// into that contract is what the old note above was right to refuse. The caller parses it with Zod
// at its own boundary — see `OverRefundDetailsSchema` in `payments.schemas.ts`.
//
// The same change incidentally carries `502 PROVIDER_REJECTED` / `503 PROVIDER_UNAVAILABLE`'s
// machine-readable `reason`. Nothing reads it, and nothing should render it: `reason` is provider
// diagnostics and the `message` beside it is the user-facing sentence.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  PaymentIntentSchema,
  RefundListPageSchema,
  RefundSchema,
  type CreateRefundInput,
  type ListRefundsFilter,
  type PaymentIntent,
  type Refund,
  type RefundListPage,
} from "@/lib/store/payments.schemas";

/**
 * Starts paying an order — `POST /commerce/orders/:orderId/payment-intents`.
 *
 * **ANSWERS `202`, AND A `202` IS NOT A RESULT.** The row exists and the money has not moved: the
 * provider call runs through an outbox after the response is written. The returned intent's `state`
 * will be `created`, never `settled`. Poll `getPaymentIntent` from there; rendering this response as
 * a payment is rendering an outbox insert as a receipt.
 *
 * IT RETURNS THE BARE INTENT, not the service's `{ paymentIntent, accepted }` outcome — the
 * controller unwraps it (`commerce-payments.controller.ts:181`). Verified against the running
 * backend, which is the only way this was going to be got right.
 *
 * REQUIRES AN `Idempotency-Key`, minted once per attempt in component state. Without it the
 * middleware answers **400** before the service is reached. The consequence of getting this wrong is
 * the worst on this surface: a retried POST with a fresh key is a second charge.
 *
 * A `409` HERE IS USUALLY A FINDING, NOT A RETRY, and its message is the useful part. Only
 * `direct_processor` and the frozen `internal_custody` rail can take a payment intent at all;
 * `direct_offline` and `external_escrow` are refused with a sentence naming that rail's OWN
 * settlement path — record a transfer as an attestation, or fund the escrow session at the provider.
 * Render the backend's sentence verbatim. Paraphrasing it to "this order cannot be paid" throws away
 * the half that says how it IS paid.
 *
 * `requireActiveBuyerCommerceOrganization`: only the buyer pays, and a `pending` workspace cannot.
 */
export function createPaymentIntent(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PaymentIntent>> {
  return sendJson(
    `/commerce/orders/${encodeURIComponent(orderId)}/payment-intents`,
    "POST",
    undefined,
    PaymentIntentSchema,
    options,
  );
}

/**
 * One payment intent — `GET /commerce/payments/:paymentIntentId`.
 *
 * THE POLL TARGET, and the only place a verdict comes from. Readable by either party to the order.
 *
 * The id comes off `order.paymentIntentId`, which A38 put on both order projections for exactly this
 * reason: before it, the id existed only in the response to the POST that created it, so a buyer who
 * reloaded the page could no longer pay — or even find out whether they already had.
 */
export function getPaymentIntent(
  paymentIntentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PaymentIntent>> {
  return getJson(
    `/commerce/payments/${encodeURIComponent(paymentIntentId)}`,
    PaymentIntentSchema,
    options,
  );
}

/**
 * Refunds on orders the caller is a party to — `GET /commerce/refunds`.
 *
 * SCOPED THROUGH THE ORDER, NOT THE REFUND ROW, and that is why a seller sees it too.
 * `commerce_refund` carries a `buyerOrganizationId` and no counterparty, so the obvious filter would
 * have hidden every refund from the seller whose order it reverses.
 *
 * Before A38 this read did not exist: a buyer could request a refund and neither party could see
 * that they had.
 *
 * Cursor-paged, `limit` 1..100. `orderId` narrows the inbox to one order's history — it is a filter
 * rather than a separate route because those two are the same list.
 */
export function listRefunds(
  filter: ListRefundsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<RefundListPage>> {
  return getJson(
    `/commerce/refunds${buildQueryString({ ...filter })}`,
    RefundListPageSchema,
    options,
  );
}

/**
 * Requests a refund against an order — `POST /commerce/orders/:orderId/refunds`.
 *
 * A `202` IS NOT A SETTLED REFUND. The row exists and the provider has been asked; whether the
 * money moves is a later fact that arrives on `GET /commerce/refunds`. Copy on the control must say
 * "requested", and the refund history beside it is where the verdict shows up.
 *
 * THE IDEMPOTENCY KEY IS REQUIRED — the route mounts `idempotency({ required: true, scope:
 * "active_organization" })`, so a call without the header is refused before the service runs. It is
 * a HEADER here, not a body field, the same envelope comment create uses. Mint it once per attempt
 * and resend the SAME value on every retry: a key regenerated inside a retry refunds twice.
 *
 * OMITTING `amountInCents` REFUNDS THE WHOLE REMAINING BALANCE, which is the server's figure and
 * not one to compute here. On `409 OVER_REFUND` the real remaining balance arrives in
 * `error.details` — parse it with `OverRefundDetailsSchema` rather than reading the message.
 */
export function createRefund(
  orderId: string,
  input: CreateRefundInput,
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<Refund>> {
  return sendJson(
    `/commerce/orders/${encodeURIComponent(orderId)}/refunds`,
    "POST",
    input,
    RefundSchema,
    { ...options, headers: { ...options?.headers, "Idempotency-Key": idempotencyKey } },
  );
}
