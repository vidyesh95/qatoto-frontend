// TRANSPORT: server-fetch — the two public reads are awaited by server components. Everything
// below the `Writes` divider is NOT: the inquiry lifecycle is session-scoped and called from
// `"use client"` islands.
//
// WIRED. `src/mocks/store/factories-mocks.ts` is deleted rather than kept as a fallback.
//
// THREE DRIFTS WERE FIXED IN THE SAME EDIT, because each would have failed on the first live call:
//
//  1. THE INQUIRY DETAIL AND LIFECYCLE ROUTES ANSWER A BARE ROW, not `{ inquiry }`. The controller
//     returns `data: result.value`, so the wrapper `FactoryInquiryDetailSchema` described did not
//     exist on the wire and every one of the four calls parsed nothing.
//  2. `close` TAKES NO BODY. Its route registers no body parser and the controller never reads one,
//     so the `reason` this module used to accept was discarded in transit — a field that collects
//     an explanation and drops it. `commerce_manufacturing_inquiry` has no column for one either.
//     `cancelOrder` documents the same rule for the same reason.
//  3. `buyerDisplayName` and `standardName` were MISSING FROM THE BACKEND and were added there
//     rather than dropped here: without the first, the received queue is a wall of UUIDs; without
//     the second, any factory with a coded certification failed its whole page.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedFactoryInquirySchema,
  FactoryDetailSchema,
  FactoryDirectoryPageSchema,
  FactoryInquirySchema,
  FactoryInquiryListPageSchema,
  type CreatedFactoryInquiry,
  type CreateFactoryInquiryInput,
  type FactoryDetail,
  type FactoryDirectoryPage,
  type FactoryInquiry,
  type FactoryInquiryListPage,
  type ListFactoriesFilter,
  type ListFactoryInquiriesFilter,
} from "@/lib/store/factories.schemas";

/**
 * The manufacturer directory — `GET /store/factories`.
 *
 * THE PATH IS BUILT FROM THE REAL FILTER even though nothing is called. That is the point of
 * `resolveMockRead` taking a path: `buildQueryString` runs, the camelCase keys and snake_case enum
 * values are exercised, and a `?capabilityKind=contract-manufacturing` typo shows up in the dev log
 * today instead of as a 422 the week the endpoint lands.
 */
