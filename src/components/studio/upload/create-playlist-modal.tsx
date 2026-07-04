"use client";

import Image from "next/image";
import { useState } from "react";
import { StudioPlaylist, StudioPlaylistVisibility } from "@/state/studio-videos-context";

// "Create a new playlist" modal, layered above the playlists picker. Only
// title + visibility persist on the mock playlist record for now; the other
// fields exist per the spec and will matter once the backend arrives.
// Passing playlistToEdit switches the modal to edit mode (used by
// /studio/playlists); onCreate then receives the updated playlist.
type CreatePlaylistModalProps = {
  playlistToEdit?: StudioPlaylist;
  onCreate: (playlist: StudioPlaylist) => void;
  onCancel: () => void;
};

const PLAYLIST_VISIBILITY_OPTIONS: StudioPlaylistVisibility[] = ["public", "unlisted", "private"];
const PLAYLIST_ORDER_OPTIONS = [
  "Date published (newest)",
  "Date published (oldest)",
  "Most popular",
  "Manual",
];
const PLAYLIST_LANGUAGE_OPTIONS = ["English", "Hindi", "Japanese", "Spanish", "German"];

export default function CreatePlaylistModal({
  playlistToEdit,
  onCreate,
  onCancel,
}: CreatePlaylistModalProps) {
  const [playlistTitle, setPlaylistTitle] = useState(playlistToEdit?.title ?? "");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistVisibility, setPlaylistVisibility] = useState<StudioPlaylistVisibility>(
    playlistToEdit?.visibility ?? "public",
  );
  const [defaultVideoOrder, setDefaultVideoOrder] = useState(PLAYLIST_ORDER_OPTIONS[0]);
  const [playlistLanguage, setPlaylistLanguage] = useState(PLAYLIST_LANGUAGE_OPTIONS[0]);

  const isCreateDisabled = playlistTitle.trim() === "";

  function handleCreateClick() {
    if (isCreateDisabled) return;
    onCreate({ title: playlistTitle.trim(), visibility: playlistVisibility });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cancel creating playlist"
        onClick={onCancel}
        className="fixed inset-0 z-80 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-90 mx-auto flex max-h-[80dvh] w-auto max-w-sm -translate-y-1/2 flex-col overflow-y-auto rounded-2xl border border-black/10 bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-foreground">
          {playlistToEdit ? "Edit playlist" : "Create a new playlist"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-playlist-title" className="text-sm font-medium text-foreground">
              Title (required)
            </label>
            <input
              id="new-playlist-title"
              type="text"
              value={playlistTitle}
              onChange={(event) => setPlaylistTitle(event.target.value)}
              placeholder="Add title"
              className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="new-playlist-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="new-playlist-description"
              value={playlistDescription}
              onChange={(event) => setPlaylistDescription(event.target.value)}
              placeholder="Add description"
              rows={3}
              className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Visibility</span>
            <div className="flex flex-wrap gap-2">
              {PLAYLIST_VISIBILITY_OPTIONS.map((visibilityOption) => (
                <button
                  key={visibilityOption}
                  type="button"
                  onClick={() => setPlaylistVisibility(visibilityOption)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    playlistVisibility === visibilityOption
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {visibilityOption}
                </button>
              ))}
            </div>
          </div>

          <SelectField
            fieldId="new-playlist-order"
            label="Default video order"
            value={defaultVideoOrder}
            options={PLAYLIST_ORDER_OPTIONS}
            onValueChange={setDefaultVideoOrder}
          />

          <SelectField
            fieldId="new-playlist-language"
            label="Language (title & description)"
            value={playlistLanguage}
            options={PLAYLIST_LANGUAGE_OPTIONS}
            onValueChange={setPlaylistLanguage}
          />
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
            onClick={handleCreateClick}
            disabled={isCreateDisabled}
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            {playlistToEdit ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </>
  );
}

type SelectFieldProps = {
  fieldId: string;
  label: string;
  value: string;
  options: string[];
  onValueChange: (value: string) => void;
};

function SelectField({ fieldId, label, value, options, onValueChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
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
  );
}
