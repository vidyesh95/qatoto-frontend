import type { Metadata } from "next";

import LogisticsOverview from "@/components/studio/commerce/logistics/logistics-overview";

// Permanently dynamic: session-scoped and behind a provider organization membership.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Logistics",
  description: "Shipments your organization is carrying on Qatoto",
};

/**
 * THE CROSS-ORDER SHIPMENT QUEUE.
 *
 * ⚠️ THIS COMMENT USED TO SAY THE ROUTE DID NOT EXIST, and it had been wrong since A29:
 * `GET /commerce/provider/shipments` (`commerce-fulfillment.routes.ts:40`) is what the component
 * below reads, and A38 added the buyer twin beside it. The component was rewired and this banner
 * was not — read a stale blocker as a claim to CHECK, not as a fact.
 *
 * The half that was right survives in the component: stitching a queue together client-side would
 * be one request per order and could only cover the orders currently loaded, so a shipment could be
 * missing from a page claiming to list all of them.
 *
 * Shipments are CREATED from the order they belong to (`/studio/orders/[orderId]`), because that is
 * how the backend scopes the write — the queue lists no order this page could create one against.
 *
 * THEIR LEGS ARE ADVANCED HERE, THOUGH, and that is the difference this page gained. A leg is its
 * own state machine on `POST /commerce/shipment-legs/:legId/commands`, scoped through the leg
 * rather than the order, so `book`/`depart`/`arrive`/`complete` belong on the queue that lists
 * every leg a seller is carrying. Expanding a row opens `ShipmentLegPanel`.
 */
export default function StudioLogisticsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <LogisticsOverview />
    </div>
  );
}
