// TRANSPORT: client-query — the creator's own analytics, read from a studio island.
//
// BOTH ROUTES LIVE UNDER `/users/me/*`, NOT `/videos/*`, and that is not a naming preference. The
// backend mounts its videos router at `/videos` before the others, so `GET /videos/:videoId`
// permanently shadows any two-segment `/videos/X`. `/users/me/video-reports` documents the same
// trap. Neither route takes a creator id — the server reads it from the session and from nowhere
// else, so there is nothing here to tamper with.
import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import { PaginationMetaSchema } from "@/lib/videos/schemas";
import {
  CreatorSummarySchema,
  VideoAnalyticsRowSchema,
  type CreatorSummary,
  type VideoAnalyticsRow,
} from "@/lib/videos/analytics.schemas";

/** `GET /users/me/creator-summary` — subscribers, published videos, total views. */
export function getCreatorSummary(
  options?: RequestOptions,
): Promise<ActionResponse<CreatorSummary>> {
  return getJson("/users/me/creator-summary", CreatorSummarySchema, options);
}

/**
 * `GET /users/me/video-analytics` — per-video counters, newest published first.
 *
 * NO `sort` PARAMETER, and do not add one: the backing table has a primary key and no secondary
 * index, so ordering by view count would sort after the join with nothing behind it. The query
 * schema is `.strict()`, so sending one is a 422 rather than a quietly ignored key.
 */
export function listVideoAnalytics(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: VideoAnalyticsRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/users/me/video-analytics${buildQueryString({ ...filter })}`,
    VideoAnalyticsRowSchema,
    PaginationMetaSchema,
    options,
  );
}
