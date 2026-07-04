"use client";

import { useState } from "react";
import { StudioSeries } from "@/state/studio-videos-context";

// Create/edit modal for an anime series' metadata. Seasons and episodes are
// managed on the series detail page, not here. Poster upload is a static
// placeholder until the backend arrives (UI phase).
const SERIES_GENRE_OPTIONS = [
  "Action",
  "Romance",
  "Isekai",
  "Slice of life",
  "Sports",
  "Mecha",
  "Sci-fi",
  "Drama",
];

type SeriesEditorModalProps = {
  seriesToEdit?: StudioSeries;
  onSave: (savedFields: Pick<StudioSeries, "title" | "description" | "genreTags">) => void;
  onCancel: () => void;
};

export default function SeriesEditorModal({
  seriesToEdit,
  onSave,
  onCancel,
}: SeriesEditorModalProps) {
  const [seriesTitle, setSeriesTitle] = useState(seriesToEdit?.title ?? "");
  const [seriesDescription, setSeriesDescription] = useState(seriesToEdit?.description ?? "");
  const [selectedGenreTags, setSelectedGenreTags] = useState<string[]>(
    seriesToEdit?.genreTags ?? [],
  );

  const isSaveDisabled = seriesTitle.trim() === "";

  function handleGenreTagToggle(genreTag: string) {
    setSelectedGenreTags((previousTags) =>
      previousTags.includes(genreTag)
        ? previousTags.filter((selectedTag) => selectedTag !== genreTag)
        : [...previousTags, genreTag],
    );
  }

  function handleSaveClick() {
    if (isSaveDisabled) return;
    onSave({
      title: seriesTitle.trim(),
      description: seriesDescription.trim(),
      genreTags: selectedGenreTags,
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cancel editing series"
        onClick={onCancel}
        className="fixed inset-0 z-80 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-90 mx-auto flex max-h-[80dvh] w-auto max-w-sm -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-black/10 bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
          {seriesToEdit ? "Edit series" : "Create a new series"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="series-editor-title" className="text-sm font-medium text-foreground">
              Title (required)
            </label>
            <input
              id="series-editor-title"
              type="text"
              value={seriesTitle}
              onChange={(event) => setSeriesTitle(event.target.value)}
              placeholder="Series title"
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="series-editor-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="series-editor-description"
              value={seriesDescription}
              onChange={(event) => setSeriesDescription(event.target.value)}
              placeholder="What is this series about?"
              rows={3}
              className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Poster</span>
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Poster upload coming soon</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Genre tags</span>
            <div className="flex flex-wrap gap-2">
              {SERIES_GENRE_OPTIONS.map((genreOption) => (
                <button
                  key={genreOption}
                  type="button"
                  onClick={() => handleGenreTagToggle(genreOption)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    selectedGenreTags.includes(genreOption)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {genreOption}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaveDisabled}
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            {seriesToEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
