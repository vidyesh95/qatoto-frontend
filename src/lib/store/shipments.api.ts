// TRANSPORT: client-query — both reads are organization-scoped and are made from client islands.
//
// WIRED, AND THIS FILE IS NEW BECAUSE `/studio/logistics` WAS APOLOGISING FOR A GAP THAT CLOSED.
// That page carried a banner reading "there is NO cross-order shipment list.
// GET /commerce/provider/shipments does not exist", and rendered a panel saying so to the user. It
// has existed since A29 (`commerce-fulfillment.routes.ts:40`), and A38 added the buyer twin beside
// it.
//
// The banner also named the tempting wrong answer, and it was right about it: fanning out one
// `GET /commerce/orders/:orderId/shipments` per order is N+1 requests from a browser, and it cannot
// sort or page across the result. A server-side list is the only correct shape for a queue.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  ShipmentQueuePageSchema,
  type ListShipmentsFilter,
  type ShipmentQueuePage,
} from "@/lib/store/shipments.schemas";

/**
 * The seller's or logistics provider's queue across every order they carry —
 * `GET /commerce/provider/shipments`.
 *
 * Scoped through the ORDER's counterparty, so it means "shipments I am responsible for" rather than
 * "shipments I created".
 */
export function listProviderShipments(
  filter: ListShipmentsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ShipmentQueuePage>> {
  const path = `/commerce/provider/shipments${buildQueryString({ ...filter })}`;
  return getJson(path, ShipmentQueuePageSchema, options);
}

/**
 * The buyer's inbound queue — `GET /commerce/shipments` (A38).
 *
 * A29 shipped the provider half and left the buyer the workaround it had just rejected for the
 * provider; A38 closed that. Same rows, same filters, scoped through the order's buyer instead.
 */
export function listBuyerShipments(
  filter: ListShipmentsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ShipmentQueuePage>> {
  const path = `/commerce/shipments${buildQueryString({ ...filter })}`;
  return getJson(path, ShipmentQueuePageSchema, options);
}
