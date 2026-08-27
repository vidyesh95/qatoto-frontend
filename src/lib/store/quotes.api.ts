// TRANSPORT: client-query — quotes are session-scoped and read from client islands.
//
// WIRED. `src/mocks/store/quotes-mocks.ts` is deleted.
//
// THREE WRITES ANSWERED SOMETHING OTHER THAN A QUOTE, and all three parsed nothing:
//
//  1. `accept` RETURNS AN **ORDER**. Accepting a revision is what creates the order from that
//     snapshot, so the answer is the thing that now exists. It parsed `QuoteDetailSchema`, which
//     shares almost no fields with an order — on the one write where a wrong shape costs most.
//  2. `decline` and `withdraw` RETURN THE QUOTE **SHELL** — six fields, no `latestRevision` and
//     none of the five lifecycle timestamps `QuoteDetailSchema` requires.
//
// All three also require an `Idempotency-Key`, which only `accept`'s docstring mentioned.
//
// LEGACY NOTE — to wire a call, swap `resolveMockRead` for `getJson`, or the
// mock write for the `sendJson` line beside it, and drop the fixture argument.
//
// THERE IS NO QUOTE-SCOPED COMPARISON ENDPOINT, and that shaped the routes rather than being worked
// around. `listQuotesForRfq` is keyed on the RFQ, because comparing quotes means comparing the answers to
// ONE requirement — a comparison hanging off a single quote id has no natural data behind it. So
// `/store/rfqs/:rfqId/compare` is the canonical route, and `/store/quotes/:quoteId/compare` resolves the
// quote's `rfqId` first and renders the same body. See `compareQuotesForQuote` below.

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import { CommerceOrderSchema, type CommerceOrder } from "@/lib/store/cart.schemas";
import {
  AppendedQuoteRevisionSchema,
  ProviderQuoteQueuePageSchema,
  QuoteComparisonListSchema,
  QuoteDetailSchema,
  QuoteShellSchema,
  SubmittedQuoteRevisionSchema,
  type AcceptQuoteInput,
  type AppendQuoteRevisionInput,
  type AppendedQuoteRevision,
  type ListProviderQuotesFilter,
  type ProviderQuoteQueueItem,
  type QuoteComparisonItem,
  type QuoteDetail,
  type QuoteShell,
  type SubmittedQuoteRevision,
} from "@/lib/store/quotes.schemas";

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
  return getJson(path, QuoteDetailSchema, options);
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
  const path = `/commerce/rfqs/${encodeURIComponent(rfqId)}/quotes`;
  // The wire shape is `{ items }`, so the schema parses an object and the array is unwrapped HERE rather
  // than in every caller — nothing downstream should know the envelope had a wrapper.
  const parsed = await getJson(path, QuoteComparisonListSchema, options);
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
  // The quote read is the only way to learn the RFQ id — there is no `rfqId` on the URL and no
  // route that maps one to the other. Its 404 is also this function's 404, which is correct: a
  // quote the caller cannot read is not a comparison they may see.
  const quote = await getQuote(quoteId, options);
  if (!quote.success) return quote;
  const rfqId = quote.data.rfqId;

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
): Promise<ActionResponse<CommerceOrder>> {
  /**
   * IT ANSWERS AN **ORDER**, NOT A QUOTE, and that is the whole point of the call.
   *
   * `acceptQuote` returns `OrderProjection` — accepting a revision is what CREATES the order from
   * that snapshot, so the useful answer is the thing that now exists rather than the thing that
   * was accepted. This used to parse `QuoteDetailSchema`, which shares almost no fields with an
   * order, so every accept would have failed its parse on the one write where that matters most.
   *
   * The caller navigates to the order. Re-read the quote if its new `status` is wanted.
   */
  const path = `/commerce/quotes/${encodeURIComponent(quoteId)}/accept`;
  return sendJson(path, "POST", input, CommerceOrderSchema, options);
}

export function declineQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteShell>> {
  const path = `/commerce/quotes/${encodeURIComponent(quoteId)}/decline`;
  return sendJson(path, "POST", undefined, QuoteShellSchema, options);
}

