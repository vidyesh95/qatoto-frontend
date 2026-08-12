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
// THREE ROUTES, AND `POST /commerce/orders/:orderId/refunds` IS DELIBERATELY ABSENT. It exists and
// answers 202, but requesting a refund needs a control that can render `409 OVER_REFUND` — whose
// remaining refundable balance rides in the envelope's `data`, which the shared transport does not
// surface — and there is no such control on this surface yet. An api wrapper with no caller is
// unverified code, which is exactly what the repo's uncalled-API audit exists to catch.
//
// WHAT THE 502/503 BRANCH COSTS US, stated rather than discovered later. Provider failures answer
// `502 PROVIDER_REJECTED` / `503 PROVIDER_UNAVAILABLE` and put a machine-readable `reason` in
// `data`. `readEnvelope` reads `message` and `errors` and drops `data` on a failure, so `reason`
// does not reach the client. That is acceptable and not a gap to work around here: `reason` is
// provider diagnostics, the `message` beside it is the user-facing sentence, and widening `ApiError`
// for one route would change the error contract every surface in the app shares.

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
  type ListRefundsFilter,
  type PaymentIntent,
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
