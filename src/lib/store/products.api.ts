// TRANSPORT: server-fetch for the reads, client-query for the engagement writes.
//
// WIRED. Every function here reaches the real backend — this domain never had a mock transport to
// swap out, because it never had an api layer at all: `product-detail.tsx` took a `slug` prop and
// did `void slug`, rendering one hardcoded chair for every id in the catalogue.
//
// THE PRODUCT READ IS PUBLIC BUT SESSION-AWARE. `GET /store/products/:productSlug` carries optional
// auth: it renders for a visitor with no account, and the session only decides two things —
// whether `engagement.viewer` is state or `null`, and whether `contactAffordance` is `chat`,
// `ask_question` or `sign_in`. So a server component must thread `callerRequestOptions()` in, or
// every signed-in buyer gets the anonymous projection and their own save toggle renders blank.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedProductAnswerSchema,
  CreatedProductQuestionSchema,
  ProductAnswerHelpfulVoteSchema,
  ProductAnswerListPageSchema,
  ProductCompanionsSchema,
  ProductDeliveryEstimatePageSchema,
  ProductEngagementSchema,
  ProductQuestionListPageSchema,
  RetractedProductAnswerSchema,
  RetractedProductQuestionSchema,
  SellerQuestionInboxPageSchema,
  StoreProductDetailSchema,
  StoreReviewListPageSchema,
  type AnswerListFilter,
  type AnswerProductQuestionInput,
  type AskProductQuestionInput,
  type CreatedProductAnswer,
  type CreatedProductQuestion,
  type DeliveryEstimateFilter,
  type ProductAnswerHelpfulVote,
  type ProductAnswerListPage,
  type ProductCompanions,
  type ProductDeliveryEstimatePage,
  type ProductEngagement,
  type ProductQuestionListPage,
  type QuestionListFilter,
  type RetractedProductAnswer,
  type RetractedProductQuestion,
  type ReviewListFilter,
  type SellerQuestionInboxFilter,
  type SellerQuestionInboxPage,
  type StoreProductDetail,
  type StoreReviewListPage,
  ProductViewBeaconResultSchema,
  type ProductViewBeaconInput,
  type ProductViewBeaconResult,
} from "@/lib/store/products.schemas";

/**
 * One product, in full — `GET /store/products/:productSlug`.
 *
 * A 404 means "no such product" OR "not visible to you": a draft, suspended or deleted listing
 * answers the same code as a typo, deliberately, so the route cannot be used to enumerate
 * unpublished catalogue. The caller runs `notFound()` and never renders a permission hint from it.
 */
export function getStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<StoreProductDetail>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}`;
  return getJson(path, StoreProductDetailSchema, options);
}

/**
 * Related products, grouped by `relationKind` — `GET /store/products/:productSlug/companions`.
 *
 * EVERY ITEM CARRIES `sourceKind` AND IT DECIDES THE WORDING. A `seller_declared` relation is the
 * seller's claim that its part fits; only `moderator_curated` has been checked. Rendering the first
 * as verified compatibility is a safety claim the platform has not made — use
 * `companionSourceCaption` rather than inventing copy at the call site.
 */
export function getStoreProductCompanions(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductCompanions>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/companions`;
  return getJson(path, ProductCompanionsSchema, options);
}

/**
 * Reviews for one product — `GET /store/products/:productSlug/reviews`.
 *
 * SORT AND FILTER ARE QUERY PARAMETERS, NOT A CLIENT PASS. Re-slicing the fetched page would make
 * the chips lie about counts beyond it. `summary` is computed over every visible review in scope
 * rather than the filtered subset, so the chips keep their numbers as you click them.
 */
export function listStoreProductReviews(
  productSlug: string,
  filter: ReviewListFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreReviewListPage>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/reviews${buildQueryString({ ...filter })}`;
  return getJson(path, StoreReviewListPageSchema, options);
}

/**
 * Questions for one product — `GET /store/products/:productSlug/questions`.
 *
 * Each row embeds at most ONE answer, the seller's first. The rest are a separate paginated read;
 * see `listStoreQuestionAnswers`.
 */
export function listStoreProductQuestions(
  productSlug: string,
  filter: QuestionListFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProductQuestionListPage>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/questions${buildQueryString({ ...filter })}`;
  return getJson(path, ProductQuestionListPageSchema, options);
}