export function listStoreFactories(
  filter: ListFactoriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FactoryDirectoryPage>> {
  const path = `/store/factories${buildQueryString({ ...filter })}`;
  return getJson(path, FactoryDirectoryPageSchema, options);
}

/**
 * One factory — `GET /store/factories/:factorySlug`.
 *
 * A slug with no fixture answers 404, which is what the detail page turns into `notFound()`. The
 * backend will answer 404 for "no such factory" AND for "not visible to you" with one code, so a
 * renderer must never turn one into a permission hint.
 */
export function getStoreFactory(
  factorySlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryDetail>> {
  const path = `/store/factories/${factorySlug}`;
  return getJson(path, FactoryDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /commerce/factories/:factorySlug/inquiries` — creates a DRAFT inquiry.
 *
 * IT DOES NOT SEND AND IT NOTIFIES NOBODY. The row comes back `state: "draft"`, visible to nobody
 * outside the buyer's organization; sending is a separate call behind its own validation. Every word
 * on the success screen must say draft, and none may say sent — the same discipline `rfq-composer`
 * spells out for `POST /commerce/rfqs`.
 *
 * Requires an `Idempotency-Key`, minted once per attempt in component state. A fresh key on a retry
 * is a second inquiry sitting in the factory's queue for somebody to close by hand.
 */
export function createFactoryInquiry(
  factorySlug: string,
  input: CreateFactoryInquiryInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedFactoryInquiry>> {
  const path = `/commerce/factories/${factorySlug}/inquiries`;
  void input;
  // A FIXED row rather than an echo of the input — see the fixture's own comment. An echoed
  // reference could name an inquiry that does not resolve, and the first click would 404.
  return sendJson(path, "POST", input, CreatedFactoryInquirySchema, options);
}

// --- The inquiry lifecycle ---------------------------------------------------
//
// A NOTE ON PATH SHAPE, because it looks like a typo and is not. The literal
// `/commerce/factories/inquiries/*` paths sit at the SAME DEPTH as
// `/commerce/factories/:factorySlug/inquiries`, and the backend declares the literals first so
// `inquiries` is never captured as a factory slug (`commerce-factories.routes.order.test.ts`
// asserts it). Nothing here depends on that, but do not "tidy" one shape into the other: they are
// different routes, and `/factories/inquiries/mine` is not a factory called "inquiries".

/**
 * The buyer's own inquiries — `GET /commerce/factories/inquiries/mine`.
 *
 * WITHOUT THIS READ A CREATE IS A WRITE INTO A HOLE (§16.5). It is also what
 * `useCreateFactoryInquiry` invalidates; before this route existed, that mutation invalidated
 * nothing at all and said so in a comment.
 */
export function listOwnFactoryInquiries(
  filter: ListFactoryInquiriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiryListPage>> {
  const path = `/commerce/factories/inquiries/mine${buildQueryString({ ...filter })}`;
  return getJson(path, FactoryInquiryListPageSchema, options);
}

/**
 * The factory's queue — `GET /commerce/factories/inquiries/received`.
 *
 * DRAFTS ARE NEVER IN IT. Creating notifies nobody, so a factory that could see drafts would be
 * reading mail nobody posted. The fixture behind this call therefore contains no `draft` row, and
 * a fixture that grew one would be a contract bug rather than test data.
 */
export function listReceivedFactoryInquiries(
  filter: ListFactoryInquiriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiryListPage>> {
  const path = `/commerce/factories/inquiries/received${buildQueryString({ ...filter })}`;
  return getJson(path, FactoryInquiryListPageSchema, options);
}

/**
 * One inquiry — `GET /commerce/factories/inquiries/:inquiryId`, for either party.
 *
 * ONE ROUTE FOR BOTH SIDES, and the backend decides which of them you are. A frontend that picked
 * a "buyer view" or a "factory view" endpoint from client state would be letting the client claim
 * a role, which is the thing the trust boundary exists to refuse.
 */
export function getFactoryInquiry(
  inquiryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiry>> {
  const path = `/commerce/factories/inquiries/${encodeURIComponent(inquiryId)}`;
  return getJson(path, FactoryInquirySchema, options);
}

/**
 * `POST …/:inquiryId/send` — `draft` → `sent`, and opens the one-to-one thread.
 *
 * THIS IS THE CALL THAT NOTIFIES THE FACTORY. Everything the create's success screen was forbidden
 * from saying becomes true here and only here.
 *
 * Requires an `Idempotency-Key`: a retry without one can open a second thread on one inquiry.
 */
export function sendFactoryInquiry(
  inquiryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiry>> {
  const path = `/commerce/factories/inquiries/${encodeURIComponent(inquiryId)}/send`;
  return sendJson(path, "POST", undefined, FactoryInquirySchema, options);
}

/**
 * `POST …/:inquiryId/answer` — the factory marks it answered.
 *
 * A BOOKKEEPING MARK, NOT THE ANSWER ITSELF. The reply is a message in the thread; this only moves
 * the row out of the unworked part of the queue. Copy must not imply the buyer has been written to
 * by pressing it.
 */
export function answerFactoryInquiry(
  inquiryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiry>> {
  const path = `/commerce/factories/inquiries/${encodeURIComponent(inquiryId)}/answer`;
  return sendJson(path, "POST", undefined, FactoryInquirySchema, options);
}

/** `POST …/:inquiryId/close` — either party, from any state but `closed`. */
export function closeFactoryInquiry(
  inquiryId: string,
  options?: RequestOptions,
): Promise<ActionResponse<FactoryInquiry>> {
  const path = `/commerce/factories/inquiries/${encodeURIComponent(inquiryId)}/close`;
  return sendJson(path, "POST", undefined, FactoryInquirySchema, options);
}
