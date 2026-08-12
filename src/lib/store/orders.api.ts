// TRANSPORT: client-query — orders and engagements are session-scoped, so they are read from client
// islands rather than server components. `RequestOptions` is threaded so a server read could be added.
//
// FULLY WIRED. Every call in this file reaches the Express backend, engagements included, and
// `src/mocks/store/orders-mocks.ts` is deleted.
//
// THE ARRIVAL WINDOW FORCED THE DETAIL READS. `getOrderArrivalWindow` hits the real backend, and a
// real read keyed by an id that only exists in `orders-mocks.ts` answers 404 forever — so mounting
// the window on a fixture-fed order page would have shipped a panel that could only ever render its
// error branch.
//
// AND `getOrder` FORCED `cancelOrder`. Once the detail page reads a real order, a cancel that resolves
// a fixture keyed by mock ids answers 404 for every order the page can actually show. A mock write
// beside a wired read is worse than either — it turns a working button into a broken one.
//
// THE SAME ARGUMENT IS WHY THE LISTS AND THE ADDRESS REVEAL ARE NOW WIRED TOO. Every id the order
// page resolves comes from a list, so a fixture list beside a real detail read produced a page whose
// every link 404'd; and the reveal is keyed by an order id the list supplies.
//
// THE ENGAGEMENT TRANSITION CARRIED A BODY THE ROUTE REFUSES. It sent `{ target }`; the schema is
// `.strict()` over `{ targetState, note? }`, so every transition was two refusals at once — an
// unrecognized key and a missing required one — and the engagement never moved.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  OrderFulfillmentSchema,
  ServiceEngagementListPageSchema,
  ServiceEngagementSchema,
  type ListServiceEngagementsFilter,
  type OrderFulfillment,
  type ServiceEngagement,
  type ServiceEngagementListPage,
  type TransitionServiceEngagementInput,
} from "@/lib/store/fulfillment.schemas";
import {
  OrderArrivalWindowResponseSchema,
  type ArrivalWindowFilter,
  type ArrivalWindowProjection,
} from "@/lib/store/arrival-window.schemas";
import {
  OrderDeliveryAddressSchema,
  OrderDetailSchema,
  OrderListPageSchema,
  type ListOrdersFilter,
  type OrderDeliveryAddress,
  type OrderDetail,
  type OrderListPage,
} from "@/lib/store/orders.schemas";

// `listViewerOrganizationIds` USED TO LIVE HERE and has moved UP rather than away. It was a
// one-line narrowing of `GET /commerce/organizations/mine` down to `organization.id`, wrapping a
// route that now has a first-class reader in `organizations.api.ts`. Two api functions over one
// route meant two React Query entries under one key with two different `queryFn`s — whichever
// mounted first decided what the cache held, and the other read it as the wrong shape.
//
// The narrowing itself is unchanged and still load-bearing: an order page holding a membership
// `role` it did not fetch for that purpose is one step from a client-side permission check. It now
// happens in `useViewerOrganizationsQuery`'s `select`, which is where a projection over a shared
// cache entry belongs.

/**
 * Buyer-scoped orders. A different endpoint from the provider queue, with different rows.
 *
 * `requireActiveBuyerCommerceOrganization`, which is STRICTER than the cart beside it: a caller
 * whose only workspace is an auto-provisioned `pending` shell can fill a cart and cannot read this,
 * and the 403 is the answer rather than a flake. See `useWorkspaceReadiness`.
 *
 * Cursor-paged. `limit` is 1..50 and there is no `state` filter — see `ListOrdersFilter`.
 */
