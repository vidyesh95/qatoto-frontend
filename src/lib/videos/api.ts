// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. The studio reads and writes from client islands; nothing here is public.
//
// EVERY ROUTE IS `requireAuth` AND OWNER-SCOPED, and every ownership failure is a **404, not a
// 403**, deliberately: a 403 confirms the row exists, which lets a stranger enumerate ids by
// watching status codes. The UI must therefore treat 404 as "not yours or not there" and say
// neither.
//
// NO IDEMPOTENCY KEYS ON THIS SURFACE. None of `/videos`, `/series` or `/playlists` runs the
// backend's `idempotency()` middleware — sending an `Idempotency-Key` header here does nothing.
// (`POST /videos/:videoId/comments` does, but that is the viewer-side engagement router.)

import {
  buildQueryString,
  getJson,
  getPaginated,
  sendForm,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedVideoSchema,
  DeletedSchema,
  PaginationMetaSchema,
  PublicVideoSchema,
  VideoListRowSchema,
  type CreatedVideo,
  type CreateVideoInput,
  type ListMyVideosFilter,
  type PublicVideo,
  type ReplaceChaptersInput,
  type UpdateVideoInput,
  type VideoListRow,
} from "@/lib/videos/schemas";

/**
 * `GET /videos/mine` — the My Videos list, newest-updated first.
 *
 * The query schema is `.strict()`, so only `page`, `limit`, `publishStatus` and `reviewStatus`
 * may be sent. Anything else is a 422, not an ignored param.
 */
export function listMyVideos(
  filter: ListMyVideosFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: VideoListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/videos/mine${buildQueryString({ ...filter })}`,
    VideoListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/** `GET /videos/:videoId` — the full owner payload. 404 when it is not yours. */
export function getMyVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return getJson(`/videos/${encodeURIComponent(videoId)}`, PublicVideoSchema, options);
}

/**
 * `POST /videos` — 201.
 *
 * THE ONLY VIDEO ROUTE THAT NESTS ITS RESULT: `{ video, suggestedTitle }`. Everything else
 * answers a bare `PublicVideo`.
 *
 * The row is created as a DRAFT with `isSourceVerified: false` and a background job confirms
 * the YouTube id. That is why an oEmbed outage no longer throws the creator's work away — but
 * publish stays refused until the flag flips.
 */
export function createVideo(
  input: CreateVideoInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedVideo>> {
  return sendJson("/videos", "POST", input, CreatedVideoSchema, options);
}

/**
 * `PATCH /videos/:videoId`.
 *
 * Send ONLY changed fields. The schema is `.strict()` and rejects every server-owned column, so
 * spreading a `PublicVideo` back in here is a guaranteed 422 — `id`, `derivedStatus`,
 * `categories`, `createdAt` and two dozen others are all read-only.
 */
export function updateVideo(
  videoId: string,
  input: UpdateVideoInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}`,
    "PATCH",
    input,
    PublicVideoSchema,
    options,
  );
}

/**
 * `POST /videos/:videoId/publish` — NO BODY.
 *
 * Four distinct refusals, and they are not interchangeable:
 *   422 `uploadStatus` — the video is still processing
 *   409 SOURCE_NOT_VERIFIED — YouTube confirmation is still in flight; RETRY LATER, this one
 *       resolves itself, which is exactly why it is a 409 and not a 422
 *   422 gating — a YouTube-hosted video cannot be `investor_only` or NDA-gated
 *   422 completeness — `errors.missing` names the fields
 *
 * An anime episode answers 200 with `reviewStatus: "pending"` and the message "Episode
 * submitted for review" — published is NOT what happened, and the UI must not say it is.
 */
export function publishVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/publish`,
    "POST",
    undefined,
    PublicVideoSchema,
    options,
  );
}

/** `POST /videos/:videoId/unpublish` — no body. */
export function unpublishVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/unpublish`,
    "POST",
    undefined,
    PublicVideoSchema,
    options,
  );
}

/** `PUT /videos/:videoId/chapters` — full replace. See `ReplaceChaptersInput` for the rules. */
export function replaceVideoChapters(
  videoId: string,
  input: ReplaceChaptersInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/chapters`,
    "PUT",
    input,
    PublicVideoSchema,
    options,
  );
}

/**
 * `PUT /videos/:videoId/playlists` — which playlists this video belongs to.
 *
 * Appends at the end of each playlist; it does NOT set ordering. Reordering is
 * `PUT /playlists/:id/videos`, which owns position.
 */
export function replaceVideoPlaylists(
  videoId: string,
  playlistIds: readonly string[],
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/playlists`,
    "PUT",
    { playlistIds },
    PublicVideoSchema,
    options,
  );
}

/**
 * `POST /videos/:videoId/thumbnail` — multipart, field name `image`.
 *
 * 5 MB cap, image mime types only; the server re-encodes to AVIF at max 1280px and refuses
 * anything under 64x64. Do NOT set Content-Type — the browser must add the multipart boundary.
 */
export function replaceVideoThumbnail(
  videoId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<PublicVideo>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  return sendForm(
    `/videos/${encodeURIComponent(videoId)}/thumbnail`,
    "POST",
    formData,
    PublicVideoSchema,
    options,
  );
}

/** `DELETE /videos/:videoId`. */
export function deleteVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: boolean }>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}`,
    "DELETE",
    undefined,
    DeletedSchema,
    options,
  );
}
