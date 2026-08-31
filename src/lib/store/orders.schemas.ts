// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for orders: `GET /commerce/orders`, `GET /commerce/provider/orders`,
// `GET /commerce/orders/:orderId`, `POST /commerce/orders/:orderId/cancel` and
// `GET /commerce/orders/:orderId/delivery-address`.
//
// Transcribed from `commerce-orders.service.ts` — `OrderSummaryProjection` (:41),
// `OrderProductLineProjection`, `OrderServiceLineProjection` and `OrderDetailProjection` (:101).
//
// THE ONE THING THIS FILE CANNOT GIVE YOU IS THE VIEWER'S ROLE, and that shapes the whole surface.
//
// `GET /commerce/orders/:orderId` IS NOT SCOPED TO THE READER: `getOrder` admits both the buyer and
// the counterparty and returns the same projection to each. That is deliberate — filtering the
// completion ids by the reader would hand a seller an order whose lines claim no completion exists —
// but it means the payload carries `buyerOrganizationId` and `counterpartyOrganizationId` and NOT
// which one the caller is.
//
// So the relation is derived by comparing those ids against the caller's own organizations, which the
// client learns from `GET /commerce/organizations/mine` — a server read, not a client assertion. It is
// NOT derived from which route the page was reached by: a provider following a shared buyer link would
// then get buyer buttons that 403, and the frontend would be asserting an authorization fact, which
// §0 forbids outright. The server re-authorizes every action regardless; this only decides what to
// OFFER.

import { z } from "zod";

import {
  ORDER_SOURCES,
  ORDER_STATES,
  SETTLEMENT_RAILS,
  type OrderState,
} from "@/lib/store/cart.schemas";
import { cursorPageOf, IsoDateTimeSchema, PROVIDER_KINDS } from "@/lib/store/shared.schemas";

// --- Who the caller is to an order ------------------------------------------

/**
 * The caller's relation to an order, DERIVED on the client from the two organization ids.
 *
 * `both` is not paranoia: one organization may legitimately be both sides if it ever buys from
 * itself, and a UI that assumed exclusivity would pick a branch arbitrarily. `neither` is the case
 * where the caller has no membership in either — which should be a 404 from the server, so seeing it
 * means the caller reached the page through a stale cache.
 */
export type OrderViewerRelation = "buyer" | "counterparty" | "both" | "neither";

// `MyOrganizationListSchema` USED TO LIVE HERE, parsed down to `organization.id` alone. It moved
// to `organizations.schemas.ts` as `MyCommerceOrganizationListSchema` and widened to the whole
// `{ organization, membership }` projection, because the checkout now needs `tradeState`,
// `countryCode` and `provisioningOrigin` off the same read — a `pending` shell cannot confirm a
// checkout and the buyer has to be told why (A37).
//
// The narrowing did not disappear, it moved UP: `listViewerOrganizationIds` in `orders.api.ts`
// reduces that list to ids for the order pages, so nothing here holds an organization row it did
// not need. The original reason for narrowing stands — a membership `role` in a component is one
// step from a client-side permission check.

export function deriveOrderViewerRelation(
  order: { readonly buyerOrganizationId: string; readonly counterpartyOrganizationId: string },
  viewerOrganizationIds: readonly string[],
): OrderViewerRelation {
  const isBuyer = viewerOrganizationIds.includes(order.buyerOrganizationId);
  const isCounterparty = viewerOrganizationIds.includes(order.counterpartyOrganizationId);
  if (isBuyer && isCounterparty) return "both";
  if (isBuyer) return "buyer";
  if (isCounterparty) return "counterparty";
  return "neither";
}

// --- Order list -------------------------------------------------------------

/**
 * A38. The payment intent this order can still be paid THROUGH, or null.
 *
 * ON BOTH PROJECTIONS, and it is what makes paying an order survive a page reload. Before it,
 * `POST /commerce/orders/:orderId/payment-intents` minted an id and
 * `GET /commerce/payments/:paymentIntentId` consumed one, with nothing in between: a buyer who
 * navigated away from checkout could no longer pay their own order.
 *
 * IT IS NOT A "HAS BEEN PAID" FLAG, and reading it as one is the mistake this comment exists to
 * prevent. The backend's `PAYABLE_PAYMENT_INTENT_STATES` includes `settled`, `refunded`,
 * `partially_refunded` and `disputed` alongside the in-flight ones — it mirrors
 * `commerce_payment_intent_active_order_uidx`, which is what guarantees at most one such row per
 * order. So a non-null id means "this is the intent to look at", and only the INTENT's own state
 * says what happened. Fetch it before rendering any verdict.
 *
 * `null` means either nothing has been created yet or every attempt reached a terminal failure
 * (`failed`, `cancelled`). The backend deliberately does not distinguish those, because the
 * client's next move is the same for both: create one.
 */
