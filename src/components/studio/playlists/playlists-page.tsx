"use client";

// TRANSPORT: client-query — `GET /playlists/mine`, plus create / update / delete.
//
// TWO THINGS THE MOCK GOT WRONG AND THIS FIXES:
//
//   1. IDENTITY WAS THE TITLE. Edit, delete and the React `key` all used `playlist.title`, so
//      two playlists with the same name were indistinguishable — deleting one deleted whichever
//      the array reached first. Everything below keys on the server's id.
//   2. THE VIDEO COUNT WAS COMPUTED CLIENT-SIDE by scanning every studio video for a matching
//      playlist title. It is `videoCount` on the row now — the backend counts it in SQL, which
//      is where counting belongs (CLAUDE.md thin-client rule) and which stays correct for
//      playlists whose videos this page never loaded.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import CreatePlaylistModal from "@/components/studio/upload/create-playlist-modal";
import {
  useDeletePlaylistMutation,
  useMyPlaylistsQuery,
  usePlaylistQuery,
} from "@/hooks/playlists";
import type { PlaylistListRow, PlaylistVisibility } from "@/lib/playlists/schemas";

export default function PlaylistsPage() {
  const playlistsQuery = useMyPlaylistsQuery({ limit: 100 });
  const deletePlaylistMutation = useDeletePlaylistMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [playlistIdBeingEdited, setPlaylistIdBeingEdited] = useState<string | null>(null);
  const [playlistIdPendingDeletion, setPlaylistIdPendingDeletion] = useState<string | null>(null);

  // The edit modal needs the FULL playlist — description, order and language are not on the
  // list row — so it reads the detail only once a row is actually being edited.
  const editedPlaylistQuery = usePlaylistQuery(
    playlistIdBeingEdited ?? "",
    playlistIdBeingEdited !== null,
  );

  function handleDeleteClick(playlistId: string) {
    // Click once to arm, once to confirm. Delete is irreversible and there is no undo route.
    if (playlistIdPendingDeletion !== playlistId) {
      setPlaylistIdPendingDeletion(playlistId);
      return;
    }
    deletePlaylistMutation.mutate(playlistId);
    setPlaylistIdPendingDeletion(null);
  }

  const playlists = playlistsQuery.data?.rows ?? [];

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

      {playlistsQuery.isPending ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading your playlists…</p>
      ) : playlistsQuery.error !== null ? (
        <p className="mt-10 text-sm text-destructive">
          Couldn&rsquo;t load your playlists. Please try again.
        </p>
      ) : playlists.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No playlists yet</p>
          {newPlaylistButton}
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {playlists.map((playlist) => (
            <PlaylistRow
              key={playlist.id}
              playlist={playlist}
              isDeletePending={playlistIdPendingDeletion === playlist.id}
              onEditClick={() => setPlaylistIdBeingEdited(playlist.id)}
              onDeleteClick={() => handleDeleteClick(playlist.id)}
              onDeleteBlur={() => setPlaylistIdPendingDeletion(null)}
            />
          ))}
        </ul>
      )}

      {deletePlaylistMutation.error !== null && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Couldn&rsquo;t delete that playlist. Please try again.
        </p>
      )}

      {isCreateModalOpen && (
        <CreatePlaylistModal
          onCreated={() => setIsCreateModalOpen(false)}
          onCancel={() => setIsCreateModalOpen(false)}
        />
      )}

      {playlistIdBeingEdited !== null && editedPlaylistQuery.data !== undefined && (
        <CreatePlaylistModal
          key={playlistIdBeingEdited}
          playlistToEdit={editedPlaylistQuery.data}
          onCreated={() => setPlaylistIdBeingEdited(null)}
          onCancel={() => setPlaylistIdBeingEdited(null)}
        />
      )}
    </div>
  );
}

type PlaylistRowProps = {
  playlist: PlaylistListRow;
  isDeletePending: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  onDeleteBlur: () => void;
};

const VISIBILITY_BADGE_STYLES: Record<PlaylistVisibility, string> = {
  public: "bg-primary text-primary-foreground",
  unlisted: "border border-border text-muted-foreground",
  private: "border border-border text-muted-foreground",
};

function PlaylistRow({
  playlist,
  isDeletePending,
  onEditClick,
  onDeleteClick,
  onDeleteBlur,
}: PlaylistRowProps) {
  const videoCountLabel = playlist.videoCount === 1 ? "1 video" : `${playlist.videoCount} videos`;

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

      <Link href={`/studio/playlists/${playlist.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground hover:underline">
          {playlist.title}
        </p>
        <p className="text-xs text-muted-foreground">{videoCountLabel}</p>
      </Link>

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
