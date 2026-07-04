"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  StudioEpisode,
  StudioSeason,
  StudioSeries,
  useStudioVideos,
} from "@/state/studio-videos-context";
import SeriesEditorModal from "@/components/studio/series/series-editor-modal";
import EpisodeEditorModal from "@/components/studio/series/episode-editor-modal";

// Series detail — the one place a creator manages a series: metadata, seasons
// (add/reorder), and the episodes inside each season (add/edit/remove, attach
// uploaded videos). UI phase — context state resets on hard refresh.
export default function SeriesDetailPage({ seriesId }: { seriesId: string }) {
  const { seriesList, videos, updateSeries, deleteSeries } = useStudioVideos();
  const router = useRouter();

  const [isEditSeriesModalOpen, setIsEditSeriesModalOpen] = useState(false);
  const [isDeleteSeriesPending, setIsDeleteSeriesPending] = useState(false);
  const [episodeEditorTarget, setEpisodeEditorTarget] = useState<{
    seasonId: string;
    episodeToEdit?: StudioEpisode;
  } | null>(null);

  const matchingSeries = seriesList.find((series) => series.id === seriesId);

  if (!matchingSeries) {
    return (
      <div className="p-6">
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">Series not found</p>
          <Link
            href="/studio/series"
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Back to Series
          </Link>
        </div>
      </div>
    );
  }

  function handleSeriesMetadataSave(
    savedFields: Pick<StudioSeries, "title" | "description" | "genreTags">,
  ) {
    if (!matchingSeries) return;
    updateSeries({ ...matchingSeries, ...savedFields });
    setIsEditSeriesModalOpen(false);
  }

  function handleDeleteSeriesClick() {
    if (!matchingSeries) return;
    if (!isDeleteSeriesPending) {
      setIsDeleteSeriesPending(true);
      return;
    }
    deleteSeries(matchingSeries.id);
    router.push("/studio/series");
  }

  function handleAddSeasonClick() {
    if (!matchingSeries) return;
    updateSeries({
      ...matchingSeries,
      seasons: [
        ...matchingSeries.seasons,
        {
          id: crypto.randomUUID(),
          seasonLabel: `Season ${matchingSeries.seasons.length + 1}`,
          episodes: [],
        },
      ],
    });
  }

  function handleSeasonMove(seasonIndex: number, direction: -1 | 1) {
    if (!matchingSeries) return;
    const targetIndex = seasonIndex + direction;
    if (targetIndex < 0 || targetIndex >= matchingSeries.seasons.length) return;
    const reorderedSeasons = [...matchingSeries.seasons];
    [reorderedSeasons[seasonIndex], reorderedSeasons[targetIndex]] = [
      reorderedSeasons[targetIndex],
      reorderedSeasons[seasonIndex],
    ];
    updateSeries({ ...matchingSeries, seasons: reorderedSeasons });
  }

  function handleEpisodeSave(seasonId: string, savedEpisode: StudioEpisode) {
    if (!matchingSeries) return;
    updateSeries({
      ...matchingSeries,
      seasons: matchingSeries.seasons.map((season) => {
        if (season.id !== seasonId) return season;
        const isExistingEpisode = season.episodes.some(
          (existingEpisode) => existingEpisode.id === savedEpisode.id,
        );
        return {
          ...season,
          episodes: isExistingEpisode
            ? season.episodes.map((existingEpisode) =>
                existingEpisode.id === savedEpisode.id ? savedEpisode : existingEpisode,
              )
            : [...season.episodes, savedEpisode],
        };
      }),
    });
    setEpisodeEditorTarget(null);
  }

  function handleEpisodeRemove(seasonId: string, episodeId: string) {
    if (!matchingSeries) return;
    updateSeries({
      ...matchingSeries,
      seasons: matchingSeries.seasons.map((season) =>
        season.id === seasonId
          ? {
              ...season,
              episodes: season.episodes.filter(
                (existingEpisode) => existingEpisode.id !== episodeId,
              ),
            }
          : season,
      ),
    });
  }

  function findAttachedVideoTitle(attachedVideoId: string | null) {
    if (attachedVideoId === null) return null;
    return videos.find((video) => video.id === attachedVideoId)?.title ?? null;
  }

  const targetSeasonForEditor = episodeEditorTarget
    ? matchingSeries.seasons.find((season) => season.id === episodeEditorTarget.seasonId)
    : undefined;
  const suggestedEpisodeNumber = targetSeasonForEditor
    ? Math.max(0, ...targetSeasonForEditor.episodes.map((episode) => episode.episodeNumber)) + 1
    : 1;

  return (
    <div className="p-6">
      <Link
        href="/studio/series"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All series
      </Link>

      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        <span className="flex aspect-2/3 w-40 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Image
            src="/icons/live_tv_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={40}
            height={40}
          />
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{matchingSeries.title}</h1>
          {matchingSeries.description !== "" && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {matchingSeries.description}
            </p>
          )}
          {matchingSeries.genreTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {matchingSeries.genreTags.map((genreTag) => (
                <span
                  key={genreTag}
                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {genreTag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditSeriesModalOpen(true)}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              Edit series
            </button>
            <button
              type="button"
              onClick={handleDeleteSeriesClick}
              onBlur={() => setIsDeleteSeriesPending(false)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isDeleteSeriesPending
                  ? "bg-destructive/10 text-destructive"
                  : "border border-border text-muted-foreground hover:text-destructive"
              }`}
            >
              {isDeleteSeriesPending ? "Confirm delete" : "Delete series"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Seasons</h2>
        <button
          type="button"
          onClick={handleAddSeasonClick}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Add season
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {matchingSeries.seasons.map((season, seasonIndex) => (
          <SeasonCard
            key={season.id}
            season={season}
            canMoveUp={seasonIndex > 0}
            canMoveDown={seasonIndex < matchingSeries.seasons.length - 1}
            onMoveUp={() => handleSeasonMove(seasonIndex, -1)}
            onMoveDown={() => handleSeasonMove(seasonIndex, 1)}
            onAddEpisodeClick={() => setEpisodeEditorTarget({ seasonId: season.id })}
            onEditEpisodeClick={(episodeToEdit) =>
              setEpisodeEditorTarget({ seasonId: season.id, episodeToEdit })
            }
            onRemoveEpisode={(episodeId) => handleEpisodeRemove(season.id, episodeId)}
            findAttachedVideoTitle={findAttachedVideoTitle}
          />
        ))}
      </div>

      {isEditSeriesModalOpen && (
        <SeriesEditorModal
          seriesToEdit={matchingSeries}
          onSave={handleSeriesMetadataSave}
          onCancel={() => setIsEditSeriesModalOpen(false)}
        />
      )}

      {episodeEditorTarget && (
        <EpisodeEditorModal
          episodeToEdit={episodeEditorTarget.episodeToEdit}
          suggestedEpisodeNumber={suggestedEpisodeNumber}
          onSave={(savedEpisode) => handleEpisodeSave(episodeEditorTarget.seasonId, savedEpisode)}
          onCancel={() => setEpisodeEditorTarget(null)}
        />
      )}
    </div>
  );
}

type SeasonCardProps = {
  season: StudioSeason;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddEpisodeClick: () => void;
  onEditEpisodeClick: (episodeToEdit: StudioEpisode) => void;
  onRemoveEpisode: (episodeId: string) => void;
  findAttachedVideoTitle: (attachedVideoId: string | null) => string | null;
};

function SeasonCard({
  season,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onAddEpisodeClick,
  onEditEpisodeClick,
  onRemoveEpisode,
  findAttachedVideoTitle,
}: SeasonCardProps) {
  const episodesSortedByNumber = season.episodes.toSorted(
    (firstEpisode, secondEpisode) => firstEpisode.episodeNumber - secondEpisode.episodeNumber,
  );

  return (
    <section className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{season.seasonLabel}</h3>
          <div className="flex items-center">
            <button
              type="button"
              aria-label={`Move ${season.seasonLabel} up`}
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="cursor-pointer rounded-full p-1 transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-30"
            >
              <Image
                src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="rotate-180"
              />
            </button>
            <button
              type="button"
              aria-label={`Move ${season.seasonLabel} down`}
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="cursor-pointer rounded-full p-1 transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-30"
            >
              <Image
                src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onAddEpisodeClick}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Add episode
        </button>
      </div>

      {episodesSortedByNumber.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No episodes yet</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {episodesSortedByNumber.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
              attachedVideoTitle={findAttachedVideoTitle(episode.attachedVideoId)}
              onEditClick={() => onEditEpisodeClick(episode)}
              onRemove={() => onRemoveEpisode(episode.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type EpisodeRowProps = {
  episode: StudioEpisode;
  attachedVideoTitle: string | null;
  onEditClick: () => void;
  onRemove: () => void;
};

function EpisodeRow({ episode, attachedVideoTitle, onEditClick, onRemove }: EpisodeRowProps) {
  const [isRemovePending, setIsRemovePending] = useState(false);

  function handleRemoveClick() {
    if (!isRemovePending) {
      setIsRemovePending(true);
      return;
    }
    onRemove();
  }

  return (
    <li className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          Ep {episode.episodeNumber} · {episode.episodeTitle}
        </p>
        {attachedVideoTitle !== null ? (
          <p className="truncate text-xs text-muted-foreground">{attachedVideoTitle}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">No video attached</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {episode.isPremium && (
          <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background">
            Premium
          </span>
        )}
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleRemoveClick}
          onBlur={() => setIsRemovePending(false)}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isRemovePending
              ? "bg-destructive/10 text-destructive"
              : "border border-border text-muted-foreground hover:text-destructive"
          }`}
        >
          {isRemovePending ? "Confirm" : "Remove"}
        </button>
      </div>
    </li>
  );
}