const PaymentIntentIdSchema = z.string().nullable();

export const OrderSummarySchema = z
  .object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    counterpartyOrganizationId: z.string(),
    checkoutGroupId: z.string().nullable(),
    source: z.enum(ORDER_SOURCES),
    state: z.enum(ORDER_STATES),
    currency: z.string(),
    totalInCents: z.number().int(),
    // Legal names, SNAPSHOTTED at creation. A later rename of either organization must not rewrite
    // what an order says — that is the point of an immutable commercial record.
    buyerLegalNameSnapshot: z.string(),
    counterpartyLegalNameSnapshot: z.string(),
    createdAt: IsoDateTimeSchema,
    settlementRail: z.enum(SETTLEMENT_RAILS),
    hasEscrowProtection: z.boolean(),
    paymentIntentId: PaymentIntentIdSchema,
  })
  .strip();

export const OrderListPageSchema = cursorPageOf(OrderSummarySchema);

// --- Order detail -----------------------------------------------------------

export const OrderProductLineSchema = z
  .object({
    id: z.string(),
    /**
     * THE ID THAT MAKES A REVIEW REACHABLE. `POST /commerce/completions/:completionId/reviews` is
     * keyed on a completion, and before this was projected the id appeared on NO read in the backend —
     * so the entire review surface was live, constrained, rate-limited and unreachable except by
     * guessing a UUID. `null` until the line completes.
     */
    completionId: z.string().nullable(),
    // Nullable because an order may name an unlisted product — a quote-originated line for something
    // that was never a catalog listing.
    productId: z.string().nullable(),
    titleSnapshot: z.string(),
    /**
     * A1. WHICH VARIATION WAS BOUGHT — "Sea blue" — frozen at order time.
     *
     * `null` on a listing sold as one thing, which is a different fact from an unnamed variant: the
     * backend pairs this with `variantId` under a CHECK, so both are set or neither is.
     *
     * ⚠️ IT IS THE SNAPSHOT, NOT THE LIVE VARIANT NAME, and that is the whole reason the column
     * exists — reading through to `commerce_product_variant.name` would let a seller rename what
     * somebody already bought. Written since Phase 8 and projected NOWHERE until now, so an order
     * for one variant of a multi-variant listing did not say which one.
     */
    variantNameSnapshot: z.string().nullable(),
    specificationSnapshot: z.string(),
    /**
     * FIVE QUANTITIES, and they do not sum to each other. Ordered is the commitment; reserved,
     * fulfilled, cancelled and refunded are independent counters that move as the order progresses. A
     * client must never compute one from the others — a partial shipment plus a partial refund is a
     * real state and arithmetic here would misreport it.
     */
    quantityOrdered: z.number().int(),
    quantityReserved: z.number().int(),
    quantityFulfilled: z.number().int(),
    quantityCancelled: z.number().int(),
    quantityRefunded: z.number().int(),
    unitPriceInCents: z.number().int(),
    lineTotalInCents: z.number().int(),
    siblingOrder: z.number().int(),
  })
  .strip();

export const OrderServiceLineSchema = z
  .object({
    id: z.string(),
    providerKind: z.enum(PROVIDER_KINDS),
    titleSnapshot: z.string(),
    scopeSnapshot: z.string(),
    feeInCents: z.number().int(),
    siblingOrder: z.number().int(),
  })
  .strip();

export const OrderDetailSchema = z
  .object({
    id: z.string(),
    buyerOrganizationId: z.string(),
    counterpartyOrganizationId: z.string(),
    checkoutGroupId: z.string().nullable(),
    source: z.enum(ORDER_SOURCES),
    state: z.enum(ORDER_STATES),
    // Present when `source` is `accepted_quote` — the revision this order was snapshotted from.
    acceptedQuoteId: z.string().nullable(),
    currency: z.string(),
    subtotalInCents: z.number().int(),
    taxInCents: z.number().int(),
    serviceFeeInCents: z.number().int(),
    shippingInCents: z.number().int(),
    discountInCents: z.number().int(),
    totalInCents: z.number().int(),
    paymentTermsSnapshot: z.string().nullable(),
    incotermSnapshot: z.string().nullable(),
    /**
     * A45. What the buyer asked for at checkout — never what was booked.
     *
     * NULL MEANS "NOT ASKED OR NOT CHOSEN", not "no preference", and nothing may default it. The
     * mode the goods actually move by lives on the shipment's legs.
     */
    requestedFreightModeSnapshot: z.string().nullable(),

    buyerLegalNameSnapshot: z.string(),
    counterpartyLegalNameSnapshot: z.string(),
    createdAt: IsoDateTimeSchema,
    productLines: z.array(OrderProductLineSchema),
    serviceLines: z.array(OrderServiceLineSchema),
    /**
     * Every completion this order produced, INCLUDING the service-engagement ones that belong to no
     * product line. The per-line id covers the common case; this covers the rest without making a
     * client walk two shapes to find them.
     */
    completionIds: z.array(z.string()),
    settlementRail: z.enum(SETTLEMENT_RAILS),
    hasEscrowProtection: z.boolean(),
    paymentIntentId: PaymentIntentIdSchema,
  })
  .strip();

