import type { Metadata } from "next";

import SalesPage from "@/components/commerce/sales-page";

// Permanently dynamic: session-scoped and behind a seller organization.
export const instant = false;

/**
 * THE SELLER'S DESK, AND IT LIVES IN THE STUDIO NOW.
 *
 * This page used to be `/sales` under `(home)`, which made every click leave the chrome it was
 * rendered in: the order rows below link to `/studio/orders/[orderId]`, and `/studio/earn` and the
 * earnings panel both link back here. Studio is where a seller creates the listing, so it is where
 * the money that listing makes belongs.
 *
 * NO `robots` HERE, DELIBERATELY. `(studio)/layout.tsx` sets `noindex` for the whole group; the
 * `(home)` version had to declare its own because `(home)` has no such default.
 *
 * IT ALSO ABSORBED `/studio/orders`. That page rendered `GET /commerce/provider/orders`, which is
 * exactly the "All orders received" section below — one seller queue in two places was one place
 * for it to drift. The `[orderId]` detail route stays; it is what every row here opens.
 */
export const metadata: Metadata = {
  title: "Sales",
  description: "Orders you have received on Qatoto",
};

export default function StudioSales() {
  return <SalesPage />;
}
