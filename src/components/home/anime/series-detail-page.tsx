// TRANSPORT: server-fetch — async server component. Reads `GET /anime/series/:seriesSlug` via
// `@/lib/anime/series.api`. The route is PUBLIC, so no `callerRequestOptions()` and no cookie
// forwarding: the catalogue is the same for everyone.

import { notFound } from "next/navigation";

import EpisodeGrid from "@/components/home/anime/sections/episode-grid";
import SeriesHero from "@/components/home/anime/sections/series-hero";
import { getPublicAnimeSeries } from "@/lib/anime/series.api";
import type { PublicAnimeSeriesDetail } from "@/lib/anime/schemas";

/**
 * `not-found` and `unavailable` are NOT the same state and are not collapsed.
 *
 * A 404 means the backend answered and the series is not public — `notFound()` is exactly
 * right, and it is what the prerendered sentinel param renders too. Anything else means the
 * read itself failed, and rendering "this show does not exist" for a backend outage would be
 * a lie that a crawler would then cache.
 *
 * THIS IS THE OPPOSITE CHOICE FROM THE HERO CAROUSEL, deliberately. There, an unavailable
 * read renders nothing because the carousel is ornamental and the rails below are the page.
 * Here the series IS the page, so a blank one would read as "this show does not exist".
 */
type AnimeSeriesViewState =
  | { status: "not-found" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; series: PublicAnimeSeriesDetail };

export default async function AnimeSeriesDetailPage({ seriesSlug }: { seriesSlug: string }) {
  const seriesResult = await getPublicAnimeSeries(seriesSlug, { cache: "no-store" });

  const viewState: AnimeSeriesViewState = seriesResult.success
    ? { status: "ready", series: seriesResult.data }
    : seriesResult.error.code === "404"
      ? { status: "not-found" }
      : { status: "unavailable", message: seriesResult.error.message };

  switch (viewState.status) {
    case "not-found":
      // `notFound()` is typed `never` and throws, so this arm needs no `return` and cannot
      // fall through into the next one.
      notFound();
    case "unavailable":
      return (
        <div className="mx-auto max-w-5xl px-4 py-16 lg:px-6">
          <h1 className="text-xl font-semibold">This page could not be loaded</h1>
          <p role="alert" className="mt-2 text-sm text-muted-foreground">
            {viewState.message}
          </p>
        </div>
      );
    case "ready":
      return (
        <div className="pb-12">
          <SeriesHero series={viewState.series} />
          <EpisodeGrid seasons={viewState.series.seasons} />
        </div>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
