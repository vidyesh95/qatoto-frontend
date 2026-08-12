// TRANSPORT: client-query — the cart is read and mutated from client islands, because every
// mutation must be followed by a refetch of the authoritative cart and React Query owns that.
//
// WIRED. Every call below reaches the Express backend; the mutable mock cart in
// `src/mocks/store/cart-mocks.ts` and the prepare/confirm builders in `checkout-mocks.ts` are
// deleted rather than kept as a fallback, because a silent fallback here would show a buyer a total
// no server agreed to.
//
// THE IDEMPOTENCY RULE, because this is the first file in the store where it applies. TWO of these
// routes require an `Idempotency-Key` — `checkout/prepare` AND `checkout/confirm` — and the key is
// minted ONCE PER ATTEMPT in component state and reused across retries of that attempt. A key
// regenerated on retry is not idempotency, it is a second reservation and then a second set of
// orders. `newIdempotencyKey()` therefore lives at the call site and never inside this module: a
// key minted here would be fresh on every invocation, which is the exact bug this is warning about.
//
// PREPARE'S KEY IS EASY TO MISS AND WAS. `idempotency({ required: true })` sits in front of it, so
// a call without the header is refused with a **400** before the service is reached — not a 422,
// and not a field error, so it does not arrive through the branch that renders body refusals.
//
// THREE GUARDS ACROSS SIX ROUTES, and the difference decides what a new buyer can do. Everything
// here runs on `requireProvisionedBuyerCommerceWorkspace` — which MINTS a `pending` workspace for a
// caller who has none — except `checkout/confirm`, which keeps
// `requireActiveBuyerCommerceOrganization`. §14's reason: a cart is a draft, an order is not. So a
// brand-new buyer can fill a cart, price it and reserve stock, and is refused at confirm until a
// moderator activates the workspace. `BuyerWorkspaceNotice` is what says so before the reserve.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CheckoutPrepareSchema,
  CommerceCartSchema,
  ConfirmCheckoutSchema,
  type CheckoutPrepare,
  type CommerceCart,
  type ConfirmCheckout,
  type ConfirmCheckoutInput,
  type PrepareCheckoutInput,
  type RemoveCartItemInput,
  type SetCartItemInput,
} from "@/lib/store/cart.schemas";

/**
 * The active organization's cart, server-priced.
 *
 * A LINE THAT CANNOT BE PRICED DOES NOT FAIL THIS READ. The line carries its own `pricingError`, the
 * rest still price, and the totals cover only what priced. A cart never fails to load because one
 * line went stale.
 *
 * Note the scope: the cart belongs to a buyer ORGANIZATION, so two colleagues share one. Correct for
 * procurement, surprising if you expect a consumer basket.
 */
export function getCart(options?: RequestOptions): Promise<ActionResponse<CommerceCart>> {
  return getJson("/commerce/cart", CommerceCartSchema, options);
}

/**
 * Sets the DESIRED quantity for a line. Not an increment.
 *
 * Returns the whole authoritative cart, which is what callers must render — never a locally patched
 * line. A quantity the buyer cannot have comes back refused with a reason rather than clamped.
 *
 * `variantId` is optional here and mandatory in the domain: omitting it for a product with active
 * variants is exactly what produces `VARIANT_REQUIRED`, and the server decides that, not this.
 */
export function setCartItem(
  productId: string,
  input: SetCartItemInput,
  options?: RequestOptions,
): Promise<ActionResponse<CommerceCart>> {
  const path = `/commerce/cart/items/${encodeURIComponent(productId)}`;
  return sendJson(path, "PUT", input, CommerceCartSchema, options);
}

/** Naming a variant removes that line; omitting one removes every line for the product. */
export function removeCartItem(
  productId: string,
  input: RemoveCartItemInput = {},
  options?: RequestOptions,
): Promise<ActionResponse<CommerceCart>> {
  const path = `/commerce/cart/items/${encodeURIComponent(productId)}${buildQueryString({ ...input })}`;
  return sendJson(path, "DELETE", undefined, CommerceCartSchema, options);
}

/**
 * Validates the cart, RESERVES STOCK, and returns authoritative totals.
 *
 * Two things this is not. It is not a preview — the reservation is real, bounded by `expiresAt`, and
 * released by a worker, so a prepare left open holds stock against other buyers. And it is stricter
 * than `getCart`: every line must be priceable, because the next step creates immutable orders from
 * these numbers.
 *
 * REQUIRES AN `Idempotency-Key` HEADER, exactly as `confirmCheckout` does, and this is the one that
 * gets forgotten — it reads like a read. `idempotency({ required: true, scope: "active_organization" })`
 * refuses a call without it with a **400** before the service is reached, so there is no cart, no
 * reservation and no field error to render. The key is minted once per attempt in component state.
 *
 * The reason it is required at all is the reservation: a retried prepare without a key takes stock
 * off the shelf twice, and the second hold expires on its own schedule with nobody watching it.
 */
export function prepareCheckout(
  input: PrepareCheckoutInput = {},
  options?: RequestOptions,
): Promise<ActionResponse<CheckoutPrepare>> {
  return sendJson("/commerce/checkout/prepare", "POST", input, CheckoutPrepareSchema, options);
}

/**
 * Turns a prepare into ONE ORDER PER COUNTERPARTY, under one checkout group.
 *
 * REQUIRES AN `Idempotency-Key` HEADER, minted once per attempt by the caller and passed through
 * `options.headers`. A duplicate call with the same key returns the original result rather than a
 * second set of orders.
 *
 * Omitting `settlementAgreements` is the DEFAULT and not an error, but NOT for the reason this
 * comment used to give. It said the orders settle on `direct_offline`; they do not.
 * `commerce-checkout.service.ts` passes `hasProcessorPayment: true` unconditionally for a direct
 * checkout, so `resolveSettlementRail` answers `direct_processor` — the processor settles buyer
 * straight to seller and the money never rests anywhere Qatoto can see. `direct_offline` is the
 * quote-originated rail, settled by wire and recorded as a party attestation, and nothing on this
 * page can produce it. Naming an agreement instead yields `external_escrow`, and naming one does
 * not establish it: the server revalidates the agreement under a row lock and refuses the confirm
 * outright if it has lapsed rather than silently downgrading the rail.
 *
 * WHAT THAT DISTINCTION IS WORTH DOWNSTREAM: only `direct_processor` and `internal_custody` can
 * take a payment intent. `createPaymentIntent` refuses the other two with a `409` naming that
 * rail's own settlement path — so the rail decided here is what makes the order payable at all.
 *
 * THE ORDERS COME BACK `pending_payment`. Confirm creates them and pays for nothing.
 *
 * IT USED TO TAKE A SECOND `prepare` PARAMETER. That was the mock's input — `buildMockConfirmation`
 * synthesised a confirmation from the prepare it had been handed — and the real route needs only
 * `prepareId`, which the caller already puts in the body. Keeping it would have left every call
 * site passing an argument the request ignores.
 */
export function confirmCheckout(
  input: ConfirmCheckoutInput,
  options?: RequestOptions,
): Promise<ActionResponse<ConfirmCheckout>> {
  return sendJson("/commerce/checkout/confirm", "POST", input, ConfirmCheckoutSchema, options);
}