export function listBuyerOrders(
  filter: ListOrdersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OrderListPage>> {
  const path = `/commerce/orders${buildQueryString({ ...filter })}`;
  return getJson(path, OrderListPageSchema, options);
}

/**
 * The seller/provider work queue.
 *
 * NOT the same read as `listBuyerOrders` with a flag. Two endpoints, because the authorization differs:
 * one returns orders where you are the buyer, the other where you are the counterparty, and collapsing
 * them into one call with a client-supplied role would be the client asserting which side it is on.
 */
export function listProviderOrders(
  filter: ListOrdersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OrderListPage>> {
  const path = `/commerce/provider/orders${buildQueryString({ ...filter })}`;
  return getJson(path, OrderListPageSchema, options);
}

/**
 * One order.
 *
 * DELIBERATELY NOT SCOPED TO THE READER — `getOrder` admits both the buyer and the counterparty and
 * returns the same projection to each. Filtering `completionIds` by the reader would hand a seller an
 * order whose lines claim no completion exists, and a completion id is not a capability anyway:
 * `evaluateReviewRelationship` refuses anyone but the buyer.
 */
export function getOrder(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDetail>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}`;
  return getJson(path, OrderDetailSchema, options);
}

/**
 * When this order should arrive, or which component stops anyone knowing.
 *
 * TWO THINGS ABOUT THIS ROUTE THAT ARE NOT OBVIOUS FROM ITS PATH.
 *
 * It carries `requireActiveCommerceOrganization`, unlike the order read beside it — so a signed-in
 * buyer without an active organization gets a 403 here while `getOrder` succeeds. That is an answer,
 * not a flake, and must not be retried.
 *
 * And the payload DOUBLE-NESTS: the envelope's `data` is `{ arrivalWindow: … }` whose projection has
 * its own `arrivalWindow` field holding the date pair. `OrderArrivalWindowResponseSchema` peels the
 * outer layer, so callers reach the dates at `.arrivalWindow`.
 *
 * `mode` IS OMITTED UNTIL THE BUYER PICKS ONE. The server never chooses a transport mode — with no
 * `mode` it answers `freight: unknown / mode_not_selected` and lists `availableModes`, which is the
 * choice to render. Defaulting to the cheapest here would commit a buyer to five weeks at sea.
 */
export function getOrderArrivalWindow(
  orderId: string,
  filter: ArrivalWindowFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ArrivalWindowProjection>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/arrival-window${buildQueryString({ ...filter })}`;
  return getJson(path, OrderArrivalWindowResponseSchema, options).then((result) =>
    result.success ? { success: true, data: result.data.arrivalWindow } : result,
  );
}

/**
 * Derived fulfillment progress: shipments, legs, engagements and what needs a human.
 *
 * NOTE FOR WIRING: the server declares this `Result<unknown, …>` — `getOrderFulfillment` builds a real
 * object and types its return as `unknown`, so there is no server-side projection to check against.
 * `OrderFulfillmentSchema` is therefore the ONLY contract this payload has, which makes parsing it here
 * load-bearing rather than defensive.
 */
export function getOrderFulfillment(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderFulfillment>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/fulfillment`;
  return getJson(path, OrderFulfillmentSchema, options);
}

/**
 * The buyer's decrypted delivery address, for a counterparty with an active order.
 *
 * EVERY CALL WRITES AN AUDIT ENTRY TO THE BUYER'S STREAM, and if that write fails the read rolls back.
 * So this must never be called on mount, on hover, or speculatively — it is the only route in this
 * backend that hands one organization another's PII, and the audit trail is the reason it was chosen
 * over a seller-openable snapshot. Call it from an explicit control that says what it does.
 *
 * IT CARRIES ITS OWN, TIGHTER LIMITER (`commerceAddressRevealLimiter`), harder than any other order
 * read. A `429` here is therefore a NORMAL ANSWER on a surface somebody is clicking repeatedly, not
 * a failure: render it as "you have opened this too many times, try again shortly" and never retry
 * it automatically. An automatic retry would spend the remaining allowance and log more PII reads.
 */
export function getOrderDeliveryAddress(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDeliveryAddress>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/delivery-address`;
  return getJson(path, OrderDeliveryAddressSchema, options);
}

/**
 * Cancels an order.
 *
 * NO REQUEST BODY. The endpoint parses `z.union([z.undefined(), EmptyObjectSchema])`, so `undefined` or `{}`
 * are the only accepted bodies and there is no field for a reason — the service does not take one and no
 * column stores one.
 *
 * EITHER PARTY MAY CANCEL. The service accepts the buyer organization OR the counterparty, and answers 404 to
 * anyone else — so this is not a buyer-only control and the UI must not present it as one.
 *
 * Allowed only from `pending_payment` or `confirmed`, checked under a row lock. A button enabled from stale
 * state produces a `409` rather than a cancellation, so the refusal has to be renderable.
 *
 * Requires an `Idempotency-Key`, minted once per attempt by the caller.
 */
export function cancelOrder(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDetail>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/cancel`;
  return sendJson(path, "POST", undefined, OrderDetailSchema, options);
}

/** Buyer- or provider-scoped engagements, depending on which side the caller is. */
export function listServiceEngagements(
  filter: ListServiceEngagementsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ServiceEngagementListPage>> {
  const path = `/commerce/service-engagements${buildQueryString({ ...filter })}`;
  return getJson(path, ServiceEngagementListPageSchema, options);
}

export function getServiceEngagement(
  engagementId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ServiceEngagement>> {
  const path = `/commerce/service-engagements/${engagementId}`;
  return getJson(path, ServiceEngagementSchema, options);
}

/**
 * Moves an engagement to a new state.
 *
 * WHICH TARGETS ARE LEGAL DEPENDS ON WHICH SIDE THE CALLER IS, and the server decides — `scheduled`,
 * `in_progress` and `awaiting_buyer` are the provider's; `completed` is the buyer accepting the work.
 * The client derives which to OFFER from its relation to the engagement so a buyer is not handed a
 * button that 403s, but it never treats that derivation as permission.
 *
 * Completion of one engagement NEVER marks another complete. Each has its own state machine.
 */
export function transitionServiceEngagement(
  engagementId: string,
  input: TransitionServiceEngagementInput,
  options?: RequestOptions,
): Promise<ActionResponse<ServiceEngagement>> {
  const path = `/commerce/service-engagements/${engagementId}/transitions`;
  return sendJson(path, "POST", input, ServiceEngagementSchema, options);
}

// `void getJson` IS GONE — every read in this module now calls it for real. `sendJson` is still
// referenced below only by `cancelOrder`, and the three engagement calls keep their commented
// wiring lines, so this file no longer needs an unused-import guard.