/** Every answer to one question — `GET /store/products/:slug/questions/:questionId/answers`. */
export function listStoreQuestionAnswers(
  productSlug: string,
  questionId: string,
  filter: AnswerListFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ProductAnswerListPage>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/questions/${encodeURIComponent(questionId)}/answers${buildQueryString({ ...filter })}`;
  return getJson(path, ProductAnswerListPageSchema, options);
}

/**
 * An indicative delivery estimate — `GET /store/products/:productSlug/delivery-estimate`.
 *
 * THREE THINGS IT DELIBERATELY DOES NOT RETURN, and each one the mock rendered anyway:
 *
 *   NO DELIVERY DATE, ever. A range of days, because Qatoto owns no shipping network and a date it
 *   cannot keep is a promise it has no business making. See §19 for what a post-order arrival
 *   WINDOW would take.
 *   NO ZERO FOR AN UNCOVERED ROUTE — `estimates` comes back EMPTY. "We do not know" and "it is
 *   free" are different answers and the mock rendered the second for both.
 *   NO CURRENCY CONVERSION. One entry per currency; converting without an FX quote invents a rate.
 *
 * `destinationCountryCode` is required and explicit rather than server-derived, because the
 * browse-country selector is a display preference the backend must not trust.
 */
export function getStoreProductDeliveryEstimate(
  productSlug: string,
  filter: DeliveryEstimateFilter,
  options?: RequestOptions,
): Promise<ActionResponse<ProductDeliveryEstimatePage>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/delivery-estimate${buildQueryString({ ...filter })}`;
  return getJson(path, ProductDeliveryEstimatePageSchema, options);
}

// --- Engagement writes ------------------------------------------------------
//
// NO IDEMPOTENCY KEY ON ANY OF THESE. Like and bookmark are `PUT`/`DELETE` of a boolean and are
// idempotent by verb — a key would be ceremony around an operation that is already safe to repeat.
// Share and the view beacon are counters the server dedupes itself.
//
// All four answer the refreshed `engagement` object, so the caller writes the server's own count
// into cache rather than incrementing locally. Nothing here is optimistic: these are small numbers
// and a toggle that flickers back teaches a buyer the counts are not to be trusted.
//
// LIKE AND BOOKMARK ARE NOT INTERCHANGEABLE, whatever the symmetry of these four functions
// suggests. A like moves a public counter and changes no list. A bookmark IS the wishlist and is
// the only thing `listBookmarkedProducts` returns — which is why only the bookmark hooks
// invalidate that query.

/**
 * Likes the product for the calling USER — a public reaction. Idempotent.
 *
 * This does NOT put the product in the buyer's wishlist. It was `saveStoreProduct` against
 * `/save` until the backend's migration 0120, and that name is exactly why the two kept being
 * confused for one another.
 */
export function likeStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/like`;
  return sendJson(path, "PUT", undefined, ProductEngagementSchema, options);
}

/** Withdraws the caller's like. Idempotent — clearing twice is not an error. */
export function unlikeStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/like`;
  return sendJson(path, "DELETE", undefined, ProductEngagementSchema, options);
}

/** Puts the product in the caller's wishlist — the ONE gesture `/wishlist` lists. Idempotent. */
export function bookmarkStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/bookmark`;
  return sendJson(path, "PUT", undefined, ProductEngagementSchema, options);
}

/** Removes the product from the caller's wishlist. Idempotent. */
export function unbookmarkStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/bookmark`;
  return sendJson(path, "DELETE", undefined, ProductEngagementSchema, options);
}

