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

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  ShipmentQueuePageSchema,
  WrittenShipmentSchema,
  type AppendShipmentEventInput,
  type CreateShipmentInput,
  type ListShipmentsFilter,
  type ShipmentQueuePage,
  type WrittenShipment,
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

// --- Writes ------------------------------------------------------------------
//
// THE TWO ROUTES THAT LET AN ORDER PHYSICALLY MOVE. Both existed with no caller: the queue above
// could show shipments and nothing on the platform could create one or advance it, so every row it
// listed had been written by a seed or a probe.
//
// BOTH ANSWER **201** WITH THE WHOLE SHIPMENT, lines and event history included, so neither needs a
// re-read to show what it did. A `201` here IS a result — unlike the R&D claim surface's 202s,
// nothing is pending a human.

/**
 * `POST /commerce/orders/:orderId/shipments` — puts order lines in a box.
 *
 * ⚠️ **THE COUNTERPARTY WRITES THIS, NOT THE BUYER.** The route is scoped to the active commerce
 * organization and the service checks it against the order's own parties, so a buyer calling it is
 * refused. Offer the control on the seller's side only — not because the client enforces anything,
 * but because a control that always 403s is a lie about who does the work.
 *
 * ⚠️ **QUANTITIES ARE PER ORDER LINE AND THE SERVER OWNS THE CEILING.** A line can ship in parts, so
 * the check is against what remains unshipped rather than against the ordered quantity; a client
 * cap is a convenience and never the rule.
 *
 * `legs` is not sent — see `CreateShipmentInput` for why a leg with no way to advance it is worse
 * than no leg.
 */
export function createOrderShipment(
  orderId: string,
  input: CreateShipmentInput,
  options?: RequestOptions,
): Promise<ActionResponse<WrittenShipment>> {
  const path = `/commerce/orders/${encodeURIComponent(orderId)}/shipments`;
  return sendJson(path, "POST", input, WrittenShipmentSchema, options);
}

/**
 * `POST /commerce/shipments/:shipmentId/events` — advances one shipment.
 *
 * ⚠️ **THE EVENT IS THE FACT AND THE STATE IS DERIVED FROM IT.** `delivered` is a claim that the
 * goods arrived, on a record the buyer reads; nothing here may be optimistic, and the row's new
 * state comes from the response rather than from the kind that was sent.
 *
 * A **409** is the state machine refusing the transition — advancing a `cancelled` shipment, say —
 * and is a finding to surface, not a retry.
 */
export function appendShipmentEvent(
  shipmentId: string,
  input: AppendShipmentEventInput,
  options?: RequestOptions,
): Promise<ActionResponse<WrittenShipment>> {
  const path = `/commerce/shipments/${encodeURIComponent(shipmentId)}/events`;
  return sendJson(path, "POST", input, WrittenShipmentSchema, options);
}