/** A provider withdraws before the buyer acts. After acceptance it is refused — the order exists. */
export function withdrawQuote(
  quoteId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteShell>> {
  const path = `/commerce/quotes/${encodeURIComponent(quoteId)}/withdraw`;
  return sendJson(path, "POST", undefined, QuoteShellSchema, options);
}

/**
 * Creates the empty quote shell on an RFQ — `POST /commerce/rfqs/:rfqId/quotes` (A38).
 *
 * EMPTY BODY. The shell carries no terms; the terms arrive as a revision appended to it, which is
 * what makes negotiation append-only.
 *
 * **CREATE IT LATE.** Creating the shell flips this provider's invitation to `responded`, which the
 * buyer's RFQ page renders as "Quoted". A shell minted when the provider merely OPENED a form would
 * tell the buyer they had been quoted while nothing exists — so the composer calls this on the first
 * real pricing attempt, not on mount.
 *
 * **ONE QUOTE PER PROVIDER PER RFQ, FOREVER.** A second call answers `409 CONFLICT` regardless of
 * the first quote's status, so withdrawing does not free the slot. That 409 is usually a RECOVERY,
 * not an error: re-read the RFQ's quotes, take the existing id and append to it.
 *
 * IT IS ALSO THE ONLY ONE OF THE THREE WRITES THAT CHECKS THE RFQ'S STATE. Append and submit look at
 * the QUOTE's status alone, so a provider who already has a quote may keep revising after the buyer
 * closes the RFQ. Do not gate the revise path on `rfq.state === "open"`.
 *
 * Requires an `Idempotency-Key`, minted once per attempt: a retry without one is a second shell on an
 * RFQ that permits exactly one.
 */
export function createQuoteShell(
  rfqId: string,
  options?: RequestOptions,
): Promise<ActionResponse<QuoteShell>> {
  const path = `/commerce/rfqs/${encodeURIComponent(rfqId)}/quotes`;
  return sendJson(path, "POST", undefined, QuoteShellSchema, options);
}

/**
 * Appends a priced revision — `POST /commerce/quotes/:quoteId/revisions` (A38).
 *
 * IT ANSWERS THE REVISION'S **MONEY**, NOT THE REVISION. `subtotalInCents` and `totalInCents` are
 * computed server-side from the lines and guarded by a CHECK, so they are absent from the request and
 * present in the response — which makes this call the first honest price the provider has seen. The
 * client never recomputes the total; a client-side sum that disagreed with the constraint would
 * present as a pricing dispute rather than as the bug it is.
 *
 * IT CARRIES NO LINES BACK. They were just sent and stored verbatim; echoing them would be a copy of
 * the request, and a screen rendering the echo would look right while proving nothing.
 *
 * **APPEND IS A COMMITMENT, NOT A SAVE.** Only one unsubmitted revision may exist at a time, and
 * there is NO route to abandon one — `commerce-quotes.routes.ts` has no DELETE. So after this
 * succeeds the only forward move is submit. Combined with `validityDeadlineAt`: if that deadline
 * passes before submit, submit answers `QUOTE_EXPIRED`, a second append is refused, and a fresh
 * shell is refused too. The quote is then stuck for that RFQ, which is why the composer prefills a
 * generous deadline and warns on a short one.
 *
 * Requires an `Idempotency-Key`, and it must be a DIFFERENT key from the shell call's — the
 * middleware replays a key against the body it first saw, so one key shared across two routes makes
 * the second call return the first call's answer.
 */
export function appendQuoteRevision(
  quoteId: string,
  input: AppendQuoteRevisionInput,
  options?: RequestOptions,
): Promise<ActionResponse<AppendedQuoteRevision>> {
  const path = `/commerce/quotes/${encodeURIComponent(quoteId)}/revisions`;
  return sendJson(path, "POST", input, AppendedQuoteRevisionSchema, options);
}

/**
 * Freezes a revision and offers it to the buyer —
 * `POST /commerce/quotes/:quoteId/revisions/:revision/submit` (A38).
 *
 * EMPTY BODY, and **IRREVERSIBLE**. `commerce_prevent_submitted_quote_revision_mutation` is a
 * database trigger rather than a service check, so there is no correction path and no administrative
 * override: a typo in a submitted revision is fixed by appending ANOTHER revision, never by editing
 * this one. Confirm before calling.
 *
 * What remains possible afterwards is worth saying in the confirmation, because it makes the step
 * less frightening than "irreversible" alone suggests: the whole quote may still be WITHDRAWN until
 * the buyer accepts, and a further revision may still be appended. What cannot change is this
 * revision.
 *
 * `REVISION_CHANGED` (409) carries the current number in `details` — a FINDING, never a retry with
 * the bumped number, because that would submit terms the provider did not just review.
 *
 * Requires an `Idempotency-Key`, distinct from the append call's.
 */
export function submitQuoteRevision(
  quoteId: string,
  revisionNumber: number,
  options?: RequestOptions,
): Promise<ActionResponse<SubmittedQuoteRevision>> {
  const path = `/commerce/quotes/${encodeURIComponent(quoteId)}/revisions/${revisionNumber}/submit`;
  return sendJson(path, "POST", undefined, SubmittedQuoteRevisionSchema, options);
}

/**
 * Every quote this provider has authored, across every RFQ — `GET /commerce/provider/quotes` (A38).
 *
 * **DRAFTS INCLUDED, and this is the only list anywhere that yields a draft quote's id.** The
 * RFQ-scoped comparison needs an RFQ id to start from, and `GET /commerce/provider/rfqs` lists the
 * WORK rather than the BIDS — an RFQ leaves that queue when it closes, taking any quote on it out of
 * reach. Without this read, a provider who appended a revision and closed the tab could lose the
 * quote entirely.
 *
 * `latestSubmittedRevision` IS NULL FOR A DRAFT-ONLY QUOTE. That is not zero and must not render as
 * a price.
 */
export async function listProviderQuotes(
  filter: ListProviderQuotesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ProviderQuoteQueueItem[]; nextCursor: string | null }>> {
  const query = new URLSearchParams();
  if (filter.status !== undefined) query.set("status", filter.status);
  if (filter.limit !== undefined) query.set("limit", String(filter.limit));
  if (filter.cursor !== undefined) query.set("cursor", filter.cursor);
  const queryString = query.toString();
  const path = `/commerce/provider/quotes${queryString === "" ? "" : `?${queryString}`}`;

  // The wire shape is `{ items, page }`; the keyset helpers this feeds want `{ rows, nextCursor }`,
  // so the envelope is unwrapped HERE rather than in every caller.
  const parsed = await getJson(path, ProviderQuoteQueuePageSchema, options);
  if (!parsed.success) return parsed;
  return {
    success: true,
    data: { rows: [...parsed.data.items], nextCursor: parsed.data.page.nextCursor },
  };
}
