"use client";

import { useRef, useState } from "react";

import Image from "next/image";

import type { PublicSeries } from "@/lib/series/schemas";

// TRANSPORT: props-only — collects the fields; the caller owns the mutation.
//
// Create/edit modal for an anime series' metadata. Seasons and episodes are managed on the
// series detail page, not here.
//
// THE POSTER CONTROL IS REAL NOW, and it is the one control here that does NOT wait for Save.
// `POST`/`DELETE /series/:seriesId/poster` act on a row that already exists, so a picked file
// uploads immediately and the modal shows the server's answer — unlike title, description and
// genre tags, which this component only collects and hands to `onSave`.
//
// WHICH IS WHY IT IS EDIT-ONLY. A series being CREATED has no id to upload against, so the
// control renders a note telling the creator to save first rather than a picker that would 404.
// The alternative — holding the file in state and uploading after create — would mean a save
// that half-succeeds, and there is no way to report that honestly in one button.
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
  seriesToEdit?: PublicSeries;
  onSave: (savedFields: {
    readonly title: string;
    readonly description: string;
    readonly genreTags: string[];
  }) => void;
  onCancel: () => void;
  isSavePending?: boolean;
  saveErrorMessage?: string | null;
  /**
   * The poster trio, and all three are optional together — a caller in CREATE mode has no series
   * id to upload against and passes none of them, which is what makes the control render its
   * "save first" note instead of a picker.
   */
  onPosterSelect?: (imageFile: File) => void;
  onPosterRemove?: () => void;
  isPosterPending?: boolean;
  posterErrorMessage?: string | null;
};

export default function SeriesEditorModal({
  seriesToEdit,
  onSave,
  onCancel,
  isSavePending = false,
  saveErrorMessage = null,
  onPosterSelect,
  onPosterRemove,
  isPosterPending = false,
  posterErrorMessage = null,
}: SeriesEditorModalProps) {
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [seriesTitle, setSeriesTitle] = useState(seriesToEdit?.title ?? "");
  const [seriesDescription, setSeriesDescription] = useState(seriesToEdit?.description ?? "");
  const [selectedGenreTags, setSelectedGenreTags] = useState<string[]>([
    ...(seriesToEdit?.genreTags ?? []),
  ]);

  const isSaveDisabled = seriesTitle.trim() === "" || isSavePending;

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
            {onPosterSelect === undefined ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border px-4">
                <p className="text-center text-sm text-muted-foreground">
                  Save the series first, then add a poster.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                {/*
                  PORTRAIT, 2:3 — the shape the server re-encodes to and the shape a catalogue
                  tile renders. A square preview here would show the creator a crop that is not
                  what the store will show.
                */}
                <div className="relative aspect-2/3 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  {seriesToEdit?.posterUrl != null && (
                    <Image
                      src={seriesToEdit.posterUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => {
                      const pickedFile = event.target.files?.[0];
                      // CLEARED IMMEDIATELY, so picking the SAME file twice fires `change`
                      // again. Without this a failed upload cannot be retried with the file
                      // that failed, which is the one a creator reaches for first.
                      event.target.value = "";
                      if (pickedFile) onPosterSelect(pickedFile);
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isPosterPending}
                      onClick={() => posterInputRef.current?.click()}
                      className="cursor-pointer rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPosterPending
                        ? "Uploading…"
                        : seriesToEdit?.posterUrl == null
                          ? "Upload poster"
                          : "Replace poster"}
                    </button>
                    {seriesToEdit?.posterUrl != null && onPosterRemove !== undefined && (
                      <button
                        type="button"
                        disabled={isPosterPending}
                        onClick={onPosterRemove}
                        className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {/*
                    THE LIMITS ARE STATED, NOT DISCOVERED. Every one is enforced server-side, and
                    a creator finding out about the 5 MB cap from a 413 has already waited for the
                    upload.
                  */}
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG or WebP up to 5 MB, at least 64×64. Portrait works best.
                  </p>
                  {posterErrorMessage !== null && (
                    <p className="text-xs text-destructive">{posterErrorMessage}</p>
                  )}
                </div>
              </div>
            )}
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

        {saveErrorMessage !== null && (
          <p role="alert" className="mt-4 text-xs text-destructive">
            {saveErrorMessage}
          </p>
        )}

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
            {isSavePending ? "Saving…" : seriesToEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}
