"use client";

import Image from "next/image";
import { useState } from "react";
import { useStudioVideos } from "@/state/studio-videos-context";

// Playlist picker overlay (layered above the upload modal). Multi-select over
// the creator's playlists with client-side search — fine for a short mock
// list; heavy search moves to the backend later.
type PlaylistsPickerProps = {
  selectedPlaylistTitles: string[];
  onSelectedPlaylistTitlesChange: (playlistTitles: string[]) => void;
  onRequestCreatePlaylist: () => void;
  onDone: () => void;
};

export default function PlaylistsPicker({
  selectedPlaylistTitles,
  onSelectedPlaylistTitlesChange,
  onRequestCreatePlaylist,
  onDone,
}: PlaylistsPickerProps) {
  const { playlists } = useStudioVideos();
  const [searchQuery, setSearchQuery] = useState("");

  const matchingPlaylists = playlists.filter((playlist) =>
    playlist.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  function handlePlaylistToggle(playlistTitle: string) {
    const isAlreadySelected = selectedPlaylistTitles.includes(playlistTitle);
    onSelectedPlaylistTitlesChange(
      isAlreadySelected
        ? selectedPlaylistTitles.filter((selectedTitle) => selectedTitle !== playlistTitle)
        : [...selectedPlaylistTitles, playlistTitle],
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close playlist picker"
        onClick={onDone}
        className="fixed inset-0 z-60 cursor-default bg-black/40"
      />
      <div className="fixed inset-x-4 top-1/2 z-70 mx-auto flex max-h-[70dvh] w-auto max-w-sm -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-black/10 bg-background shadow-lg">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">Please create a playlist</p>
            <button
              type="button"
              onClick={onRequestCreatePlaylist}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <Image
                src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              New playlist
            </button>
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-black/10 bg-background p-4">
              <Image
                src="/icons/search_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search for a playlist"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto py-2">
              {matchingPlaylists.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No playlists match your search
                </li>
              ) : (
                matchingPlaylists.map((playlist) => {
                  const isSelected = selectedPlaylistTitles.includes(playlist.title);
                  return (
                    <li key={playlist.title}>
                      <button
                        type="button"
                        onClick={() => handlePlaylistToggle(playlist.title)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                            isSelected ? "border-foreground bg-foreground" : "border-border"
                          }`}
                        >
                          {isSelected && (
                            <Image
                              src="/icons/check_18dp_FFFFFF_FILL1_wght400_GRAD0_opsz20.svg"
                              alt=""
                              width={14}
                              height={14}
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {playlist.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground capitalize">
                          {playlist.visibility}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="flex items-center justify-between border-t border-black/10 p-3">
              <button
                type="button"
                onClick={onRequestCreatePlaylist}
                className="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Image
                  src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={20}
                  height={20}
                />
                New playlist
              </button>
              <button
                type="button"
                onClick={onDone}
                className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
