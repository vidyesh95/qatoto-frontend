"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import EpisodeEditorModal from "@/components/studio/series/episode-editor-modal";
import SeriesEditorModal from "@/components/studio/series/series-editor-modal";
import {
  useCreateEpisodeMutation,
  useCreateSeasonMutation,
  useDeleteEpisodeMutation,
  useDeleteSeasonMutation,
  useDeleteSeriesMutation,
  useRemoveSeriesPosterMutation,
  useReplaceSeriesPosterMutation,
  useSeriesQuery,
  useUpdateEpisodeMutation,
  useUpdateSeasonMutation,
  useUpdateSeriesMutation,
} from "@/hooks/series";
import { ApiRequestError } from "@/lib/http";
import type { AnimeEpisodeSummary, AnimeSeasonSummary } from "@/lib/series/schemas";

// TRANSPORT: client-query — `GET /series/:seriesId`, plus season and episode mutations.
//
// EVERY WRITE ANSWERS THE WHOLE SERIES TREE, so there is no local season/episode array to keep
// in sync and no cache patching to get wrong. The hooks adopt the returned tree; this component
// just re-renders from it.
//
// SEASON REORDERING CHANGED SHAPE. The mock swapped two entries in an array; the wire has a
// `position` integer per season, so moving one is TWO `PATCH .../seasons/:id` calls that swap
// the two positions. Doing it as one array write would need a bulk-reorder route that does not
// exist.
export default function SeriesDetailPage({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const seriesQuery = useSeriesQuery(seriesId);

  const updateSeriesMutation = useUpdateSeriesMutation();
  const deleteSeriesMutation = useDeleteSeriesMutation();
  const createSeasonMutation = useCreateSeasonMutation();
  const updateSeasonMutation = useUpdateSeasonMutation();
  const deleteSeasonMutation = useDeleteSeasonMutation();
  const createEpisodeMutation = useCreateEpisodeMutation();
  const updateEpisodeMutation = useUpdateEpisodeMutation();
  const deleteEpisodeMutation = useDeleteEpisodeMutation();
  const replacePosterMutation = useReplaceSeriesPosterMutation();
  const removePosterMutation = useRemoveSeriesPosterMutation();

  const [isEditSeriesModalOpen, setIsEditSeriesModalOpen] = useState(false);
  /**
   * ONE MESSAGE FOR BOTH POSTER MUTATIONS, held here rather than read off either mutation's
   * `error`. The server's own sentence is what a creator needs — "The uploaded file is not a
   * valid image", "Image must be at least 64x64 pixels", "Image uploads are not configured on
   * this server" — and each is written once in the backend's mapper. Inventing copy at this call
   * site would mean six sentences to keep in sync with the mapper that already has them.
   */
  const [posterErrorMessage, setPosterErrorMessage] = useState<string | null>(null);
  const [isDeleteSeriesPending, setIsDeleteSeriesPending] = useState(false);
  const [episodeEditorTarget, setEpisodeEditorTarget] = useState<{
    seasonId: string;
    episodeToEdit?: AnimeEpisodeSummary;
  } | null>(null);

  const matchingSeries = seriesQuery.data;

  if (seriesQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading this series…</div>;
  }

  if (matchingSeries === undefined) {
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

  function handlePosterSelect(imageFile: File) {
    setPosterErrorMessage(null);
    replacePosterMutation.mutate(
      { seriesId, imageFile },
      { onError: (error) => setPosterErrorMessage(describePosterError(error)) },
    );
  }

  function handlePosterRemove() {
    setPosterErrorMessage(null);
    removePosterMutation.mutate(seriesId, {
      onError: (error) => setPosterErrorMessage(describePosterError(error)),
    });
  }

  function handleSeriesMetadataSave(savedFields: {
    readonly title: string;
    readonly description: string;
    readonly genreTags: string[];
  }) {
    updateSeriesMutation.mutate(
      { seriesId, input: savedFields },
      { onSuccess: () => setIsEditSeriesModalOpen(false) },
    );
  }

  function handleDeleteSeriesClick() {
    // Click once to arm, once to confirm. Deleting a series takes its seasons and episodes
    // with it and there is no undo route.
    if (!isDeleteSeriesPending) {
      setIsDeleteSeriesPending(true);
      return;
    }
    deleteSeriesMutation.mutate(seriesId, {
      // Navigate only AFTER the server confirms. The mock pushed immediately, so a failed
      // delete left the creator on the series list looking at a series that still existed.
      onSuccess: () => router.push("/studio/series"),
    });
  }

  // Captured AFTER the guard above. The two handlers below are hoisted `function` declarations,
  // so TypeScript's narrowing of `matchingSeries` does not reach inside them — a plain local
  // that is already known non-undefined does.
  const seasons = matchingSeries.seasons;

  function handleAddSeasonClick() {
    createSeasonMutation.mutate({
      seriesId,
      input: {
        seasonLabel: `Season ${seasons.length + 1}`,
        position: seasons.length,
      },
    });
  }

  function handleSeasonMove(seasonIndex: number, direction: -1 | 1) {
    const targetIndex = seasonIndex + direction;
    if (targetIndex < 0 || targetIndex >= seasons.length) return;
    const movingSeason = seasons[seasonIndex];
    const displacedSeason = seasons[targetIndex];

    // TWO calls, swapping the two `position` values. Sequential rather than parallel so the
    // second write lands on the tree the first one produced.
    updateSeasonMutation.mutate(
      {
        seriesId,
        seasonId: movingSeason.id,
        input: { position: displacedSeason.position },
      },
      {
        onSuccess: () =>
          updateSeasonMutation.mutate({
            seriesId,
            seasonId: displacedSeason.id,
            input: { position: movingSeason.position },
          }),
      },
    );
  }

  function handleEpisodeSave(
    seasonId: string,
    savedEpisode: {
      readonly episodeId: string | null;
      readonly episodeNumber: number;
      readonly episodeTitle: string;
      readonly isPremium: boolean;
    },
  ) {
    const input = {
      episodeNumber: savedEpisode.episodeNumber,
      episodeTitle: savedEpisode.episodeTitle,
      isPremium: savedEpisode.isPremium,
    };
    const onSuccess = () => setEpisodeEditorTarget(null);

    if (savedEpisode.episodeId === null) {
      createEpisodeMutation.mutate({ seriesId, seasonId, input }, { onSuccess });
      return;
    }
    updateEpisodeMutation.mutate(
      { seriesId, seasonId, episodeId: savedEpisode.episodeId, input },
      { onSuccess },
    );
  }

  function handleEpisodeRemove(seasonId: string, episodeId: string) {
    deleteEpisodeMutation.mutate({ seriesId, seasonId, episodeId });
  }

  function handleSeasonRemove(seasonId: string) {
    deleteSeasonMutation.mutate({ seriesId, seasonId });
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
            onRemoveSeason={() => handleSeasonRemove(season.id)}
          />
        ))}
      </div>

      {isEditSeriesModalOpen && (
        <SeriesEditorModal
          seriesToEdit={matchingSeries}
          onSave={handleSeriesMetadataSave}
          isSavePending={updateSeriesMutation.isPending}
          saveErrorMessage={
            updateSeriesMutation.error === null ? null : "Couldn't save those series details."
          }
          onCancel={() => setIsEditSeriesModalOpen(false)}
          onPosterSelect={handlePosterSelect}
          onPosterRemove={handlePosterRemove}
          isPosterPending={replacePosterMutation.isPending || removePosterMutation.isPending}
          posterErrorMessage={posterErrorMessage}
        />
      )}

      {episodeEditorTarget && (
        <EpisodeEditorModal
          episodeToEdit={episodeEditorTarget.episodeToEdit}
          suggestedEpisodeNumber={suggestedEpisodeNumber}
          isSavePending={createEpisodeMutation.isPending || updateEpisodeMutation.isPending}
          onSave={(savedEpisode) => handleEpisodeSave(episodeEditorTarget.seasonId, savedEpisode)}
          onCancel={() => setEpisodeEditorTarget(null)}
        />
      )}
    </div>
  );
}

