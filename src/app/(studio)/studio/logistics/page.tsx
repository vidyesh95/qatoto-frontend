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
 * BLOCKED ON A CROSS-ORDER SHIPMENT READ THAT DOES NOT EXIST.
 *
 * `commerce-fulfillment.routes.ts` exposes `GET /commerce/orders/:orderId/shipments`,
 * `GET /commerce/shipments/:shipmentId` and its events — every one scoped to an id the caller already holds.
 * There is no `GET /commerce/provider/shipments`, which is the only thing a logistics queue is.
 *
 * Stitching one together client-side would be a request per order and could only cover the orders currently
 * loaded, so a shipment could be missing from a page claiming to list all of them. See the component.
 */
export default function StudioLogisticsRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <LogisticsOverview />
    </div>
  );
}