/**
 * `POST /store/products/:productSlug/view-beacon` — records that somebody looked, and for how long.
 *
 * ⚠️ **THE ONLY UNAUTHENTICATED WRITE ON THE STORE.** The route is `attachOptionalUser`, so a
 * signed-out reader is counted too. That is deliberate — a conversion rate is orders over views,
 * and dropping anonymous traffic would make the denominator a fiction — but it is also why the
 * privacy policy had to grow a product-view disclosure when this shipped.
 *
 * ⚠️ **IT ANSWERS 200 WITH THE SERVER'S OWN CLAMPED NUMBERS, UNLIKE THE VIDEO BEACON.**
 * `recordViewBeacon` in `src/lib/feed/api.ts` parses `AcknowledgedSchema` because that route
 * answers a bare 202, on the stated ground that returning the clamped watch time "would hand an
 * attacker an oracle for the clamp". This route made the opposite call and returns
 * `{ dwellSeconds, isCountedView }`. So it needs its own schema — and any UI must render the
 * SERVER's number, never the client's own count, which is the reason the field is returned at all.
 *
 * No idempotency key and no rate-limit concern here: the server dedupes on
 * (product, viewer fingerprint, UTC day) and clamps the dwell by wall time, so a replayed beacon
 * rewrites one row rather than adding one.
 */
export function recordProductViewBeacon(
  productSlug: string,
  input: ProductViewBeaconInput,
  options?: RequestOptions,
): Promise<ActionResponse<ProductViewBeaconResult>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/view-beacon`;
  return sendJson(path, "POST", input, ProductViewBeaconResultSchema, options);
}

/** Records that the product was shared. Not a link mint — the count is the whole effect. */
export function shareStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/share`;
  return sendJson(path, "POST", undefined, ProductEngagementSchema, options);
}

// --- Question and answer writes ---------------------------------------------
//
// ⚠️ THESE LIVE UNDER `/commerce`, NOT `/store`, unlike every read above them. The reads are public
// (`attachOptionalUser`) and sit on the storefront router; the writes are authenticated and sit on
// the trust router. One surface, two mounts — do not "tidy" a write onto the `/store` prefix.
//
// ⚠️ AND THE CREATE IS KEYED ON `productId`, NOT `publicSlug`. Every read on this page is addressed
// by slug, so the id has to be threaded down separately. Passing the slug here is a 404 that looks
// exactly like a missing product.
//
// TWO OF THE SIX REQUIRE AN `Idempotency-Key`, AND IT IS A HEADER. `POST …/questions` and
// `POST …/answers` go through the backend's `idempotency({ required: true, scope: "user" })`
// middleware, which answers **400** when the header is absent — a missing key is a refusal, not a
// default. The scope is the USER rather than the active organization, so switching organizations
// mid-attempt does not mint a second question. The four remaining routes take no key: the deletes
// and the helpful pair are idempotent by verb, the same reasoning the engagement block above states.

/**
 * Asks the seller a public question — `POST /commerce/products/:productId/questions`, **201**.
 *
 * ANY IDENTIFIED USER MAY ASK; no organization is needed, which is exactly what
 * `contactAffordance: "ask_question"` encodes. The product must be publicly eligible: asking about a
 * draft or suspended listing answers 404, so the route cannot confirm that a hidden id exists.
 *
 * ⚠️ A REPLAYED KEY STILL ANSWERS **201**, with the original response and an `Idempotency-Replayed`
 * header — not 200. Do not treat a 200 as "already asked".
 */
