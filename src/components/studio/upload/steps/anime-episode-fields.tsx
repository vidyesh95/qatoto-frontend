"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimeEpisodeDetails, useStudioVideos } from "@/state/studio-videos-context";

// Conditional Details-step section, shown only when Video type = Anime
// episode. Anime is curated: on Save the upload shows as Pending in My Videos
// until admin review passes (approval is server-side only). Series and season
// options come from the shared studio context (managed in /studio/series);
// typing a new name here does not create the series — episodes get formally
// attached on the series detail page.
const CREATE_NEW_SERIES_OPTION_VALUE = "__create-new-series__";
const CREATE_NEW_SEASON_OPTION_VALUE = "__create-new-season__";
const WEEKDAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const AUDIO_LANGUAGE_OPTIONS = ["Japanese", "English", "Hindi", "Korean", "Mandarin"];
const AGE_RATING_OPTIONS = ["G", "PG", "PG-13", "R-17+"];
const ANIME_GENRE_OPTIONS = [
  "Action",
  "Romance",
  "Isekai",
  "Slice of life",
  "Sports",
  "Mecha",
  "Sci-fi",
  "Drama",
];

export function createEmptyAnimeEpisodeDetails(): AnimeEpisodeDetails {
  return {
    seriesName: "",
    seasonLabel: "",
    episodeNumber: "",
    episodeTitle: "",
    releaseScheduleDay: WEEKDAY_OPTIONS[4],
    releaseScheduleTime: "18:00",
    premiereDate: "",
    audioMode: "subbed",
    audioLanguage: AUDIO_LANGUAGE_OPTIONS[0],
    ageRating: AGE_RATING_OPTIONS[2],
    genreTags: [],
  };
}

type AnimeEpisodeFieldsProps = {
  episodeDetails: AnimeEpisodeDetails;
  onEpisodeDetailsChange: (patch: Partial<AnimeEpisodeDetails>) => void;
};

