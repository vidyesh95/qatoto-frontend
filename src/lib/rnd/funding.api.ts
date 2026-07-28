// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. `GET /funding/deals` is `requireAuth`, so a server component MUST
// forward the session cookie through `@/lib/server-http` or every call is a 401.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  FundingDealSchema,
  type FundingDeal,
  type ListFundingDealsFilter,
} from "@/lib/rnd/funding.schemas";

/**
 * Investor deal flow — open rounds on active projects.
 *
 * UNPAGINATED on the wire: the controller responds with a plain envelope and no
 * `pagination` sibling even though it accepts `?page=` and `?limit=`. So this is
 * `getJson` over an array, not `getPaginated`; asking for pagination metadata that
 * isn't sent would fail the parse and surface as a PARSE error.
 *
 * Filtered by `ENABLED_FUNDING_ROUND_TYPES` **in SQL**. Equity and venture rounds are
 * securities offerings and stay disabled at the API, which is why hiding their chip in
 * the UI is cosmetic rather than a control.
 */
export function listFundingDeals(
  filter: ListFundingDealsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FundingDeal[]>> {
  return getJson(
    `/funding/deals${buildQueryString({ ...filter })}`,
    FundingDealSchema.array(),
    options,
  );
}