export function askProductQuestion(
  productId: string,
  input: AskProductQuestionInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedProductQuestion>> {
  const path = `/commerce/products/${encodeURIComponent(productId)}/questions`;
  return sendJson(path, "POST", input, CreatedProductQuestionSchema, options);
}

/**
 * Withdraws the caller's own question — `DELETE /commerce/questions/:questionId`.
 *
 * AUTHOR ONLY, and the match is on the USER. Anything else — someone else's question, one already
 * hidden, one already withdrawn — is a 404 rather than a 403, so the route never confirms that a
 * question the caller may not touch exists.
 */
export function retractProductQuestion(
  questionId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RetractedProductQuestion>> {
  const path = `/commerce/questions/${encodeURIComponent(questionId)}`;
  return sendJson(path, "DELETE", undefined, RetractedProductQuestionSchema, options);
}

/**
 * Answers a question — `POST /commerce/questions/:questionId/answers`, **201**.
 *
 * ⚠️ NOT OPEN TO EVERY SIGNED-IN USER. The service resolves exactly two standings from the database:
 * the selling organization (`authorKind: "seller"`) or an organization holding a completion against
 * this product (`"verified_buyer"`). Anyone else — including a signed-in user with no active
 * commerce organization — is **403**, and that refusal is what stops Q&A quietly becoming the public
 * comment surface the backend has not decided on yet.
 *
 * ⚠️ **THE 409 IS PER ORGANIZATION, NOT PER USER.** One answer per organization per question, on a
 * unique index — so a colleague having answered refuses you with `ALREADY_ANSWERED` even though you
 * personally never did. Surface the backend's own message; a "you already answered" paraphrase is
 * wrong for exactly the person who did not.
 */
export function answerProductQuestion(
  questionId: string,
  input: AnswerProductQuestionInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedProductAnswer>> {
  const path = `/commerce/questions/${encodeURIComponent(questionId)}/answers`;
  return sendJson(path, "POST", input, CreatedProductAnswerSchema, options);
}

/** Withdraws the caller's own answer. Author-only on the USER, 404 for anything else — as above. */
export function retractProductAnswer(
  answerId: string,
  options?: RequestOptions,
): Promise<ActionResponse<RetractedProductAnswer>> {
  const path = `/commerce/answers/${encodeURIComponent(answerId)}`;
  return sendJson(path, "DELETE", undefined, RetractedProductAnswerSchema, options);
}

/**
 * Endorses an answer — `PUT /commerce/answers/:answerId/helpful`.
 *
 * NEEDS AN ACTIVE COMMERCE ORGANIZATION, because the vote table is keyed on the organization rather
 * than the user. That is the same fact `answer.viewer === null` already encodes on the read, so the
 * control can be gated without probing this route.
 *
 * ⚠️ AN AUTHOR MAY NOT ENDORSE THEIR OWN ANSWER — **403**, refused in the service and again by a
 * database trigger. The `DELETE` below deliberately has no such check.
 */
export function markProductAnswerHelpful(
  answerId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductAnswerHelpfulVote>> {
  const path = `/commerce/answers/${encodeURIComponent(answerId)}/helpful`;
  return sendJson(path, "PUT", undefined, ProductAnswerHelpfulVoteSchema, options);
}

/** Withdraws the caller's endorsement. Idempotent — clearing a vote nobody cast is not an error. */
export function clearProductAnswerHelpfulVote(
  answerId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductAnswerHelpfulVote>> {
  const path = `/commerce/answers/${encodeURIComponent(answerId)}/helpful`;
  return sendJson(path, "DELETE", undefined, ProductAnswerHelpfulVoteSchema, options);
}

/**
 * The seller's own question inbox — `GET /commerce/seller/questions`.
 *
 * ⚠️ **AN EMPTY INBOX AND "YOU ARE NOT A SELLER" ARE THE SAME RESPONSE.** Measured: an organization
 * that owns no listings answers **200 with zero items**, not 403. The guard admits any caller holding
 * a seller or owner membership, and the data protection is the `product.sellerOrganizationId` scoping
 * rather than the guard — a real 403 needs no active organization at all. So the caller's empty state
 * must say "no questions", never "you are not a seller": a seller who has cleared their queue gets a
 * byte-identical payload.
 *
 * SCOPED BY LISTING OWNERSHIP, and moderator-hidden questions are withheld from the seller too —
 * answering one would republish it underneath the moderation decision.
 */
export function listSellerQuestionInbox(
  filter: SellerQuestionInboxFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<SellerQuestionInboxPage>> {
  const path = `/commerce/seller/questions${buildQueryString({ ...filter })}`;
  return getJson(path, SellerQuestionInboxPageSchema, options);
}