export default function AnimeEpisodeFields({
  episodeDetails,
  onEpisodeDetailsChange,
}: AnimeEpisodeFieldsProps) {
  const { seriesList } = useStudioVideos();

  // Edit-mode safety: a saved seriesName that no series matches was typed as
  // new, so the wizard reopens in create-new mode instead of an empty select.
  const [isCreatingNewSeries, setIsCreatingNewSeries] = useState(
    () =>
      episodeDetails.seriesName !== "" &&
      !seriesList.some((existingSeries) => existingSeries.title === episodeDetails.seriesName),
  );

  const selectedSeries = isCreatingNewSeries
    ? undefined
    : seriesList.find((existingSeries) => existingSeries.title === episodeDetails.seriesName);

  const [isCreatingNewSeason, setIsCreatingNewSeason] = useState(
    () =>
      episodeDetails.seasonLabel !== "" &&
      !seriesList
        .find((existingSeries) => existingSeries.title === episodeDetails.seriesName)
        ?.seasons.some(
          (existingSeason) => existingSeason.seasonLabel === episodeDetails.seasonLabel,
        ),
  );

  function handleSeriesSelectChange(selectedValue: string) {
    if (selectedValue === CREATE_NEW_SERIES_OPTION_VALUE) {
      setIsCreatingNewSeries(true);
      onEpisodeDetailsChange({ seriesName: "", seasonLabel: "" });
      return;
    }
    setIsCreatingNewSeries(false);
    setIsCreatingNewSeason(false);
    // Clear the season — the previous pick may not exist on the new series.
    onEpisodeDetailsChange({ seriesName: selectedValue, seasonLabel: "" });
  }

  function handleSeasonSelectChange(selectedValue: string) {
    if (selectedValue === CREATE_NEW_SEASON_OPTION_VALUE) {
      setIsCreatingNewSeason(true);
      onEpisodeDetailsChange({ seasonLabel: "" });
      return;
    }
    setIsCreatingNewSeason(false);
    onEpisodeDetailsChange({ seasonLabel: selectedValue });
  }

  function handleGenreTagToggle(genreTag: string) {
    const isAlreadySelected = episodeDetails.genreTags.includes(genreTag);
    onEpisodeDetailsChange({
      genreTags: isAlreadySelected
        ? episodeDetails.genreTags.filter((selectedTag) => selectedTag !== genreTag)
        : [...episodeDetails.genreTags, genreTag],
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Anime episode</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Anime episodes go to admin review before appearing in Anime — status shows as Pending in
          My Videos until approved.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-series-name" className="text-sm font-medium text-foreground">
            Series
          </label>
          <div className="relative">
            <select
              id="anime-series-name"
              value={
                isCreatingNewSeries ? CREATE_NEW_SERIES_OPTION_VALUE : episodeDetails.seriesName
              }
              onChange={(event) => handleSeriesSelectChange(event.target.value)}
              className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
            >
              <option value="">Select a series</option>
              {seriesList.map((existingSeries) => (
                <option key={existingSeries.id} value={existingSeries.title}>
                  {existingSeries.title}
                </option>
              ))}
              <option value={CREATE_NEW_SERIES_OPTION_VALUE}>Create new series…</option>
            </select>
            <Image
              src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
          {isCreatingNewSeries && (
            <>
              <input
                type="text"
                aria-label="New series name"
                value={episodeDetails.seriesName}
                onChange={(event) => onEpisodeDetailsChange({ seriesName: event.target.value })}
                placeholder="New series name"
                className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
              <p className="text-xs text-muted-foreground">
                Manage seasons and episodes later in{" "}
                <Link href="/studio/series" className="text-[#1DBDC5] hover:underline">
                  Studio → Series
                </Link>
                .
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-season-label" className="text-sm font-medium text-foreground">
            Season
          </label>
          {selectedSeries && !isCreatingNewSeason ? (
            <div className="relative">
              <select
                id="anime-season-label"
                value={episodeDetails.seasonLabel}
                onChange={(event) => handleSeasonSelectChange(event.target.value)}
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                <option value="">Select a season</option>
                {selectedSeries.seasons.map((existingSeason) => (
                  <option key={existingSeason.id} value={existingSeason.seasonLabel}>
                    {existingSeason.seasonLabel}
                  </option>
                ))}
                <option value={CREATE_NEW_SEASON_OPTION_VALUE}>New season…</option>
              </select>
              <Image
                src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
          ) : (
            <input
              id="anime-season-label"
              type="text"
              value={episodeDetails.seasonLabel}
              onChange={(event) => onEpisodeDetailsChange({ seasonLabel: event.target.value })}
              placeholder="e.g. Season 3"
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-episode-number" className="text-sm font-medium text-foreground">
            Episode number
          </label>
          <input
            id="anime-episode-number"
            type="number"
            min={1}
            value={episodeDetails.episodeNumber}
            onChange={(event) => onEpisodeDetailsChange({ episodeNumber: event.target.value })}
            placeholder="e.g. 4"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-episode-title" className="text-sm font-medium text-foreground">
            Episode title
          </label>
          <input
            id="anime-episode-title"
            type="text"
            value={episodeDetails.episodeTitle}
            onChange={(event) => onEpisodeDetailsChange({ episodeTitle: event.target.value })}
            placeholder="Per-episode title, separate from the series"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-release-day" className="text-sm font-medium text-foreground">
            Release schedule
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <select
                id="anime-release-day"
                value={episodeDetails.releaseScheduleDay}
                onChange={(event) =>
                  onEpisodeDetailsChange({ releaseScheduleDay: event.target.value })
                }
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                {WEEKDAY_OPTIONS.map((weekday) => (
                  <option key={weekday} value={weekday}>
                    {weekday}
                  </option>
                ))}
              </select>
              <Image
                src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
              />
            </div>
            <input
              type="time"
              aria-label="Release time"
              value={episodeDetails.releaseScheduleTime}
              onChange={(event) =>
                onEpisodeDetailsChange({ releaseScheduleTime: event.target.value })
              }
              className="h-12 w-28 shrink-0 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
            />
          </div>
          <p className="text-xs text-muted-foreground">e.g. new episode every Friday 18:00</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="anime-premiere-date" className="text-sm font-medium text-foreground">
            Premiere / simulcast date
          </label>
          <input
            id="anime-premiere-date"
            type="date"
            value={episodeDetails.premiereDate}
            onChange={(event) => onEpisodeDetailsChange({ premiereDate: event.target.value })}
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Sub / dub</span>
        <div className="flex flex-wrap items-center gap-2">
          {(["subbed", "dubbed"] as const).map((audioModeOption) => (
            <button
              key={audioModeOption}
              type="button"
              onClick={() => onEpisodeDetailsChange({ audioMode: audioModeOption })}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                episodeDetails.audioMode === audioModeOption
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {audioModeOption}
            </button>
          ))}
          <div className="relative">
            <select
              aria-label="Audio language"
              value={episodeDetails.audioLanguage}
              onChange={(event) => onEpisodeDetailsChange({ audioLanguage: event.target.value })}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-border bg-transparent pr-10 pl-3 text-sm outline-none focus:border-[#1DBDC5]"
            >
              {AUDIO_LANGUAGE_OPTIONS.map((languageOption) => (
                <option key={languageOption} value={languageOption}>
                  {languageOption}
                </option>
              ))}
            </select>
            <Image
              src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Age rating</span>
        <div className="flex flex-wrap gap-2">
          {AGE_RATING_OPTIONS.map((ageRatingOption) => (
            <button
              key={ageRatingOption}
              type="button"
              onClick={() => onEpisodeDetailsChange({ ageRating: ageRatingOption })}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                episodeDetails.ageRating === ageRatingOption
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {ageRatingOption}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Anime rating — separate from the made-for-kids toggle above.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Genre tags</span>
        <div className="flex flex-wrap gap-2">
          {ANIME_GENRE_OPTIONS.map((genreOption) => (
            <button
              key={genreOption}
              type="button"
              onClick={() => handleGenreTagToggle(genreOption)}
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                episodeDetails.genreTags.includes(genreOption)
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {genreOption}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
