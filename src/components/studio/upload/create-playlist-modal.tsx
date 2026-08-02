"use client";

// TRANSPORT: client-query — `POST /playlists` on create, `PATCH /playlists/:playlistId` on edit.
//
// ALL FIVE FIELDS NOW PERSIST. The mock kept only title and visibility and dropped description,
// default order and language on the floor; the API takes all five, so the form no longer
// collects things it silently discards.
//
// `defaultVideoOrder` is a pgEnum label sent verbatim — `date_published_newest`, snake_case.
// The mock offered human strings ("Date published (newest)", "Most popular") as the VALUE, and
// "Most popular" is not an option the backend has at all.

import Image from "next/image";
import { useState } from "react";

import { useCreatePlaylistMutation, useUpdatePlaylistMutation } from "@/hooks/playlists";
import { ApiRequestError } from "@/lib/http";
import {
  PLAYLIST_VIDEO_ORDERS,
  PLAYLIST_VISIBILITIES,
  type PlaylistVideoOrder,
  type PlaylistVisibility,
  type PublicPlaylist,
} from "@/lib/playlists/schemas";

type CreatePlaylistModalProps = {
  /** Present in edit mode — the playlist whose id the PATCH targets. */
  playlistToEdit?: PublicPlaylist;
  /** Receives the SERVER's playlist, id included, so callers can select it immediately. */
  onCreated: (playlist: PublicPlaylist) => void;
  onCancel: () => void;
};

/** Display labels, index-aligned with `PLAYLIST_VIDEO_ORDERS`. Wire value != label. */
const PLAYLIST_ORDER_LABELS = [
  "Date published (newest)",
  "Date published (oldest)",
  "Date added (newest)",
  "Date added (oldest)",
  "Manual",
] as const;

const PLAYLIST_LANGUAGE_OPTIONS = ["English", "Hindi", "Japanese", "Spanish", "German"];

export default function CreatePlaylistModal({
  playlistToEdit,
  onCreated,
  onCancel,
}: CreatePlaylistModalProps) {
  const [playlistTitle, setPlaylistTitle] = useState(playlistToEdit?.title ?? "");
  const [playlistDescription, setPlaylistDescription] = useState(playlistToEdit?.description ?? "");
  const [playlistVisibility, setPlaylistVisibility] = useState<PlaylistVisibility>(
    playlistToEdit?.visibility ?? "public",
  );
  const [defaultVideoOrder, setDefaultVideoOrder] = useState<PlaylistVideoOrder>(
    playlistToEdit?.defaultVideoOrder ?? "date_published_newest",
  );
  const [playlistLanguage, setPlaylistLanguage] = useState(
    playlistToEdit?.language ?? PLAYLIST_LANGUAGE_OPTIONS[0],
  );
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const createPlaylistMutation = useCreatePlaylistMutation();
  const updatePlaylistMutation = useUpdatePlaylistMutation();
  const isSaving = createPlaylistMutation.isPending || updatePlaylistMutation.isPending;
  const isCreateDisabled = playlistTitle.trim() === "" || isSaving;

  async function handleCreateClick() {
    if (isCreateDisabled) return;
    setSaveErrorMessage(null);

    const input = {
      title: playlistTitle.trim(),
      description: playlistDescription.trim(),
      visibility: playlistVisibility,
      defaultVideoOrder,
      language: playlistLanguage,
    };

    try {
      const savedPlaylist =
        playlistToEdit === undefined
          ? await createPlaylistMutation.mutateAsync(input)
          : await updatePlaylistMutation.mutateAsync({
              playlistId: playlistToEdit.id,
              input,
            });
      onCreated(savedPlaylist);
    } catch (error) {
      setSaveErrorMessage(
        error instanceof ApiRequestError
          ? error.apiError.message
          : "Couldn't save this playlist. Please try again.",
      );
    }
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
              {PLAYLIST_VISIBILITIES.map((visibilityOption) => (
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

          {/* The <option> VALUE is the wire enum label; the visible text is the display label. */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-playlist-order" className="text-sm font-medium text-foreground">
              Default video order
            </label>
            <div className="relative">
              <select
                id="new-playlist-order"
                value={defaultVideoOrder}
                onChange={(event) => {
                  // NARROWED, not asserted (CLAUDE.md Pattern 2 — no `as` on a value the DOM
                  // hands back as a plain string). An unrecognized order would reach the
                  // backend's `.strict()` schema as a 422 rather than being ignored.
                  const selectedOrder = PLAYLIST_VIDEO_ORDERS.find(
                    (orderValue) => orderValue === event.target.value,
                  );
                  if (selectedOrder !== undefined) setDefaultVideoOrder(selectedOrder);
                }}
                className="h-12 w-full cursor-pointer appearance-none rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                {PLAYLIST_VIDEO_ORDERS.map((orderValue, orderIndex) => (
                  <option key={orderValue} value={orderValue}>
                    {PLAYLIST_ORDER_LABELS[orderIndex]}
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

          <SelectField
            fieldId="new-playlist-language"
            label="Language (title & description)"
            value={playlistLanguage}
            options={PLAYLIST_LANGUAGE_OPTIONS}
            onValueChange={setPlaylistLanguage}
          />
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
            onClick={() => void handleCreateClick()}
            disabled={isCreateDisabled}
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-40"
          >
            {isSaving ? "Saving…" : playlistToEdit ? "Save" : "Create"}
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
