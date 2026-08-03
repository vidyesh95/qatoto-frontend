// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The homepage and watch page read server-side with the caller's cookie
// forwarded by `callerRequestOptions()`; the chip row, Explore rail and every engagement
// control read and write from client islands.
//
// EVERY READ HERE IS OPTIONAL-AUTH AND NONE OF THEM 401s. The feed answers an anonymous
// viewer with a popularity-ranked page and `viewerState` flags all `false` — the ONE exception
// is `?mode=watched`, which is 401 when signed out, because serving it off a rotating
// fingerprint would hand one person's history to everyone behind the same NAT.
//
// EVERY WRITE except the two beacons requires a FULL account. `requireIdentifiedUser` answers
// 403, not 401, to better-auth's anonymous sessions — those callers have a cookie and a
// userId, so a 401-only check sails straight past them. Branch with `isForbidden`.

import { z } from "zod";

import {
  buildQueryString,
  getCursorSiblingList,
  getEnvelope,
  getJson,
  getPaginated,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  AcknowledgedSchema,
  ContentCategorySchema,
  DeletedVideoCommentSchema,
  FeedVideoPageSchema,
  FeedVideoSchema,
  PaginationMetaSchema,
  LikeToggleResultSchema,
  SaveToggleResultSchema,
  ShareResultSchema,
  SubscribeToggleResultSchema,
  UpdatedVideoCommentSchema,
  VideoCommentSchema,
  WatchPayloadSchema,
  type ContentCategory,
  type FeedSource,
  type FeedVideoPage,
  type LikeToggleResult,
  type ListFeedVideosFilter,
  type PlaybackErrorCode,
  type SaveToggleResult,
  type SearchVideoPage,
  type SearchVideosFilter,
  type ShareChannel,
  type ShareResult,
  type SubscribeToggleResult,
  type UpdatedVideoComment,
  type VideoComment,
  type WatchPayload,
} from "@/lib/feed/schemas";

const ContentCategoryListSchema = z.array(ContentCategorySchema);

/* -------------------------------------------------------------------------- */
/* Reads                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * `GET /feed/categories` — PUBLIC, no session, no rate limiter.
 *
 * Powers the chip row and the "What's on your mind?" tiles from one call. The backend
 * deliberately carries no limiter on this route: it is a small viewer-independent list, and an
 * IP-keyed bucket on the front page's data source is a self-inflicted outage the first time
 * real traffic arrives from behind a corporate NAT.
 */
export function listFeedCategories(
  options?: RequestOptions,
): Promise<ActionResponse<ContentCategory[]>> {
  return getJson("/feed/categories", ContentCategoryListSchema, options);
}

/**
 * `GET /feed/videos` — one ranked page, plus `pagination` and `rankSeed`.
 *
 * NOT `getPaginated`. That helper reads `data` and `pagination` and discards every other
 * top-level key, and `rankSeed` is a third sibling of both. Dropping it would mint a fresh
 * seed on page 2, reshuffling the exploration term and serving a video the viewer already
 * scrolled past. `getEnvelope` parses the whole body instead.
 *
 * Recommended, Explore and Spotlight are all THIS route: Spotlight is `mode: "trending",
 * limit: 3`, and the Recommended/Explore split is ours (`slice-feed-page.ts`).
 *
 * Pagination is OFFSET, not keyset — a cursor needs a stable sort key and rank is recomputed
 * per request, so a keyset over it would silently reshuffle. Offset plus a pinned seed gives
 * stability for the length of a session, which is the actual requirement.
 */
