// TRANSPORT: props-only — the series arrives from `series-detail-page`, which reads
// `GET /anime/series/:seriesSlug` server-side. This component fetches nothing.

import Image from "next/image";

import { ANIME_SERIES_STATUS_LABELS, type PublicAnimeSeriesDetail } from "@/lib/anime/schemas";

/**
 * The banner at the top of a series page: poster, title, status, genres, synopsis.
 *
 * THE POSTER IS BLURRED BEHIND ITSELF rather than a separate backdrop asset. `anime_series`
 * stores one image, so a distinct wide backdrop would be a column the studio has no way to
 * fill; scaling the poster up under a blur and a gradient is what fills the band using only
 * what exists. A series with no poster gets the flat muted band instead — no placeholder
 * artwork is invented for it, because a stand-in poster is a claim about a show.
 *
 * THE SYNOPSIS IS NOT TRUNCATED and has no "read more". It is the one place the show gets to
 * describe itself, `line-clamp` on it would hide the ending of most real synopses, and a
 * disclosure widget here would be a client island for text that is already on the page.
 */
export default function SeriesHero({ series }: { series: PublicAnimeSeriesDetail }) {
  const watchableEpisodeCount = series.seasons.reduce(
    (runningTotal, season) => runningTotal + season.episodes.length,
    0,
  );

  return (
    <header className="relative overflow-hidden">
      {series.posterUrl !== null && (
        <div aria-hidden="true" className="absolute inset-0">
          <Image
            src={series.posterUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover blur-2xl"
            unoptimized
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/85 to-background/60" />
        </div>
      )}

      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 sm:flex-row lg:px-6">
        <div className="relative aspect-2/3 w-32 shrink-0 overflow-hidden rounded-xl bg-muted shadow-lg sm:w-40">
          {series.posterUrl !== null && (
            <Image
              src={series.posterUrl}
              alt={series.title}
              fill
              priority
              sizes="(min-width: 640px) 160px, 128px"
              className="object-cover"
              unoptimized
            />
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <h1 className="text-xl leading-tight font-semibold text-balance sm:text-2xl">
            {series.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-foreground">
              {ANIME_SERIES_STATUS_LABELS[series.status]}
            </span>
            <span>
              {watchableEpisodeCount === 1
                ? "1 episode"
                : `${String(watchableEpisodeCount)} episodes`}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {series.seasons.length === 1
                ? "1 season"
                : `${String(series.seasons.length)} seasons`}
            </span>
          </div>

          {series.genreTags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {series.genreTags.map((genreTag) => (
                <li
                  key={genreTag}
                  className="rounded-full border border-[#CAC4D0]/60 px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {genreTag}
                </li>
              ))}
            </ul>
          )}

          {/*
            No fallback sentence for a null description. An absent synopsis renders as
            nothing at all rather than as "No description available", which is a line every
            un-described show on the site would repeat and which tells a reader less than
            the empty space does.
          */}
          {series.description !== null && series.description.trim().length > 0 && (
            <p className="max-w-2xl text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {series.description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
