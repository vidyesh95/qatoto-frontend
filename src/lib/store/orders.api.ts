// TRANSPORT: client-query — orders and engagements are session-scoped, so they are read from client
// islands rather than server components. `RequestOptions` is threaded so a server read could be added.
//
// PARTIALLY MOCK-BACKED. The ONE-ORDER surface is WIRED — `listViewerOrganizationIds`, `getOrder`,
// `getOrderFulfillment`, `getOrderArrivalWindow` and `cancelOrder`. The two LISTS, the
// delivery-address reveal and the service engagements still resolve fixtures. To wire one, swap
// `resolveMockRead` for `getJson`, or the mock write for the `sendJson` line beside it, and drop the
// fixture argument.
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
// The lists stay mocked deliberately: `OrderListPageSchema` is cursor-paged and its fixtures have
// never been checked against a live response, so wiring them is its own piece of work, not a swap.

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
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MyOrganizationListSchema,
  OrderDeliveryAddressSchema,
  OrderDetailSchema,
  OrderListPageSchema,
  type ListOrdersFilter,
  type OrderDeliveryAddress,
  type OrderDetail,
  type OrderListPage,
} from "@/lib/store/orders.schemas";
import {
  MOCK_BUYER_ORDER_LIST,
  MOCK_ENGAGEMENTS_BY_ID,
  MOCK_ENGAGEMENT_LIST,
  MOCK_ORDER_DELIVERY_ADDRESS,
  MOCK_PROVIDER_ORDER_LIST,
} from "@/mocks/store/orders-mocks";

/**
 * The organization ids the caller belongs to.
 *
 * Stands in for `GET /commerce/organizations/mine`, and it exists in this module because the ORDER
 * PAGES need it: `GET /commerce/orders/:orderId` returns the same projection to buyer and counterparty
 * and does not say which the caller is, so the relation is derived by comparing ids.
 *
 * It is a SERVER read, not a client assertion. The client never decides which organization it is — it
 * asks, compares, and then only decides what to OFFER. Every action is re-authorized server-side.
 */
export async function listViewerOrganizationIds(
  options?: RequestOptions,
): Promise<ActionResponse<readonly string[]>> {
  const path = "/commerce/organizations/mine";
  const result = await getJson(path, MyOrganizationListSchema, options);
  if (!result.success) return result;
  // The mapping lives here rather than in the schema: the schema's job is to describe what the
  // backend sends, and `{organization, membership}[]` is what it sends.
  return { success: true, data: result.data.map((row) => row.organization.id) };
}

/** Buyer-scoped orders. A different endpoint from the provider queue, with different rows. */
export function listBuyerOrders(
  filter: ListOrdersFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OrderListPage>> {
  const path = `/commerce/orders${buildQueryString({ ...filter })}`;
  return resolveMockRead(path, OrderListPageSchema, options, MOCK_BUYER_ORDER_LIST);
  // return getJson(path, OrderListPageSchema, options);
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
  return resolveMockRead(path, OrderListPageSchema, options, MOCK_PROVIDER_ORDER_LIST);
  // return getJson(path, OrderListPageSchema, options);
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
 */
export function getOrderDeliveryAddress(
  orderId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OrderDeliveryAddress>> {
  const path = `/commerce/orders/${orderId}/delivery-address`;
  return resolveMockRead(path, OrderDeliveryAddressSchema, options, MOCK_ORDER_DELIVERY_ADDRESS);
  // return getJson(path, OrderDeliveryAddressSchema, options);
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
  return resolveMockRead(path, ServiceEngagementListPageSchema, options, MOCK_ENGAGEMENT_LIST);
  // return getJson(path, ServiceEngagementListPageSchema, options);
}

export function getServiceEngagement(
  engagementId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ServiceEngagement>> {
  const path = `/commerce/service-engagements/${engagementId}`;
  return resolveMockDetail(
    path,
    ServiceEngagementSchema,
    options,
    MOCK_ENGAGEMENTS_BY_ID,
    engagementId,
  );
  // return getJson(path, ServiceEngagementSchema, options);
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
  void input;
  // Same reasoning as `cancelOrder`: returning the engagement unchanged is honest, and synthesising the
  // target state would claim a transition the server never made.
  return resolveMockDetail(
    path,
    ServiceEngagementSchema,
    options,
    MOCK_ENGAGEMENTS_BY_ID,
    engagementId,
  );
  // return sendJson(path, "POST", input, ServiceEngagementSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while reads are mock-backed.
void getJson;
void sendJson;