export function listFeedVideos(
  filter: ListFeedVideosFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<FeedVideoPage>> {
  return getEnvelope(
    `/feed/videos${buildQueryString({ ...filter })}`,
    FeedVideoPageSchema,
    options,
  );
}

/**
 * `GET /feed/search` — relevance search over the public catalogue.
 *
 * `getPaginated`, NOT `getEnvelope`. The feed route needs the whole envelope because
 * `rankSeed` is a third top-level sibling; this route has no seed to preserve, so the
 * ordinary two-key paginated read is exactly right.
 *
 * NEVER CALL THIS WITH AN EMPTY `query`. The backend trims and requires at least one
 * character, so a blank box that calls anyway turns into a 422 error panel where the correct
 * UI is a prompt to type something.
 */
export async function searchVideos(
  filter: SearchVideosFilter,
  options?: RequestOptions,
): Promise<ActionResponse<SearchVideoPage>> {
  const result = await getPaginated(
    `/feed/search${buildQueryString({ ...filter })}`,
    FeedVideoSchema,
    PaginationMetaSchema,
    options,
  );
  if (!result.success) return result;

  return { success: true, data: { data: result.data.rows, pagination: result.data.pagination } };
}

/**
 * `GET /feed/watch/:videoId` — the public watch payload.
 *
 * `videoId` must be a UUID: the backend's param schema is `z.uuid().strict()` and answers 422
 * before it touches the database. It also answers 404 rather than 403 for a video that exists
 * but is not public, so ids cannot be probed.
 *
 * This route does NOT record a view. Arrival is counted by the beacon, and only once the
 * viewer has actually watched — a view is not a watch (HOME_BACKEND §0 Rule 4).
 */
export function getWatchPayload(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<WatchPayload>> {
  return getJson(`/feed/watch/${encodeURIComponent(videoId)}`, WatchPayloadSchema, options);
}

export interface ListVideoCommentsFilter {
  readonly limit?: number;
  readonly cursor?: string;
  readonly parentCommentId?: string;
}

/**
 * `GET /videos/:videoId/comments` — KEYSET, unlike the feed.
 *
 * `nextCursor` is a top-level sibling of a bare `data` array, which is exactly what
 * `getCursorSiblingList` reads. The cursor is opaque and server-issued; never construct or
 * compare one.
 *
 * Omit `parentCommentId` for the top-level thread (newest first); pass one for that comment's
 * replies (oldest first). There is NO `sort` parameter — the backend fixes both orders, so a
 * client-side sort control would be a lie unless it re-sorted only the rows already fetched.
 *
 * Comments turned off answers `200` with an empty page, NOT a 409. Render "comments are off",
 * not an error.
 */
export function listVideoComments(
  videoId: string,
  filter: ListVideoCommentsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: VideoComment[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/videos/${encodeURIComponent(videoId)}/comments${buildQueryString({ ...filter })}`,
    VideoCommentSchema,
    options,
  );
}

/* -------------------------------------------------------------------------- */
/* Writes — beacons (optional auth, 202, no body in the response)              */
/* -------------------------------------------------------------------------- */

export interface ViewBeaconInput {
  readonly positionSeconds: number;
  readonly reportedDurationSeconds: number;
  readonly feedSource: FeedSource;
}

/**
 * `POST /videos/:videoId/view-beacon` — the only unauthenticated write on the platform.
 *
 * THIS IS A CLAIM, NOT A MEASUREMENT. The server clamps the reported position against
 * wall-clock elapsed, floors the delta at zero so seeking backwards adds nothing, and pins the
 * duration on the first beacon so a later one cannot shrink the denominator. Nothing sent from
 * here needs to be trusted and nothing here should be written as though it is.
 *
 * Answers **202 with no `data` key at all** — deliberately, because returning the clamped watch
 * time would hand an attacker an oracle for the clamp. Hence `AcknowledgedSchema`.
 */
export function recordViewBeacon(
  videoId: string,
  input: ViewBeaconInput,
  options?: RequestOptions,
): Promise<ActionResponse<undefined>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/view-beacon`,
    "POST",
    input,
    AcknowledgedSchema,
    options,
  );
}

/**
 * `POST /videos/:videoId/playback-error` — the fast path for a dead player.
 *
 * A creator can disable embedding on youtube.com at any moment and Qatoto finds out only by
 * asking. At >= 3 DISTINCT fingerprints the backend flips the row to `failed` and it drops out
 * of the candidate pool immediately, instead of waiting up to 24h for the nightly re-check.
 * Three reporters, because one client's error report is one client's claim.
 *
 * `errorCode` is a closed set — the caller must narrow before calling, since an unlisted code
 * is a 422 rather than an ignored field.
 */
export function reportPlaybackError(
  videoId: string,
  errorCode: PlaybackErrorCode,
  options?: RequestOptions,
): Promise<ActionResponse<undefined>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/playback-error`,
    "POST",
    { errorCode },
    AcknowledgedSchema,
    options,
  );
}

/* -------------------------------------------------------------------------- */
/* Writes — engagement toggles                                                  */
/* -------------------------------------------------------------------------- */

/*
 * THE FOUR TOGGLES ARE `PUT`/`DELETE`, NOT `POST`/`DELETE`.
 *
 * Each has a per-user unique key in the database, so both verbs are idempotent by
 * construction: a double-tap on a slow connection is harmless rather than a second like. They
 * carry no body, and therefore no idempotency key — the uniqueness constraint IS the
 * idempotency. Only comment create needs a key, because a comment has no natural unique key.
 */

/** `PUT /videos/:videoId/like`. Requires a full account (403 for anonymous sessions). */
export function likeVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<LikeToggleResult>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/like`,
    "PUT",
    undefined,
    LikeToggleResultSchema,
    options,
  );
}

/** `DELETE /videos/:videoId/like`. */
export function unlikeVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<LikeToggleResult>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/like`,
    "DELETE",
    undefined,
    LikeToggleResultSchema,
    options,
  );
}

/** `PUT /videos/:videoId/save` — watch-later. */
export function saveVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SaveToggleResult>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/save`,
    "PUT",
    undefined,
    SaveToggleResultSchema,
    options,
  );
}

