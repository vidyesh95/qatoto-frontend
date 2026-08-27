// TRANSPORT: client-query — review authoring is session-scoped and written from client islands.
//
// THE BUYER'S HALF OF TRUST, and every route below shipped on the backend long before this file
// existed. The consequence was not a missing feature so much as a misleading one: the product page's
// Reviews tab renders "Reviews can only be left by a buyer whose order completed", which read as a
// gate and was actually a description of a surface nobody could reach.
//
// EVERY WRITE HERE REQUIRES AN `Idempotency-Key`, minted once per attempt by the caller. The reasons
// differ per route and are stated on each — a retried review is a duplicate on a unique index, while
// a retried photo is a second copy occupying one of six slots.

import {
  buildQueryString,
  getJson,
  sendForm,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import { StoreReviewListPageSchema, type StoreReviewListPage } from "@/lib/store/products.schemas";
import {
  AuthoredReviewMediaSchema,
  AuthoredReviewSchema,
  BuyerCompletionPageSchema,
  DetachedReviewMediaSchema,
  OwnReviewDetailSchema,
  ReviewHelpfulVoteSchema,
  ReviewReplySchema,
  WithdrawnReviewReplySchema,
  type AttachReviewVideoInput,
  type AuthoredReview,
  type AuthoredReviewMedia,
  type BuyerCompletion,
  type CreateReviewInput,
  type DetachedReviewMedia,
  type EditOwnReviewInput,
  type ListBuyerCompletionsFilter,
  type OwnReviewDetail,
  type ReviewHelpfulVote,
  type ReviewReply,
  type UpsertReviewReplyInput,
  type SellerReviewInboxFilter,
  type WithdrawnReviewReply,
} from "@/lib/store/reviews.schemas";

/**
 * The completions this buyer organization could review — `GET /commerce/completions`.
 *
 * THE READ THAT MAKES REVIEWING POSSIBLE AT ALL. `POST /commerce/completions/:completionId/reviews`
 * had shipped since Phase 7 and `completionId` was projected on nothing, so the id the route demands
 * was unobtainable and ratings, photos and videos were reachable only by guessing a UUID.
 *
 * `reviewable` FILTERS IN SQL, never over a fetched page. A post-filter returns short pages and a
 * cursor computed from rows that were then dropped, so the next page starts past rows the caller
 * never saw — the pagination bug that presents as missing data.
 */
export async function listBuyerCompletions(
  filter: ListBuyerCompletionsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: BuyerCompletion[]; nextCursor: string | null }>> {
  const query = new URLSearchParams();
  if (filter.reviewable !== undefined) query.set("reviewable", String(filter.reviewable));
  if (filter.limit !== undefined) query.set("limit", String(filter.limit));
  if (filter.cursor !== undefined) query.set("cursor", filter.cursor);
  const queryString = query.toString();
  const path = `/commerce/completions${queryString === "" ? "" : `?${queryString}`}`;

  const parsed = await getJson(path, BuyerCompletionPageSchema, options);
  if (!parsed.success) return parsed;
  return {
    success: true,
    data: { rows: [...parsed.data.items], nextCursor: parsed.data.page.nextCursor },
  };
}

/**
 * Reads back one review the caller wrote, with its media — `GET /commerce/reviews/:reviewId` (A38).
 *
 * THE ONLY AUTHOR-FACING REVIEW READ. It is what lets a buyer return to a published review and
 * manage its attachments instead of only doing so in the session that created them.
 *
 * ITS MEDIA CARRIES `state`, unlike the product page's read, which filters `unavailable_upstream`
 * rows out and projects no state at all. So this is the one place "your video is gone from YouTube"
 * can be said to the one person who can fix it.
 *
 * A review the caller did not write answers 404, never 403 — the route cannot enumerate ids.
 */
export function getOwnReview(
  reviewId: string,
  options?: RequestOptions,
): Promise<ActionResponse<OwnReviewDetail>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}`;
  return getJson(path, OwnReviewDetailSchema, options);
}

/**
 * Writes the review — `POST /commerce/completions/:completionId/reviews`.
 *
 * ONE REVIEW PER COMPLETION PER ORGANIZATION, on a unique index with no partial predicate — so a
 * moderator-hidden review still occupies the slot, and a retry without an idempotency key is a
 * refusal rather than a duplicate. Mint the key once per attempt.
 *
 * `scores` IS OPTIONAL AND MUST NOT BE EMPTY. At least one axis, or omit the key. And `shipping` on
 * a service engagement is a 422 `UNSUPPORTED_SCORE_AXIS` — nothing shipped, so the axis is a
 * category error rather than a low score.
 *
 * It answers the AUTHOR-facing projection, which keeps `completionId` and carries `visibility`.
 */
export function createReview(
  completionId: string,
  input: CreateReviewInput,
  options?: RequestOptions,
): Promise<ActionResponse<AuthoredReview>> {
  const path = `/commerce/completions/${encodeURIComponent(completionId)}/reviews`;
  return sendJson(path, "POST", input, AuthoredReviewSchema, options);
}

/**
 * The one edit an author gets, within 30 days — `PATCH /commerce/reviews/:reviewId`.
 *
 * BOTH FIELDS ARE REQUIRED, and that is a deliberate refusal of a partial patch: there is exactly one
 * edit, so a caller sending only `body` would spend it and silently keep a rating they may have meant
 * to change.
 *
 * IT SETS `editedAt`, WHICH IS PUBLIC. A rewritten review that does not say it was rewritten is the
 * manipulation, not the edit — so the UI should say this before the press, not after.
 */
export function editOwnReview(
  reviewId: string,
  input: EditOwnReviewInput,
  options?: RequestOptions,
): Promise<ActionResponse<AuthoredReview>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}`;
  return sendJson(path, "PATCH", input, AuthoredReviewSchema, options);
}

