"use client";

import Image from "next/image";
import { useState } from "react";
import { StudioEpisode, useStudioVideos } from "@/state/studio-videos-context";

// Add/edit modal for a single episode inside a season. An episode can attach
// one of the creator's uploaded anime videos; unattached episodes act as
// planned placeholders (UI phase — mock data only).
type EpisodeEditorModalProps = {
  episodeToEdit?: StudioEpisode;
  suggestedEpisodeNumber: number;
  onSave: (episode: StudioEpisode) => void;
  onCancel: () => void;
};

export default function EpisodeEditorModal({
  episodeToEdit,
  suggestedEpisodeNumber,
  onSave,
  onCancel,
}: EpisodeEditorModalProps) {
  const { videos } = useStudioVideos();
  const [episodeNumberInput, setEpisodeNumberInput] = useState(
    String(episodeToEdit?.episodeNumber ?? suggestedEpisodeNumber),
  );
  const [episodeTitle, setEpisodeTitle] = useState(episodeToEdit?.episodeTitle ?? "");
  const [isPremium, setIsPremium] = useState(episodeToEdit?.isPremium ?? false);
  const [attachedVideoId, setAttachedVideoId] = useState(episodeToEdit?.attachedVideoId ?? "");

  const attachableAnimeVideos = videos.filter((video) => video.videoType === "anime-episode");
  const parsedEpisodeNumber = Number.parseInt(episodeNumberInput, 10);
  const isSaveDisabled =
    episodeTitle.trim() === "" || Number.isNaN(parsedEpisodeNumber) || parsedEpisodeNumber < 1;

  function handleSaveClick() {
    if (isSaveDisabled) return;
    onSave({
      id: episodeToEdit?.id ?? crypto.randomUUID(),
      episodeNumber: parsedEpisodeNumber,
      episodeTitle: episodeTitle.trim(),
      isPremium,
      attachedVideoId: attachedVideoId === "" ? null : attachedVideoId,
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

          <div className="flex flex-col gap-1.5">
            <label htmlFor="episode-editor-video" className="text-sm font-medium text-foreground">
              Attach uploaded video
            </label>
            <div className="relative">
              <select
                id="episode-editor-video"
                value={attachedVideoId}
                onChange={(event) => setAttachedVideoId(event.target.value)}
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                <option value="">No video attached</option>
                {attachableAnimeVideos.map((animeVideo) => (
                  <option key={animeVideo.id} value={animeVideo.id}>
                    {animeVideo.title}
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
            <p className="text-xs text-muted-foreground">
              Only anime-episode uploads from My Videos appear here.
            </p>
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
            {episodeToEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </>
  );
}
