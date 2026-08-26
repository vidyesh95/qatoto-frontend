// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. All `requireAuth`, all owner-scoped, every lookup failure a 404.
//
// ONE RATE LIMITER ON THIS ROUTER — `seriesPosterUploadLimiter`, on the poster pair at the foot
// of this file. Every other route here is unlimited, unlike `/videos` which carries three. Not a
// licence to loop: it means a runaway client on those hits the database rather than a bucket.

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
  PublicSeriesSchema,
  SeriesListRowSchema,
  type CreateEpisodeInput,
  type CreateSeasonInput,
  type CreateSeriesInput,
  type ListMySeriesFilter,
  type PublicSeries,
  type SeriesListRow,
  type UpdateEpisodeInput,
  type UpdateSeasonInput,
  type UpdateSeriesInput,
} from "@/lib/series/schemas";
import { DeletedSchema, PaginationMetaSchema } from "@/lib/videos/schemas";

/** `GET /series/mine`. */
export function listMySeries(
  filter: ListMySeriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: SeriesListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/series/mine${buildQueryString({ ...filter })}`,
    SeriesListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/** `GET /series/:seriesId` — the whole tree, seasons and episodes included. */
export function getSeries(
  seriesId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return getJson(`/series/${encodeURIComponent(seriesId)}`, PublicSeriesSchema, options);
}

/** `POST /series` — 201. */
export function createSeries(
  input: CreateSeriesInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson("/series", "POST", input, PublicSeriesSchema, options);
}

export function updateSeries(
  seriesId: string,
  input: UpdateSeriesInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}`,
    "PATCH",
    input,
    PublicSeriesSchema,
    options,
  );
}

/** The ONE route on this surface that does not answer a tree — there is none left to answer. */
export function deleteSeries(
  seriesId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: boolean }>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}`,
    "DELETE",
    undefined,
    DeletedSchema,
    options,
  );
}

/* --- The poster ---------------------------------------------------------------------------- */

/**
 * `POST /series/:seriesId/poster` — multipart, field name `image`.
 *
 * 5 MB cap, image mime types only; the server re-encodes to AVIF at max 1080px (portrait, where
 * a video thumbnail is landscape at 1280) and refuses anything under 64x64. Do NOT set
 * Content-Type — the browser must add the multipart boundary.
 *
 * WHY IT EXISTS AT ALL. `posterUrl` has been a plain string on `PATCH /series/:id` since the
 * catalog shipped, which meant the only way to have a poster was to host the image somewhere
 * else and paste a link — a third-party URL on a public catalogue page, swappable or deletable
 * by someone who does not work here. That PATCH field stays, because series already carrying a
 * pasted URL would otherwise be stranded with no way to change it.
 */
export function replaceSeriesPoster(
  seriesId: string,
  imageFile: File,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  const formData = new FormData();
  formData.append("image", imageFile);
  return sendForm(
    `/series/${encodeURIComponent(seriesId)}/poster`,
    "POST",
    formData,
    PublicSeriesSchema,
    options,
  );
}

/**
 * `DELETE /series/:seriesId/poster` — takes the poster down and answers the refreshed series.
 *
 * NOT REPLACEABLE BY `updateSeries({ posterUrl: null })`. That field is a URL schema on the
 * backend, so there is no null it will accept; without this route a poster could be changed
 * forever and never removed.
 */
export function removeSeriesPoster(
  seriesId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/poster`,
    "DELETE",
    undefined,
    PublicSeriesSchema,
    options,
  );
}

/* --- Seasons: every one answers the refreshed series tree --------------------------------- */

/** 409 when the label already exists in this series. */
export function createSeason(
  seriesId: string,
  input: CreateSeasonInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons`,
    "POST",
    input,
    PublicSeriesSchema,
    options,
  );
}

export function updateSeason(
  seriesId: string,
  seasonId: string,
  input: UpdateSeasonInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(seasonId)}`,
    "PATCH",
    input,
    PublicSeriesSchema,
    options,
  );
}

export function deleteSeason(
  seriesId: string,
  seasonId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(seasonId)}`,
    "DELETE",
    undefined,
    PublicSeriesSchema,
    options,
  );
}

/* --- Episodes: same, all three answer the tree ------------------------------------------- */

/** 409 when that episode number already exists in the season. */
export function createEpisode(
  seriesId: string,
  seasonId: string,
  input: CreateEpisodeInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(seasonId)}/episodes`,
    "POST",
    input,
    PublicSeriesSchema,
    options,
  );
}

export function updateEpisode(
  seriesId: string,
  seasonId: string,
  episodeId: string,
  input: UpdateEpisodeInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(
      seasonId,
    )}/episodes/${encodeURIComponent(episodeId)}`,
    "PATCH",
    input,
    PublicSeriesSchema,
    options,
  );
}

export function deleteEpisode(
  seriesId: string,
  seasonId: string,
  episodeId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicSeries>> {
  return sendJson(
    `/series/${encodeURIComponent(seriesId)}/seasons/${encodeURIComponent(
      seasonId,
    )}/episodes/${encodeURIComponent(episodeId)}`,
    "DELETE",
    undefined,
    PublicSeriesSchema,
    options,
  );
}