/**
 * Attaches one photo — `POST /commerce/reviews/:reviewId/media`, multipart.
 *
 * NO TEXT FIELDS AT ALL. The multipart body schema is `z.object({}).strict()`, so sending a
 * `position` is a 422: media is appended at the current count and the gallery is re-packed to
 * `0..n-1` on removal, and a client-chosen position collides with a unique index on any concurrent
 * attach.
 *
 * SIX PER REVIEW, enforced by the service and by two CHECK constraints. 5 MB, surfaced as a 413.
 *
 * The idempotency key matters more here than on a JSON write: a retried upload that the server
 * already stored spends one of six slots on a duplicate the author then has to find and remove.
 */
export function attachReviewPhoto(
  reviewId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<AuthoredReviewMedia>> {
  const formData = new FormData();
  // The field name is `image`, matching the shared `uploadProductImage` middleware this route reuses
  // verbatim — it is product-specific in nothing but its filename.
  formData.append("image", imageFile);
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/media`;
  return sendForm(path, "POST", formData, AuthoredReviewMediaSchema, options);
}

/**
 * Attaches one YouTube link — `POST /commerce/reviews/:reviewId/videos`.
 *
 * A LINK, NOT AN UPLOAD. This codebase has no first-party video ingest, and the id is extracted
 * server-side by `extractYoutubeVideoId` rather than accepted as a bare id from the client.
 *
 * A VIDEO CAN LATER GO `unavailable_upstream` — the revalidation job moves that state when the video
 * dies on YouTube. Only a video; a photo is a first-party asset.
 */
export function attachReviewVideo(
  reviewId: string,
  input: AttachReviewVideoInput,
  options?: RequestOptions,
): Promise<ActionResponse<AuthoredReviewMedia>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/videos`;
  return sendJson(path, "POST", input, AuthoredReviewMediaSchema, options);
}

/**
 * Removes one attachment — `DELETE /commerce/reviews/:reviewId/media/:mediaId`.
 *
 * IT ANSWERS THE SURVIVING COUNT, not the removed row, and the gallery is re-packed to `0..n-1`
 * server-side. So the caller re-reads rather than splicing its own copy — positions it held are
 * stale the moment this returns.
 */
export function detachReviewMedia(
  reviewId: string,
  mediaId: string,
  options?: RequestOptions,
): Promise<ActionResponse<DetachedReviewMedia>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/media/${encodeURIComponent(mediaId)}`;
  return sendJson(path, "DELETE", undefined, DetachedReviewMediaSchema, options);
}

/**
 * Marks a review helpful — `PUT /commerce/reviews/:reviewId/helpful` (A8).
 *
 * **NO IDEMPOTENCY KEY, and that is deliberate rather than an oversight.** PUT of a boolean is
 * idempotent by verb: the insert is `ON CONFLICT DO NOTHING` and the counter moves only when a row
 * actually appeared, so a double-tap cannot double-count. The like, save and subscribe routes
 * document the same rule.
 *
 * **NEITHER PARTY TO A REVIEW MAY VOTE ON IT** — not the author, not the organization being
 * reviewed. Both are refused with `403 SELF_VOTE_FORBIDDEN` in the service and again by
 * `commerce_review_vote_relationship_guard` in the database. Any other active trading organization
 * may vote, whatever its member's role.
 *
 * A hidden review is a 404, so the control disappears for a moderated row rather than erroring.
 */
export function markReviewHelpful(
  reviewId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ReviewHelpfulVote>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/helpful`;
  return sendJson(path, "PUT", undefined, ReviewHelpfulVoteSchema, options);
}

