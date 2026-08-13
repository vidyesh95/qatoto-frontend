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
  ProductAnswerListPageSchema,
  ProductCompanionsSchema,
  ProductDeliveryEstimatePageSchema,
  ProductEngagementSchema,
  ProductQuestionListPageSchema,
  StoreProductDetailSchema,
  StoreReviewListPageSchema,
  type AnswerListFilter,
  type DeliveryEstimateFilter,
  type ProductAnswerListPage,
  type ProductCompanions,
  type ProductDeliveryEstimatePage,
  type ProductEngagement,
  type ProductQuestionListPage,
  type QuestionListFilter,
  type ReviewListFilter,
  type StoreProductDetail,
  type StoreReviewListPage,
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

/** Records that the product was shared. Not a link mint — the count is the whole effect. */
export function shareStoreProduct(
  productSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProductEngagement>> {
  const path = `/store/products/${encodeURIComponent(productSlug)}/share`;
  return sendJson(path, "POST", undefined, ProductEngagementSchema, options);
}
