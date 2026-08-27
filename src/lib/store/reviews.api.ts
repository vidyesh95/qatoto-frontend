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

import { getJson, sendForm, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  AuthoredReviewMediaSchema,
  AuthoredReviewSchema,
  BuyerCompletionPageSchema,
  DetachedReviewMediaSchema,
  type AttachReviewVideoInput,
  type AuthoredReview,
  type AuthoredReviewMedia,
  type BuyerCompletion,
  type CreateReviewInput,
  type DetachedReviewMedia,
  type EditOwnReviewInput,
  type ListBuyerCompletionsFilter,
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