type SeasonCardProps = {
  season: AnimeSeasonSummary;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddEpisodeClick: () => void;
  onEditEpisodeClick: (episodeToEdit: AnimeEpisodeSummary) => void;
  onRemoveEpisode: (episodeId: string) => void;
  onRemoveSeason: () => void;
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
  onRemoveSeason,
}: SeasonCardProps) {
  const [isRemoveSeasonPending, setIsRemoveSeasonPending] = useState(false);
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddEpisodeClick}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Add episode
          </button>
          {/*
            Click once to arm, once to confirm — the same pattern as the episode row and the
            playlists page. Deleting a season takes its episodes with it and there is no undo
            route, so a single click must not be enough.
          */}
          <button
            type="button"
            onClick={() => {
              if (!isRemoveSeasonPending) {
                setIsRemoveSeasonPending(true);
                return;
              }
              onRemoveSeason();
              setIsRemoveSeasonPending(false);
            }}
            onBlur={() => setIsRemoveSeasonPending(false)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isRemoveSeasonPending
                ? "bg-destructive/10 text-destructive"
                : "border border-border text-muted-foreground hover:text-destructive"
            }`}
          >
            {isRemoveSeasonPending ? "Confirm delete" : "Delete season"}
          </button>
        </div>
      </div>

      {episodesSortedByNumber.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No episodes yet</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {episodesSortedByNumber.map((episode) => (
            <EpisodeRow
              key={episode.id}
              episode={episode}
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
  episode: AnimeEpisodeSummary;
  onEditClick: () => void;
  onRemove: () => void;
};

function EpisodeRow({ episode, onEditClick, onRemove }: EpisodeRowProps) {
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
        {/*
          `videoId` is nullable BY DESIGN: a season can be planned before any of its episodes
          has a video. The link is made from the VIDEO side — uploading with an `anime` block
          naming this series and season — never from here, so this is a status, not a control.
        */}
        {episode.videoId === null ? (
          <p className="text-xs text-muted-foreground italic">No video attached</p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">Video attached</p>
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

/**
 * The server's own sentence when there is one, a generic fallback when there is not.
 *
 * A 503 here means this DEPLOYMENT has no image credentials, not that the creator did anything
 * wrong, and the backend's mapper already says so in those words. Anything that is not an
 * `ApiRequestError` never reached the server at all — a dropped connection — and gets the retry
 * sentence instead.
 */
function describePosterError(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.apiError.message
    : "Couldn't update the poster. Please try again.";
}
