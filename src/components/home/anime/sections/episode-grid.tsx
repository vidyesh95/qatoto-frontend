// TRANSPORT: props-only — the seasons arrive from `series-detail-page`, which reads
// `GET /anime/series/:seriesSlug` server-side. This component fetches nothing.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { PublicAnimeSeason } from "@/lib/anime/schemas";

/** `3661` -> `1:01:01`, `605` -> `10:05`. Hours only appear when there are any. */
function formatDurationLabel(durationSeconds: number): string {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${String(hours)}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
    : `${String(minutes)}:${paddedSeconds}`;
}

/**
 * Season tabs over an episode grid.
 *
 * EVERY EPISODE HERE IS WATCHABLE. The backend lists only episodes whose video is publicly
 * servable, so there is no "upcoming" or locked state to render and no disabled card: an
 * unreleased episode is omitted entirely, because an episode title is itself unreleased
 * content. The visible consequence is intended — episode NUMBERS can have gaps, because a
 * withdrawn episode leaves one — which is exactly why each card shows its own number rather
 * than relying on its position in the grid.
 *
 * THERE IS NO PREMIUM BADGE. The `is_premium` column exists and no entitlement model, tier
 * or paywall does, anywhere in this codebase, so the backend does not project it: a lock on
 * an episode that plays for free is a claim nothing can back.
 *
 * `"use client"` FOR THE TAB ONLY. The season index is the entire client state; the cards
 * themselves are plain links, and the grid is rendered from props the server already
 * resolved.
 */
export default function EpisodeGrid({ seasons }: { seasons: readonly PublicAnimeSeason[] }) {
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);

  // The server never sends a series with no watchable seasons — it answers 404 instead — so
  // this is a guard against the type, not a state a visitor reaches.
  if (seasons.length === 0) return null;

  const activeSeason = seasons[activeSeasonIndex] ?? seasons[0];

  return (
    <section className="mx-auto max-w-5xl px-4 lg:px-6">
      {/* One season needs no picker; a lone tab is chrome that decides nothing. */}
      {seasons.length > 1 && (
        <div className="sticky top-13 z-10 border-b border-border bg-background">
          <div className="flex scrollbar-none overflow-x-auto">
            {seasons.map((season, seasonIndex) => {
              const isActive = season.seasonId === activeSeason.seasonId;
              return (
                <button
                  key={season.seasonId}
                  type="button"
                  onClick={() => {
                    setActiveSeasonIndex(seasonIndex);
                  }}
                  aria-pressed={isActive}
                  className={`relative shrink-0 cursor-pointer px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                    isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
                  }`}
                >
                  <span className="relative inline-block">
                    {season.seasonLabel}
                    {isActive && (
                      <span className="absolute inset-x-0 -bottom-3 h-0.75 rounded-t-full bg-[#00696E]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {activeSeason.episodes.map((episode) => (
          <li key={episode.episodeId}>
            <Link
              href={`/anime/watch?v=${encodeURIComponent(episode.videoId)}`}
              className="group/episode block space-y-1.5"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                {episode.thumbnailUrl !== null && (
                  <Image
                    src={episode.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition group-hover/episode:scale-105"
                    unoptimized
                  />
                )}
                {episode.durationSeconds !== null && (
                  <span className="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                    {formatDurationLabel(episode.durationSeconds)}
                  </span>
                )}
              </div>

              <p className="line-clamp-2 text-sm leading-snug">
                {/* The number is on the card because the grid's order cannot be trusted to
                    imply it — a withdrawn episode leaves a gap on purpose. */}
                <span className="text-muted-foreground tabular-nums">{episode.episodeNumber}.</span>{" "}
                {episode.episodeTitle}
              </p>

              {(episode.audioMode !== null || episode.ageRating !== null) && (
                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {episode.audioMode !== null && (
                    <span className="rounded bg-muted px-1.5 py-0.5">
                      {episode.audioMode === "subbed" ? "Subbed" : "Dubbed"}
                      {episode.audioLanguage === null ? "" : ` · ${episode.audioLanguage}`}
                    </span>
                  )}
                  {episode.ageRating !== null && (
                    <span className="rounded bg-muted px-1.5 py-0.5">{episode.ageRating}</span>
                  )}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
