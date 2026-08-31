// TRANSPORT: client-query — one organization-scoped read, made from a client island.
//
// WIRED, AND THIS FILE IS NEW BECAUSE `/studio/sales` SHIPPED WITH A PANEL EXPLAINING ITS OWN ABSENCE.
// That page carried "Revenue and profit are not shown here yet — nothing on this platform reports
// a seller's takings", which was true of the ROUTES and false of the DATA: the double-entry
// journal, the payment intents and the refund rows had all existed since Phase 14. Phase 25 added
// the route that sums them.
//
// The panel also named the tempting wrong answer, and it was right about it: adding up
// `totalInCents` over the orders on the page would count unpaid orders, ignore refunds, and cover
// only one page. A server-side aggregate is the only correct shape for a revenue figure.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  SellerEarningsSchema,
  type SellerEarnings,
  type SellerEarningsFilter,
} from "@/lib/store/earnings.schemas";

/**
 * What this organization has been paid — `GET /commerce/provider/earnings`.
 *
 * NOT A PAGE. Every other provider-scoped read in this folder answers a cursor envelope; this one
 * answers a single object, because an aggregate has nothing to page through. So it is a plain
 * `getJson` rather than the `cursorPageOf(...)` shape its neighbours use.
 */
export function getSellerEarnings(
  filter: SellerEarningsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<SellerEarnings>> {
  const path = `/commerce/provider/earnings${buildQueryString({ ...filter })}`;
  return getJson(path, SellerEarningsSchema, options);
}