/** `DELETE /videos/:videoId/save`. */
export function unsaveVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SaveToggleResult>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/save`,
    "DELETE",
    undefined,
    SaveToggleResultSchema,
    options,
  );
}

/**
 * `POST /videos/:videoId/share` — optional auth.
 *
 * Always writes a row, but moves `videoStats.shareCount` only for a signed-in sharer: share
 * count feeds the quality score's engagement rate, and anonymous traffic must not move a
 * ranking input. So the returned `shareCount` can come back unchanged, and the UI must render
 * what the server says rather than incrementing locally.
 */
export function recordVideoShare(
  videoId: string,
  channel: ShareChannel,
  options?: RequestOptions,
): Promise<ActionResponse<ShareResult>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/share`,
    "POST",
    { channel },
    ShareResultSchema,
    options,
  );
}

/**
 * `PUT /creators/:creatorId/subscribe`.
 *
 * `creatorId` is NOT a UUID — better-auth mints its own id format, so the backend validates it
 * as a bounded string. Subscribing to yourself is a 403.
 */
export function subscribeToCreator(
  creatorId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SubscribeToggleResult>> {
  return sendJson(
    `/creators/${encodeURIComponent(creatorId)}/subscribe`,
    "PUT",
    undefined,
    SubscribeToggleResultSchema,
    options,
  );
}

/** `DELETE /creators/:creatorId/subscribe`. */
export function unsubscribeFromCreator(
  creatorId: string,
  options?: RequestOptions,
): Promise<ActionResponse<SubscribeToggleResult>> {
  return sendJson(
    `/creators/${encodeURIComponent(creatorId)}/subscribe`,
    "DELETE",
    undefined,
    SubscribeToggleResultSchema,
    options,
  );
}

/* -------------------------------------------------------------------------- */
/* Writes — comments                                                            */
/* -------------------------------------------------------------------------- */

export interface CreateVideoCommentInput {
  readonly body: string;
  readonly parentCommentId?: string;
  /**
   * Minted once per attempt in component state and resent unchanged on every retry of that
   * attempt. A key regenerated inside the retry defeats the mechanism entirely.
   */
  readonly idempotencyKey: string;
}

/**
 * `POST /videos/:videoId/comments` — 201, returns the whole comment.
 *
 * THE IDEMPOTENCY KEY GOES IN A HEADER HERE, NOT THE BODY. This route runs through the
 * backend's `idempotency()` middleware, which reads the `Idempotency-Key` HTTP header and
 * requires 8..200 characters — a UUID is 36 and satisfies it. The R&D write surface sends
 * `idempotencyKey` as a body FIELD instead, because those routes do not use that middleware.
 * The body schema here is `.strict()`, so putting the key in the body is a hard 422.
 *
 * A replayed request answers the byte-identical original body with an `Idempotency-Replayed`
 * response header. Reusing one key for a DIFFERENT body is a 409, which is a finding — the
 * caller sent two different comments under one attempt — not something to retry.
 *
 * Only one level of threading exists: replying to a reply is a 409.
 */
export function createVideoComment(
  videoId: string,
  input: CreateVideoCommentInput,
  options?: RequestOptions,
): Promise<ActionResponse<VideoComment>> {
  const { idempotencyKey, ...body } = input;
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/comments`,
    "POST",
    body,
    VideoCommentSchema,
    { ...options, headers: { ...options?.headers, "Idempotency-Key": idempotencyKey } },
  );
}

/** `PATCH /comments/:commentId` — author only. Answers a partial, not a whole comment. */
export function updateVideoComment(
  commentId: string,
  body: string,
  options?: RequestOptions,
): Promise<ActionResponse<UpdatedVideoComment>> {
  return sendJson(
    `/comments/${encodeURIComponent(commentId)}`,
    "PATCH",
    { body },
    UpdatedVideoCommentSchema,
    options,
  );
}

/**
 * `DELETE /comments/:commentId` — author or the video's creator.
 *
 * A TOMBSTONE, NOT A ROW DELETE. Deleting a parent outright would orphan its replies, so the
 * row survives with `body: null`, `author: null` and `isDeleted: true`. The UI must render
 * that state rather than dropping the node, or the replies lose their anchor.
 */
export function deleteVideoComment(
  commentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ commentId: string }>> {
  return sendJson(
    `/comments/${encodeURIComponent(commentId)}`,
    "DELETE",
    undefined,
    DeletedVideoCommentSchema,
    options,
  );
}

/** `PUT /comments/:commentId/like`. */
export function likeVideoComment(
  commentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<LikeToggleResult>> {
  return sendJson(
    `/comments/${encodeURIComponent(commentId)}/like`,
    "PUT",
    undefined,
    LikeToggleResultSchema,
    options,
  );
}

/** `DELETE /comments/:commentId/like`. */
export function unlikeVideoComment(
  commentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<LikeToggleResult>> {
  return sendJson(
    `/comments/${encodeURIComponent(commentId)}/like`,
    "DELETE",
    undefined,
    LikeToggleResultSchema,
    options,
  );
}