// --- The audited delivery-address reveal ------------------------------------

/**
 * `GET /commerce/orders/:orderId/delivery-address`.
 *
 * THE ONLY PLACE THIS BACKEND HANDS ONE ORGANIZATION ANOTHER'S PII, and it is fenced accordingly:
 * gated on order membership, a counterparty-operating role, and an order state at or past
 * `confirmed`; rate-limited; and it writes an audit entry to the BUYER's stream on every read. If the
 * audit cannot be written the read rolls back — an unlogged reveal defeats the whole reason a decrypt
 * path was chosen over a seller-openable snapshot.
 *
 * The consequence for the UI: THIS IS NOT PART OF THE ORDER READ AND MUST NOT BE FETCHED EAGERLY.
 * Rendering it on mount would log a PII access the seller never asked for, on every page view. It
 * belongs behind an explicit control that says what pressing it does.
 */
export const OrderDeliveryAddressSchema = z
  .object({
    recipientName: z.string(),
    phone: z.string().nullable(),
    streetLines: z.array(z.string()),
    locality: z.string().nullable(),
    region: z.string().nullable(),
    postalCode: z.string().nullable(),
    countryCode: z.string(),
  })
  .strip();

// --- Filter inputs ----------------------------------------------------------

/**
 * `GET /commerce/orders` and `GET /commerce/provider/orders`.
 *
 * `state` IS APPLIED IN SQL, AND IT WAS ABSENT UNTIL PHASE 25. The note that used to sit here was
 * correct at the time and worth preserving as history: the backend's `ListQuerySchema` was
 * `.strict()` over `{ limit, cursor }` alone, so `?state=confirmed` was a **422 naming the key** —
 * and filtering the fetched page client-side instead would silently short-page every result. The
 * conclusion drawn then still holds and is what got acted on: a filter the server cannot apply is
 * a backend change, not a client workaround. Phase 25 made that change.
 *
 * OMITTING IT MEANS EVERY STATE, not a default.
 */
export interface ListOrdersFilter {
  readonly state?: OrderState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /commerce/orders/:orderId/cancel`.
 *
 * Cancellable only from `pending_payment` or `confirmed` — before any physical fulfillment. Either
 * side may cancel from those states, and the server checks the state under a row lock, so a button
 * enabled on stale data is a `409` rather than a cancellation.
 */
// NO `CancelOrderInput` TYPE, and its absence is the contract.
//
// `POST /commerce/orders/:orderId/cancel` parses its body with `EmptyRequestBodySchema`, which is
// `z.union([z.undefined(), EmptyObjectSchema])` — `undefined` or `{}` and nothing else. An earlier version of
// this file declared `{ reason?: string }`, which reads plausibly and is not a field the endpoint has: sending
// it is a 422, and the service's `cancelOrder` takes no reason at all. There is nowhere for a cancellation
// reason to be stored, so the UI must not collect one.

export type OrderSummary = z.infer<typeof OrderSummarySchema>;
export type OrderListPage = z.infer<typeof OrderListPageSchema>;
export type OrderProductLine = z.infer<typeof OrderProductLineSchema>;
export type OrderServiceLine = z.infer<typeof OrderServiceLineSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;
export type OrderDeliveryAddress = z.infer<typeof OrderDeliveryAddressSchema>;

// --- Display maps -----------------------------------------------------------

/**
 * Which states a cancel may be attempted from.
 *
 * Mirrors `CANCELLABLE_ORDER_STATES` in the service. Duplicated on the client ONLY to decide whether
 * to show the control — the server re-checks under a row lock and is the authority. Never treat this
 * list as permission.
 */
export const CANCELLABLE_ORDER_STATES: readonly OrderState[] = ["pending_payment", "confirmed"];

export function isOrderCancellable(state: OrderState): boolean {
  return CANCELLABLE_ORDER_STATES.includes(state);
}

export const ORDER_SOURCE_LABELS: Record<(typeof ORDER_SOURCES)[number], string> = {
  direct_checkout: "Bought from the catalogue",
  accepted_quote: "From an accepted quote",
};
