"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { StudioSeries, useStudioVideos } from "@/state/studio-videos-context";
import SeriesEditorModal from "@/components/studio/series/series-editor-modal";

// Creator-facing catalog of anime series (UI phase — mock data only). Each
// card opens the series detail page where seasons and episodes are managed.
export default function SeriesPage() {
  const { seriesList, addSeries } = useStudioVideos();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  function buildUniqueSeriesId(seriesTitle: string) {
    const baseSlug = seriesTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    let candidateSlug = baseSlug || "series";
    let collisionCounter = 2;
    while (seriesList.some((existingSeries) => existingSeries.id === candidateSlug)) {
      candidateSlug = `${baseSlug}-${collisionCounter}`;
      collisionCounter += 1;
    }
    return candidateSlug;
  }

  function handleSeriesCreate(
    savedFields: Pick<StudioSeries, "title" | "description" | "genreTags">,
  ) {
    addSeries({
      id: buildUniqueSeriesId(savedFields.title),
      title: savedFields.title,
      description: savedFields.description,
      posterImagePath: null,
      genreTags: savedFields.genreTags,
      seasons: [{ id: crypto.randomUUID(), seasonLabel: "Season 1", episodes: [] }],
    });
    setIsCreateModalOpen(false);
  }

  const newSeriesButton = (
    <button
      type="button"
      onClick={() => setIsCreateModalOpen(true)}
      className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
    >
      <Image
        src="/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
      />
      New series
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Series</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your anime series — seasons, episodes, and series details.
          </p>
        </div>
        {newSeriesButton}
      </div>

      {seriesList.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No series yet</p>
          {newSeriesButton}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seriesList.map((series) => (
            <SeriesCard key={series.id} series={series} />
          ))}
        </ul>
      )}

      {isCreateModalOpen && (
        <SeriesEditorModal
          onSave={handleSeriesCreate}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

function SeriesCard({ series }: { series: StudioSeries }) {
  const totalEpisodeCount = series.seasons.reduce(
    (episodeCount, season) => episodeCount + season.episodes.length,
    0,
  );
  const seasonCountLabel =
    series.seasons.length === 1 ? "1 season" : `${series.seasons.length} seasons`;
  const episodeCountLabel = totalEpisodeCount === 1 ? "1 episode" : `${totalEpisodeCount} episodes`;

  return (
    <li>
      <Link
        href={`/studio/series/${series.id}`}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border transition-colors hover:bg-secondary/30"
      >
        <span className="flex aspect-3/2 items-center justify-center bg-secondary">
          <Image
            src="/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={40}
            height={40}
          />
        </span>
        <span className="flex flex-col gap-1 p-4">
          <span className="truncate text-sm font-medium text-foreground">{series.title}</span>
          {series.genreTags.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {series.genreTags.join(" · ")}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {seasonCountLabel} · {episodeCountLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}
