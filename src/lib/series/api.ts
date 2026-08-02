// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. All `requireAuth`, all owner-scoped, every lookup failure a 404.
//
// NO RATE LIMITER ON THIS ROUTER AT ALL — unlike `/videos`, which carries three. Not a licence
// to loop: it means a runaway client here hits the database rather than a bucket.

import {
  buildQueryString,
  getJson,
  getPaginated,
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
