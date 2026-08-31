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
import { ShipmentLegSchema, type ShipmentLeg } from "@/lib/store/fulfillment.schemas";
import {
  ShipmentDetailSchema,
  ShipmentLegEventListSchema,
  ShipmentQueuePageSchema,
  WrittenShipmentSchema,
  type AppendShipmentEventInput,
  type CreateShipmentInput,
  type ListShipmentsFilter,
  type ShipmentDetail,
  type ShipmentLegCommand,
  type ShipmentLegEventList,
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
 * `legs` IS sent now. It was withheld while nothing could advance a leg; `executeShipmentLegCommand`
 * below is that surface, so a leg created here can be booked, departed, arrived and completed.
 *
 * ⚠️ **THIS CALL IS A SELLER'S ONLY CHANCE TO NAME THE TRANSPORT MODE OR THE FORWARDER CARRYING A
 * LEG.** No route adds a leg to an existing shipment or re-points `logisticsEngagementId`.
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

/**
 * One shipment in full — `GET /commerce/shipments/:shipmentId`.
 *
 * THE ONLY READ THAT RETURNS LEGS. The two queues above project a cross-order summary with a
 * `max()` ETA and no leg rows at all, so "which transport is this moving by, and who is carrying
 * it" is answerable here and nowhere else.
 */
export function getShipmentDetail(
  shipmentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ShipmentDetail>> {
  const path = `/commerce/shipments/${encodeURIComponent(shipmentId)}`;
  return getJson(path, ShipmentDetailSchema, options);
}

/**
 * `POST /commerce/shipment-legs/:legId/commands` — advances ONE leg.
 *
 * ⚠️ **THE ROUTE REQUIRES AN `Idempotency-Key` HEADER** (`requireIdempotencyKey` in the controller)
 * and a missing one is refused before the body is read. The key is minted once per ATTEMPT in
 * component state, never per render and never per retry of a different command: replaying a key
 * returns the FIRST call's stored response, which is the point.
 *
 * ⚠️ **A 409 IS A FINDING, NOT A RETRY.** `expectedVersion` is echoed from the leg that was read;
 * if it is stale, somebody else moved this leg and the honest answer is to re-read and show what
 * they did. Bumping the number and resending would overwrite their command.
 *
 * Answers **200** with the updated leg — not the shipment. Re-read the shipment for the rest.
 */
export function executeShipmentLegCommand(
  legId: string,
  command: ShipmentLegCommand,
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<ShipmentLeg>> {
  const path = `/commerce/shipment-legs/${encodeURIComponent(legId)}/commands`;
  return sendJson(path, "POST", command, ShipmentLegSchema, {
    ...options,
    headers: { ...options?.headers, "Idempotency-Key": idempotencyKey },
  });
}

/**
 * `GET /commerce/shipment-legs/:legId/events` — one leg's history, oldest first.
 *
 * Finer-grained than the shipment's own event list: a leg records `departed`, which has no
 * equivalent on `commerce_shipment_event_kind`.
 */
export function listShipmentLegEvents(
  legId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ShipmentLegEventList>> {
  const path = `/commerce/shipment-legs/${encodeURIComponent(legId)}/events`;
  return getJson(path, ShipmentLegEventListSchema, options);
}
