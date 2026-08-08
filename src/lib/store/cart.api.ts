// TRANSPORT: client-query — the cart is read and mutated from client islands, because every
// mutation must be followed by a refetch of the authoritative cart and React Query owns that.
//
// MOCK-BACKED: every call below resolves against the mutable mock cart in `src/mocks/store/`. To
// wire one, swap `resolveMockRead` for `getJson`, or the mock mutation for the `sendJson` line
// beside it, and drop the fixture argument.
//
// THE IDEMPOTENCY RULE, because this is the first file in the store where it applies:
// `checkout/confirm` is expensive and replayable, so it takes an `Idempotency-Key` minted ONCE PER
// ATTEMPT in component state and reused across retries of that attempt. A key regenerated on retry
// is not idempotency — it is a second order. `newIdempotencyKey()` therefore lives at the call site,
// never inside this module: a key minted here would be fresh on every invocation, which is the exact
// bug the header is warning about.

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
import { resolveMockRead } from "@/lib/store/mock-transport";
import { readMockCart, removeMockCartItem, setMockCartItem } from "@/mocks/store/cart-mocks";
import { buildMockConfirmation, buildMockPrepare } from "@/mocks/store/checkout-mocks";

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
  const path = "/commerce/cart";
  return resolveMockRead(path, CommerceCartSchema, options, readMockCart());
  // return getJson(path, CommerceCartSchema, options);
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
  const path = `/commerce/cart/items/${productId}`;
  return resolveMockRead(path, CommerceCartSchema, options, setMockCartItem(productId, input));
  // return sendJson(path, "PUT", input, CommerceCartSchema, options);
}

/** Naming a variant removes that line; omitting one removes every line for the product. */
export function removeCartItem(
  productId: string,
  input: RemoveCartItemInput = {},
  options?: RequestOptions,
): Promise<ActionResponse<CommerceCart>> {
  const path = `/commerce/cart/items/${productId}${buildQueryString({ ...input })}`;
  return resolveMockRead(
    path,
    CommerceCartSchema,
    options,
    removeMockCartItem(productId, input.variantId),
  );
  // return sendJson(path, "DELETE", undefined, CommerceCartSchema, options);
}

/**
 * Validates the cart, RESERVES STOCK, and returns authoritative totals.
 *
 * Two things this is not. It is not a preview — the reservation is real, bounded by `expiresAt`, and
 * released by a worker, so a prepare left open holds stock against other buyers. And it is stricter
 * than `getCart`: every line must be priceable, because the next step creates immutable orders from
 * these numbers.
 */
export function prepareCheckout(
  input: PrepareCheckoutInput = {},
  options?: RequestOptions,
): Promise<ActionResponse<CheckoutPrepare>> {
  const path = "/commerce/checkout/prepare";
  const built = buildMockPrepare(
    input.deliveryAddressId === undefined ? null : "Mumbai, MH 400001, IN",
  );

  if (!built.ok) {
    // The refusal shapes the real endpoint returns, mapped to the codes it returns them under, so the
    // page's error branches are exercised rather than assumed.
    return Promise.resolve({
      success: false,
      error:
        built.refusal.type === "EMPTY_CART"
          ? { code: "409", message: "Your cart is empty." }
          : {
              code: "409",
              message: "One item can no longer be supplied. Fix it in your cart and try again.",
            },
    });
  }

  return resolveMockRead(path, CheckoutPrepareSchema, options, built.prepare);
  // return sendJson(path, "POST", input, CheckoutPrepareSchema, options);
}

/**
 * Turns a prepare into ONE ORDER PER COUNTERPARTY, under one checkout group.
 *
 * REQUIRES AN `Idempotency-Key` HEADER, minted once per attempt by the caller and passed through
 * `options.headers`. A duplicate call with the same key returns the original result rather than a
 * second set of orders.
 *
 * Omitting `settlementAgreements` is the DEFAULT and not an error: the orders settle on
 * `direct_offline`, where Qatoto observes nothing and the buyer carries the counterparty risk.
 * Naming an agreement does not establish one — the server revalidates it under a row lock and
 * refuses the confirm outright if it has lapsed.
 */
export function confirmCheckout(
  input: ConfirmCheckoutInput,
  prepare: CheckoutPrepare,
  options?: RequestOptions,
): Promise<ActionResponse<ConfirmCheckout>> {
  const path = "/commerce/checkout/confirm";
  return resolveMockRead(path, ConfirmCheckoutSchema, options, buildMockConfirmation(prepare));
  // return sendJson(path, "POST", input, ConfirmCheckoutSchema, options);
}

// Imported for the wiring lines above; referenced so they are not dropped while every call is
// mock-backed.
void getJson;
void sendJson;
