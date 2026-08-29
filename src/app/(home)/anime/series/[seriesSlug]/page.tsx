import type { Metadata } from "next";

import AnimeSeriesDetailPage from "@/components/home/anime/series-detail-page";
import { getPublicAnimeSeries, listPublicAnimeSeriesSlugs } from "@/lib/anime/series.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender every public slug — a dynamic route needs this under `cacheComponents`.
 *
 * `withSentinelValues` because an EMPTY array throws `EmptyGenerateStaticParamsError`, and a
 * catalogue with no published series yet is an ordinary state rather than a build failure.
 * A failed read returns `[]` for the same reason: an unreachable backend must not fail the
 * build, and those params then render on demand.
 *
 * The sentinel is safe here precisely because this page resolves its own record and calls
 * `notFound()` on a 404 — `"__none__"` is a slug the backend can never mint (the column's
 * CHECK forbids the underscores), so it takes the same path a typo does.
 */
export async function generateStaticParams() {
  const seriesSlugs = await listPublicAnimeSeriesSlugs();
  return withSentinelValues(seriesSlugs).map((seriesSlug) => ({ seriesSlug }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ seriesSlug: string }>;
}): Promise<Metadata> {
  const { seriesSlug } = await params;
  const seriesResult = await getPublicAnimeSeries(seriesSlug);
  if (!seriesResult.success) return { title: "Anime" };

  return {
    title: `${seriesResult.data.title} · Anime`,
    // The description is the show's own synopsis when it has one. No fallback sentence is
    // invented for a series whose description is null — an absent field stays absent rather
    // than becoming boilerplate every search result would repeat.
    ...(seriesResult.data.description === null
      ? {}
      : { description: seriesResult.data.description }),
    alternates: { canonical: `/anime/series/${seriesSlug}` },
  };
}

export default async function AnimeSeriesRoute({
  params,
}: {
  params: Promise<{ seriesSlug: string }>;
}) {
  const { seriesSlug } = await params;
  return <AnimeSeriesDetailPage seriesSlug={seriesSlug} />;
}
