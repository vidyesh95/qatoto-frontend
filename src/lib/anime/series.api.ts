// TRANSPORT: server-fetch — both routes are PUBLIC, so no session is forwarded and nothing
// here needs a client island. The detail page and `generateStaticParams` are the callers.

import {
  PublicAnimeSeriesCardSchema,
  PublicAnimeSeriesDetailSchema,
  type ListPublicAnimeSeriesFilter,
  type PublicAnimeSeriesCard,
  type PublicAnimeSeriesDetail,
} from "@/lib/anime/schemas";
import {
  buildQueryString,
  getJson,
  getPaginated,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import { PaginationMetaSchema } from "@/lib/videos/schemas";

/**
 * `GET /anime/series` — PUBLIC. Every series with at least one watchable episode.
 *
 * A series with nothing published is not in this list, because publicness on this surface is
 * derived bottom-up from the videos rather than from a flag somebody set.
 */
export function listPublicAnimeSeries(
  filter: ListPublicAnimeSeriesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: PublicAnimeSeriesCard[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/anime/series${buildQueryString({ ...filter })}`,
    PublicAnimeSeriesCardSchema,
    PaginationMetaSchema,
    options,
  );
}

/**
 * `GET /anime/series/:seriesSlug` — PUBLIC. The detail tree.
 *
 * ONE 404 COVERS EVERYTHING on the backend: a series that does not exist, one still in
 * review, and one nobody has attached a video to all answer the same bytes. The caller
 * renders `notFound()` for any failure rather than trying to tell them apart.
 */
export function getPublicAnimeSeries(
  seriesSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicAnimeSeriesDetail>> {
  return getJson(
    `/anime/series/${encodeURIComponent(seriesSlug)}`,
    PublicAnimeSeriesDetailSchema,
    options,
  );
}

/**
 * Every public series slug, for `generateStaticParams` and the sitemap.
 *
 * WALKS TO EXHAUSTION, one page at a time. `cacheComponents` refuses an EMPTY
 * `generateStaticParams`, so the caller wraps this in `withSentinelValues`; a FAILED read
 * returns `[]` for the separate reason that an unreachable backend must not fail the build.
 * Both of those are the caller's job — this returns what it could read.
 */
export async function listPublicAnimeSeriesSlugs(options?: RequestOptions): Promise<string[]> {
  const PAGE_SIZE = 50;
  const slugs: string[] = [];

  for (let page = 1; ; page += 1) {
    const result = await listPublicAnimeSeries({ page, limit: PAGE_SIZE }, options);
    if (!result.success) return slugs;

    slugs.push(...result.data.rows.map((series) => series.seriesSlug));
    if (page >= result.data.pagination.totalPages || result.data.rows.length === 0) return slugs;
  }
}
