// TRANSPORT: client-query — quotes are session-scoped and read from client islands.
//
// MOCK-BACKED: every call resolves a fixture. To wire one, swap `resolveMockRead` for `getJson`, or the
// mock write for the `sendJson` line beside it, and drop the fixture argument.
//
// THERE IS NO QUOTE-SCOPED COMPARISON ENDPOINT, and that shaped the routes rather than being worked
// around. `listQuotesForRfq` is keyed on the RFQ, because comparing quotes means comparing the answers to
// ONE requirement — a comparison hanging off a single quote id has no natural data behind it. So
// `/store/rfqs/:rfqId/compare` is the canonical route, and `/store/quotes/:quoteId/compare` resolves the
// quote's `rfqId` first and renders the same body. See `compareQuotesForQuote` below.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  QuoteComparisonListSchema,
  QuoteDetailSchema,
  type AcceptQuoteInput,
  type QuoteComparisonItem,
  type QuoteDetail,
} from "@/lib/store/quotes.schemas";
import {
  MOCK_QUOTE_COMPARISONS_BY_RFQ_ID,
  MOCK_QUOTE_DETAILS_BY_ID,
  MOCK_RFQ_ID_BY_QUOTE_ID,
} from "@/mocks/store/quotes-mocks";

/**
 * One quote, with its latest revision.
 *
 * NO `callerRelation` ON THIS READ — it carries `providerOrganizationId` and `rfqId` and nothing saying
 * which side the caller is. The provider side is derivable by comparing ids; the buyer side is not,
 * because the buyer organization lives on the RFQ. So the quote page reads the RFQ as well and uses its
 * server-stated `callerRelation`.
 */
export function getQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteDetail>> {
  const path = `/commerce/quotes/${quoteId}`;
  return resolveMockDetail(path, QuoteDetailSchema, options, MOCK_QUOTE_DETAILS_BY_ID, quoteId);
  // return getJson(path, QuoteDetailSchema, options);
}

/**
 * The quotes on one RFQ that THIS CALLER may see. Unpaginated — the set is bounded by the invitation list.
 *
 * IT IS NOT ALWAYS A COMPARISON, and the difference is authorization the server already applied:
 *   a BUYER gets every non-draft quote on the RFQ — that is a comparison;
 *   a PROVIDER gets only its OWN quote, drafts included — that is one row, and calling it a comparison
 *   would imply the others were hidden rather than never sent.
 * A provider with no quote and no visibility gets a 404, not an empty list, so the route cannot be used to
 * probe for RFQs. The frontend never re-filters and never asks for more.
 *
 * A row's `latestSubmittedRevision` may be NULL — no submitted revision is visible on this read. That is
 * not zero and must not render as a price.
 */
export async function compareQuotesForRfq(
  rfqId: string,
  options?: RequestOptions,
): Promise<ActionResponse<readonly QuoteComparisonItem[]>> {
  const path = `/commerce/rfqs/${rfqId}/quotes`;
  const comparison = MOCK_QUOTE_COMPARISONS_BY_RFQ_ID[rfqId];
  if (comparison === undefined) {
    return { success: false, error: { code: "404", message: "Not found." } };
  }
  // The wire shape is `{ items }`, so the schema parses an object and the array is unwrapped HERE rather
  // than in every caller — nothing downstream should know the envelope had a wrapper. The fixture is
  // stored as a bare array and wrapped on the way in, so it stays readable as a list of quotes.
  const parsed = await resolveMockRead(path, QuoteComparisonListSchema, options, {
    items: comparison,
  });
  // const parsed = await getJson(path, QuoteComparisonListSchema, options);
  if (!parsed.success) return parsed;
  return { success: true, data: parsed.data.items };
}

/**
 * The quote-scoped comparison, which is TWO ROUND TRIPS BY CONSTRUCTION.
 *
 * There is no `GET /commerce/quotes/:quoteId/quotes`. Comparison is RFQ-scoped, so reaching it from a
 * quote id means resolving the quote to learn its `rfqId` and then listing that RFQ's quotes. That is
 * genuinely two reads for data that is naturally one, which is why the RFQ-scoped route is canonical and
 * this exists only so an existing `/store/quotes/:id/compare` link does not 404.
 */
export async function compareQuotesForQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<
  ActionResponse<{ readonly rfqId: string; readonly quotes: readonly QuoteComparisonItem[] }>
> {
  const rfqId = MOCK_RFQ_ID_BY_QUOTE_ID[quoteId];
  if (rfqId === undefined) {
    return { success: false, error: { code: "404", message: "Not found." } };
  }
  // Wired, this is `await getQuote(quoteId)` then `.rfqId` — the quote read is the only way to learn it.
  const comparison = await compareQuotesForRfq(rfqId, options);
  if (!comparison.success) return comparison;
  return { success: true, data: { rfqId, quotes: comparison.data } };
}

/**
 * Accepts a specific revision, creating one order per counterparty from that snapshot.
 *
 * `expectedRevision` IS THE POINT. If the provider appended since the buyer looked, the server answers
 * `REVISION_CHANGED` with the current number and accepts nothing — the buyer has to read the new terms
 * first. That 409 is a FINDING, never a retry: retrying with a bumped number would accept terms the
 * buyer never saw, which is the one thing an immutable commercial record must not be built from.
 *
 * Other refusals worth rendering distinctly: `QUOTE_EXPIRED` (the validity deadline passed),
 * `CONFLICTING_ACCEPTANCE` (another quote on this RFQ was already accepted, and it names the order),
 * `SETTLEMENT_UNAVAILABLE` (the named escrow terms lapsed — refused rather than silently downgraded to
 * an unprotected rail), and `INSUFFICIENT_STOCK`.
 *
 * Requires an `Idempotency-Key`, minted once per attempt by the caller.
 */
export function acceptQuote(
  quoteId: string,
  input: AcceptQuoteInput,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteDetail>> {
  const path = `/commerce/quotes/${quoteId}/accept`;
  void input;
  // Returns the quote unchanged. Synthesising `status: "accepted"` would claim an acceptance the server
  // never validated — and acceptance is the moment an order becomes immutable, so a fabricated one is the
  // worst possible mock.
  return resolveMockDetail(path, QuoteDetailSchema, options, MOCK_QUOTE_DETAILS_BY_ID, quoteId);
  // return sendJson(path, "POST", input, QuoteDetailSchema, options);
}

export function declineQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteDetail>> {
  const path = `/commerce/quotes/${quoteId}/decline`;
  return resolveMockDetail(path, QuoteDetailSchema, options, MOCK_QUOTE_DETAILS_BY_ID, quoteId);
  // return sendJson(path, "POST", undefined, QuoteDetailSchema, options);
}

/** A provider withdraws before the buyer acts. After acceptance it is refused — the order exists. */
export function withdrawQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteDetail>> {
  const path = `/commerce/quotes/${quoteId}/withdraw`;
  return resolveMockDetail(path, QuoteDetailSchema, options, MOCK_QUOTE_DETAILS_BY_ID, quoteId);
  // return sendJson(path, "POST", undefined, QuoteDetailSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while reads are mock-backed.
void getJson;
void sendJson;