/** Withdraws a helpful vote. Answers the same shape with `isHelpful: false`. */
export function clearReviewHelpfulVote(
  reviewId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ReviewHelpfulVote>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/helpful`;
  return sendJson(path, "DELETE", undefined, ReviewHelpfulVoteSchema, options);
}

/**
 * Writes or revises the seller's reply — `PUT /commerce/reviews/:reviewId/reply` (A38).
 *
 * WRITTEN BY THE ORGANIZATION THE REVIEW IS ABOUT. Anyone else gets a 404, never a 403, so the route
 * cannot be used to discover review ids.
 *
 * **IT IS NOT A FREE-FORM UPSERT, and a UI that assumes otherwise just collects 409s.** A FIRST
 * reply is always allowed however old the review — answering late is fine. REVISING is bounded
 * twice: once only, and within 30 days of the REPLY's own creation. Both refusals are 409s carrying
 * the server's own sentence, and since `editedAt` is not projected the client cannot pre-empt them —
 * render what the server says.
 *
 * Requires an `Idempotency-Key`, unlike the helpful vote: this one carries a body, so a retry with a
 * different body is a genuinely different request.
 */
export function upsertReviewReply(
  reviewId: string,
  input: UpsertReviewReplyInput,
  options?: RequestOptions,
): Promise<ActionResponse<ReviewReply>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/reply`;
  return sendJson(path, "PUT", input, ReviewReplySchema, options);
}

/**
 * Withdraws the reply — `DELETE /commerce/reviews/:reviewId/reply`.
 *
 * Same 30-day bound from the reply's creation. Withdrawing a reply that does not exist is NOT an
 * error, so the control is safe to leave enabled rather than gated on a local guess.
 */
export function withdrawReviewReply(
  reviewId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WithdrawnReviewReply>> {
  const path = `/commerce/reviews/${encodeURIComponent(reviewId)}/reply`;
  return sendJson(path, "DELETE", undefined, WithdrawnReviewReplySchema, options);
}

/**
 * Reviews written ABOUT the caller's organization — `GET /commerce/seller/reviews` (A38).
 *
 * IT REUSES THE PUBLIC PAGE SHAPE EXACTLY. The backend answers `StoreReviewListPage` — the same
 * `{ summary, items, page }` the product page reads — so there is no seller-specific projection
 * here, and none is wanted.
 *
 * THREE THINGS THAT LOOK LIKE BUGS AND ARE NOT:
 *
 *  1. **`viewer.hasVotedHelpful` is permanently `false`.** The caller is the subject of every row,
 *     and a party to a review may never vote on it. Do not render a working vote control here.
 *  2. **`reviewer` is `null` for any buyer whose organization is not publicly visible.** A seller
 *     gets no privileged identity in their own inbox; the row reads "Verified buyer", exactly as on
 *     the product page.
 *  3. **`respondedAt` on a reply is its `updatedAt`**, so a revised reply shows the revision time
 *     rather than when it was first posted.
 *
 * `summary` is computed over every visible review of the organization, never over the filtered page,
 * so the counts do not renumber as filters are clicked.
 */
export function listSellerReviewInbox(
  filter: SellerReviewInboxFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<StoreReviewListPage>> {
  const path = `/commerce/seller/reviews${buildQueryString({ ...filter })}`;
  return getJson(path, StoreReviewListPageSchema, options);
}
