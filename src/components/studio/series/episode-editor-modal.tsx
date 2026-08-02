"use client";

import { useState } from "react";

import type { AnimeEpisodeSummary } from "@/lib/series/schemas";

// TRANSPORT: props-only — collects the fields; `series-detail-page.tsx` owns the mutation.
//
// THE "ATTACH UPLOADED VIDEO" SELECT IS GONE, AND ITS ABSENCE IS THE POINT.
//
// The episode create/update schema has NO `videoId` field — the link between an episode and a
// video is made from the VIDEO side only, by uploading with an `anime` block that names this
// series and season. One direction, so the link cannot end up half-made with an episode
// pointing at a video that does not point back.
//
// The mock offered the select and wrote `attachedVideoId` into a local array, which looked like
// it worked and had no wire counterpart at all. Sending it now would be a 422 from a `.strict()`
// schema. Episodes still show whether a video is attached — that is `videoId` on the read.
type EpisodeEditorModalProps = {
  episodeToEdit?: AnimeEpisodeSummary;
  suggestedEpisodeNumber: number;
  isSavePending?: boolean;
  onSave: (episode: {
    readonly episodeId: string | null;
    readonly episodeNumber: number;
    readonly episodeTitle: string;
    readonly isPremium: boolean;
  }) => void;
  onCancel: () => void;
};

export default function EpisodeEditorModal({
  episodeToEdit,
  suggestedEpisodeNumber,
  isSavePending = false,
  onSave,
  onCancel,
}: EpisodeEditorModalProps) {
  const [episodeNumberInput, setEpisodeNumberInput] = useState(
    String(episodeToEdit?.episodeNumber ?? suggestedEpisodeNumber),
  );
  const [episodeTitle, setEpisodeTitle] = useState(episodeToEdit?.episodeTitle ?? "");
  const [isPremium, setIsPremium] = useState(episodeToEdit?.isPremium ?? false);

  const parsedEpisodeNumber = Number.parseInt(episodeNumberInput, 10);
  const isSaveDisabled =
    episodeTitle.trim() === "" ||
    Number.isNaN(parsedEpisodeNumber) ||
    parsedEpisodeNumber < 1 ||
    isSavePending;

  function handleSaveClick() {
    if (isSaveDisabled) return;
    onSave({
      // The SERVER mints episode ids. The mock called `crypto.randomUUID()` here, which meant
      // the id in the UI was never the id in the database.
      episodeId: episodeToEdit?.id ?? null,
      episodeNumber: parsedEpisodeNumber,
      episodeTitle: episodeTitle.trim(),
      isPremium,
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cancel editing episode"
        onClick={onCancel}
        className="fixed inset-0 z-80 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-90 mx-auto flex max-h-[80dvh] w-auto max-w-sm -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-black/10 bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
          {episodeToEdit ? "Edit episode" : "Add episode"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="episode-editor-number" className="text-sm font-medium text-foreground">
              Episode number
            </label>
            <input
              id="episode-editor-number"
              type="number"
              min={1}
              value={episodeNumberInput}
              onChange={(event) => setEpisodeNumberInput(event.target.value)}
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="episode-editor-title" className="text-sm font-medium text-foreground">
              Episode title (required)
            </label>
            <input
              id="episode-editor-title"
              type="text"
              value={episodeTitle}
              onChange={(event) => setEpisodeTitle(event.target.value)}
              placeholder="Per-episode title"
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Access</span>
            <div className="flex flex-wrap gap-2">
              {([false, true] as const).map((isPremiumOption) => (
                <button
                  key={String(isPremiumOption)}
                  type="button"
                  onClick={() => setIsPremium(isPremiumOption)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isPremium === isPremiumOption
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isPremiumOption ? "Premium" : "Free"}
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
            {isSavePending ? "Saving…" : episodeToEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </>
  );
}
