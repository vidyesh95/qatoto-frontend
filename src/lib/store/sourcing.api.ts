// TRANSPORT: client-query — reads GET /commerce/sourcing/quote-lines.
//
// THE COST BASIS PICKER'S ONLY READ, AND IT EXISTS BECAUSE THE OBVIOUS ONE IS WRONG.
// `GET /commerce/quotes/:quoteId` is the only other route that emits a quote product line's `id`,
// but it projects the LATEST revision while the listing save requires the ACCEPTED one. On a quote
// that was accepted and then revised, that read cannot produce a linkable id at all — and reaching
// it needs three round trips per quote (`/rfqs/mine` → `/rfqs/:id/quotes` → `/quotes/:id`), which
// is N+1 from a browser.
//
// "SOURCING", NOT "QUOTES", because of who is asking. The caller is a SELLER writing a listing; the
// rows are quotes they accepted as a BUYER. One organization, two roles.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  SourcingQuoteLinePageSchema,
  type ListSourcingQuoteLinesFilter,
  type SourcingQuoteLinePage,
} from "@/lib/store/sourcing.schemas";

/**
 * Every accepted quote product line this organization may link a listing to.
 *
 * NO STATUS FILTER, deliberately — the server returns only accepted-revision lines, so there is no
 * other state to ask for. A filter here would imply the picker could offer something the save then
 * refuses.
 */
export function listSourcingQuoteLines(
  filter: ListSourcingQuoteLinesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<SourcingQuoteLinePage>> {
  const path = `/commerce/sourcing/quote-lines${buildQueryString({ ...filter })}`;
  return getJson(path, SourcingQuoteLinePageSchema, options);
}
