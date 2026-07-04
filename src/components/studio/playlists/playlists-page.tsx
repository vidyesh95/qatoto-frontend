"use client";

import Image from "next/image";
import { useState } from "react";
import {
  StudioPlaylist,
  StudioPlaylistVisibility,
  useStudioVideos,
} from "@/state/studio-videos-context";
import CreatePlaylistModal from "@/components/studio/upload/create-playlist-modal";

// Creator-facing playlist manager (UI phase — mock data only). Playlists are
// simple flat curation lists — anime seasons/episodes live in /studio/series.
export default function PlaylistsPage() {
  const { playlists, videos, addPlaylist, updatePlaylist, deletePlaylist } = useStudioVideos();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistBeingEdited, setPlaylistBeingEdited] = useState<StudioPlaylist | null>(null);
  const [titlePendingDeletion, setTitlePendingDeletion] = useState<string | null>(null);

  function countVideosInPlaylist(playlistTitle: string) {
    return videos.filter((video) => video.selectedPlaylistTitles.includes(playlistTitle)).length;
  }

  function handleDeleteClick(playlistTitle: string) {
    if (titlePendingDeletion !== playlistTitle) {
      setTitlePendingDeletion(playlistTitle);
      return;
    }
    deletePlaylist(playlistTitle);
    setTitlePendingDeletion(null);
  }

  const newPlaylistButton = (
    <button
      type="button"
      onClick={() => setIsCreateModalOpen(true)}
      className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
    >
      <Image
        src="/icons/playlist_add_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={20}
        height={20}
      />
      New playlist
    </button>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated collections of your videos. Viewers can play them in order.
          </p>
        </div>
        {newPlaylistButton}
      </div>

      {playlists.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No playlists yet</p>
          {newPlaylistButton}
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {playlists.map((playlist) => (
            <PlaylistRow
              key={playlist.title}
              playlist={playlist}
              videoCount={countVideosInPlaylist(playlist.title)}
              isDeletePending={titlePendingDeletion === playlist.title}
              onEditClick={() => setPlaylistBeingEdited(playlist)}
              onDeleteClick={() => handleDeleteClick(playlist.title)}
              onDeleteBlur={() => setTitlePendingDeletion(null)}
            />
          ))}
        </ul>
      )}

      {isCreateModalOpen && (
        <CreatePlaylistModal
          onCreate={(createdPlaylist) => {
            addPlaylist(createdPlaylist);
            setIsCreateModalOpen(false);
          }}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      )}

      {playlistBeingEdited && (
        <CreatePlaylistModal
          key={playlistBeingEdited.title}
          playlistToEdit={playlistBeingEdited}
          onCreate={(updatedPlaylist) => {
            updatePlaylist(playlistBeingEdited.title, updatedPlaylist);
            setPlaylistBeingEdited(null);
          }}
          onCancel={() => setPlaylistBeingEdited(null)}
        />
      )}
    </div>
  );
}

type PlaylistRowProps = {
  playlist: StudioPlaylist;
  videoCount: number;
  isDeletePending: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onDeleteBlur: () => void;
};

const VISIBILITY_BADGE_STYLES: Record<StudioPlaylistVisibility, string> = {
  public: "bg-primary text-primary-foreground",
  unlisted: "border border-border text-muted-foreground",
  private: "border border-border text-muted-foreground",
};

function PlaylistRow({
  playlist,
  videoCount,
  isDeletePending,
  onEditClick,
  onDeleteClick,
  onDeleteBlur,
}: PlaylistRowProps) {
  const videoCountLabel = videoCount === 1 ? "1 video" : `${videoCount} videos`;

  return (
    <li className="flex items-center gap-4 rounded-xl border border-border px-4 py-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Image
          src="/icons/playlist_play_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{playlist.title}</p>
        <p className="text-xs text-muted-foreground">{videoCountLabel}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${VISIBILITY_BADGE_STYLES[playlist.visibility]}`}
        >
          {playlist.visibility}
        </span>
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDeleteClick}
          onBlur={onDeleteBlur}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            isDeletePending
              ? "bg-destructive/10 text-destructive"
              : "border border-border text-muted-foreground hover:text-destructive"
          }`}
        >
          {isDeletePending ? "Confirm delete" : "Delete"}
        </button>
      </div>
    </li>
  );
}
