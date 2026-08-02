// TRANSPORT: props-only — pure contract for `/series` (anime series, seasons, episodes).
//
// EVERY MUTATION ON THIS SURFACE RETURNS THE WHOLE `PublicSeries` TREE, not the thing you just
// changed. Creating a season answers the series; editing an episode answers the series. The one
// exception is deleting a SERIES, which answers `{ deleted: true }` because there is no tree
// left to return.
//
// That is a gift to the client: there is no cache-patching to get wrong, and no possibility of
// a season list disagreeing with the episode list under it. Take the tree and replace.

import { z } from "zod";

export const ANIME_SERIES_STATUSES = ["ongoing", "completed", "hiatus"] as const;
export const ANIME_AUDIO_MODES = ["subbed", "dubbed"] as const;

export const AnimeSeriesStatusSchema = z.enum(ANIME_SERIES_STATUSES);
export type AnimeSeriesStatus = z.infer<typeof AnimeSeriesStatusSchema>;

/**
 * One episode inside the tree.
 *
 * `videoId` IS NULLABLE, and that is the whole point of the model: a season can be planned out
 * before any of its episodes has a video. An episode with a null `videoId` is scheduled, not
 * broken.
 *
 * `releaseScheduleDay` and `releaseScheduleTime` are WRITABLE but absent from this read — the
 * backend accepts them on create/update and does not return them. Do not add them speculatively;
 * `.strip()` would leave them undefined and the UI would render a blank where it expects a day.
 */
export const AnimeEpisodeSummarySchema = z
  .object({
    id: z.string(),
    videoId: z.string().nullable(),
    episodeNumber: z.number(),
    episodeTitle: z.string(),
    isPremium: z.boolean(),
    premiereDate: z.string().nullable(),
    audioMode: z.enum(ANIME_AUDIO_MODES).nullable(),
    audioLanguage: z.string().nullable(),
    ageRating: z.string().nullable(),
    releasedAt: z.string().nullable(),
  })
  .strip();
export type AnimeEpisodeSummary = z.infer<typeof AnimeEpisodeSummarySchema>;

export const AnimeSeasonSummarySchema = z
  .object({
    id: z.string(),
    seasonLabel: z.string(),
    position: z.number(),
    episodes: z.array(AnimeEpisodeSummarySchema),
  })
  .strip();
export type AnimeSeasonSummary = z.infer<typeof AnimeSeasonSummarySchema>;

export const PublicSeriesSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    posterUrl: z.string().nullable(),
    genreTags: z.array(z.string()),
    status: AnimeSeriesStatusSchema,
    seasons: z.array(AnimeSeasonSummarySchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type PublicSeries = z.infer<typeof PublicSeriesSchema>;

/** `GET /series/mine`. Narrower than the tree on purpose — no seasons, no episodes. */
export const SeriesListRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    posterUrl: z.string().nullable(),
    status: AnimeSeriesStatusSchema,
    genreTags: z.array(z.string()),
    seasonCount: z.number(),
    episodeCount: z.number(),
    updatedAt: z.string(),
  })
  .strip();
export type SeriesListRow = z.infer<typeof SeriesListRowSchema>;

/** `GET /series/mine` takes page and limit and NOTHING else — its schema is `.strict()`. */
export interface ListMySeriesFilter {
  readonly page?: number;
  readonly limit?: number;
}

/** `POST /series`. Only `title` is required; `status` defaults to `ongoing`. */
export interface CreateSeriesInput {
  readonly title: string;
  readonly description?: string;
  readonly posterUrl?: string;
  readonly genreTags?: string[];
  readonly status?: AnimeSeriesStatus;
}

export type UpdateSeriesInput = Partial<CreateSeriesInput>;

/** `POST /series/:seriesId/seasons`. A duplicate label in one series is a 409, not a 422. */
export interface CreateSeasonInput {
  readonly seasonLabel: string;
  readonly position?: number;
}

export type UpdateSeasonInput = Partial<CreateSeasonInput>;

/**
 * `POST /series/:seriesId/seasons/:seasonId/episodes`.
 *
 * NO `videoId` FIELD, deliberately. An episode is linked to a video from the VIDEO side — by
 * creating the video with an `anime` block naming this series and season — not by pointing an
 * episode at a video id. One direction, so the link cannot end up half-made.
 *
 * A duplicate `episodeNumber` in one season is a 409.
 */
export interface CreateEpisodeInput {
  readonly episodeNumber: number;
  readonly episodeTitle: string;
  readonly isPremium?: boolean;
  readonly releaseScheduleDay?: string;
  readonly releaseScheduleTime?: string;
  readonly premiereDate?: string;
  readonly audioMode?: (typeof ANIME_AUDIO_MODES)[number];
  readonly audioLanguage?: string;
  readonly ageRating?: string;
}

export type UpdateEpisodeInput = Partial<CreateEpisodeInput>;
