"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import SeriesEditorModal from "@/components/studio/series/series-editor-modal";
import { useCreateSeasonMutation, useCreateSeriesMutation, useMySeriesQuery } from "@/hooks/series";
import type { SeriesListRow } from "@/lib/series/schemas";

// TRANSPORT: client-query — `GET /series/mine`, plus `POST /series`.
//
// THE SERVER MINTS THE ID. The mock slugified the title and hand-rolled a collision counter
// against the array it happened to hold, so two creators — or one creator in two tabs — could
// mint the same id. Ids come back from `POST /series` now.
export default function SeriesPage() {
  const seriesQuery = useMySeriesQuery({ limit: 100 });
  const createSeriesMutation = useCreateSeriesMutation();
  const createSeasonMutation = useCreateSeasonMutation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const seriesList = seriesQuery.data?.rows ?? [];

  function handleSeriesCreate(savedFields: {
    readonly title: string;
    readonly description: string;
    readonly genreTags: string[];
  }) {
    createSeriesMutation.mutate(savedFields, {
      onSuccess: (createdSeries) => {
        // A series with no seasons has nowhere to put an episode, so the first one is created
        // here rather than left to the creator. TWO calls because `POST /series` takes no
        // seasons — a nested create would need a route the backend does not have.
        createSeasonMutation.mutate({
          seriesId: createdSeries.id,
          input: { seasonLabel: "Season 1", position: 0 },
        });
        setIsCreateModalOpen(false);
      },
    });
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

      {seriesQuery.isPending ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading your series…</p>
      ) : seriesQuery.error !== null ? (
        <p className="mt-10 text-sm text-destructive">Couldn&rsquo;t load your series.</p>
      ) : seriesList.length === 0 ? (
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
          isSavePending={createSeriesMutation.isPending}
          saveErrorMessage={
            createSeriesMutation.error === null ? null : "Couldn't create that series."
          }
          onCancel={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

function SeriesCard({ series }: { series: SeriesListRow }) {
  // Both counts come from the list projection now. They were lost when this page was wired —
  // `SeriesListRow` carried only `seasonCount` — and both are `countDistinct` on tables the
  // query already joins, so restoring them cost no extra read.
  const seasonCountLabel = series.seasonCount === 1 ? "1 season" : `${series.seasonCount} seasons`;
  const episodeCountLabel =
    series.episodeCount === 1 ? "1 episode" : `${series.episodeCount} episodes`;

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
            <span className="capitalize">{series.status}</span> · {seasonCountLabel} ·{" "}
            {episodeCountLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}
