"use client";

// TRANSPORT: client-query — `GET /playlists/:playlistId`, and `PUT /playlists/:id/videos` to
// write the order back.
//
// THIS IS THE ONLY ROUTE THAT SETS PLAYLIST ORDER. Position comes from the ARRAY INDEX of the
// `videoIds` sent, so reordering is one full replace rather than a per-row move. Its counterpart
// `PUT /videos/:id/playlists` — used by the upload wizard — only APPENDS, and appending is why a
// creator needs somewhere to fix the order afterwards.
//
// MOVE BUTTONS, NOT DRAG. Matching the season card two directories over, and avoiding a drag
// library for a list that is usually under twenty rows. Every move is a full write, so the order
// on screen is always the order the server holds.

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { usePlaylistQuery, useReplacePlaylistVideosMutation } from "@/hooks/playlists";
import { ApiRequestError } from "@/lib/http";
import type { PlaylistVideo } from "@/lib/playlists/schemas";

export default function PlaylistDetailPage({ playlistId }: { readonly playlistId: string }) {
  const playlistQuery = usePlaylistQuery(playlistId);
  const replaceVideosMutation = useReplacePlaylistVideosMutation();

  /**
   * The order being edited, seeded from the server and re-seeded whenever the server's own list
   * changes.
   *
   * LOCAL, because a move is only meaningful against the whole list: sending one row's new index
   * is not something the route accepts. Keeping the working copy here means the arrows respond
   * instantly and the write is the settled result.
   */
  const [orderedVideos, setOrderedVideos] = useState<PlaylistVideo[]>([]);
  const [seededServerVideos, setSeededServerVideos] = useState<PlaylistVideo[] | undefined>(
    undefined,
  );
  const [writeErrorMessage, setWriteErrorMessage] = useState<string | null>(null);

  const serverVideos = playlistQuery.data?.videos;
  if (serverVideos !== undefined && serverVideos !== seededServerVideos) {
    setSeededServerVideos(serverVideos);
    setOrderedVideos([...serverVideos]);
  }

  function writeOrder(nextVideos: PlaylistVideo[]) {
    const previousVideos = orderedVideos;
    setOrderedVideos(nextVideos);
    setWriteErrorMessage(null);
    replaceVideosMutation.mutate(
      { playlistId, videoIds: nextVideos.map((video) => video.videoId) },
      {
        onError: (error) => {
          // Put the list back. A failed write that left the new order on screen would tell the
          // creator their change stuck when the server still holds the old one.
          setOrderedVideos(previousVideos);
          setWriteErrorMessage(
            error instanceof ApiRequestError
              ? error.apiError.message
              : "Couldn't save that change. Please try again.",
          );
        },
      },
    );
  }

  function handleMoveClick(videoIndex: number, direction: -1 | 1) {
    const targetIndex = videoIndex + direction;
    if (targetIndex < 0 || targetIndex >= orderedVideos.length) return;
    const nextVideos = [...orderedVideos];
    [nextVideos[videoIndex], nextVideos[targetIndex]] = [
      nextVideos[targetIndex],
      nextVideos[videoIndex],
    ];
    writeOrder(nextVideos);
  }

  function handleRemoveClick(videoId: string) {
    writeOrder(orderedVideos.filter((video) => video.videoId !== videoId));
  }

  if (playlistQuery.isPending) {
    return <div className="p-6 text-sm text-muted-foreground">Loading this playlist…</div>;
  }

  if (playlistQuery.data === undefined) {
    return (
      <div className="p-6">
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">Playlist not found</p>
          <Link
            href="/studio/playlists"
            className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Back to playlists
          </Link>
        </div>
      </div>
    );
  }

  const playlist = playlistQuery.data;

  return (
    <div className="p-6">
      <Link
        href="/studio/playlists"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← All playlists
      </Link>

      <div className="mt-4">
        <h1 className="text-2xl font-semibold text-foreground">{playlist.title}</h1>
        {playlist.description !== null && playlist.description !== "" && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{playlist.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1 font-medium capitalize">
            {playlist.visibility}
          </span>
          <span>{playlist.videoCount === 1 ? "1 video" : `${playlist.videoCount} videos`}</span>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Videos</h2>
        {replaceVideosMutation.isPending && (
          <span className="text-xs text-muted-foreground">Saving order…</span>
        )}
      </div>

      {writeErrorMessage !== null && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {writeErrorMessage}
        </p>
      )}

      {orderedVideos.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-border py-16">
          <p className="text-lg font-medium text-foreground">No videos in this playlist</p>
          {/*
            Videos are added from the VIDEO side — the upload wizard's playlist picker — because
            that is the direction `PUT /videos/:id/playlists` runs. There is no "add video" route
            on the playlist itself beyond this full replace, and offering a picker here would mean
            re-sending the whole list to append one row.
          */}
          <p className="text-sm text-muted-foreground">
            Add videos from the upload flow&rsquo;s Playlists picker, or from the menu on any video
            card — a playlist can hold anyone&rsquo;s video, not only your own.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {orderedVideos.map((video, videoIndex) => (
            <li
              key={video.videoId}
              className="flex items-center gap-4 rounded-xl border border-border px-4 py-3"
            >
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {videoIndex + 1}
              </span>
              <span className="flex aspect-video w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                {video.thumbnailUrl === null ? (
                  <Image
                    src="/icons/video_library_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                ) : (
                  <Image
                    src={video.thumbnailUrl}
                    alt=""
                    width={96}
                    height={54}
                    className="size-full object-cover"
                  />
                )}
              </span>

              <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {video.title}
              </p>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${video.title} up`}
                  onClick={() => handleMoveClick(videoIndex, -1)}
                  disabled={videoIndex === 0 || replaceVideosMutation.isPending}
                  className="cursor-pointer rounded-full p-1 transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-30"
                >
                  <Image
                    src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="rotate-180"
                  />
                </button>
                <button
                  type="button"
                  aria-label={`Move ${video.title} down`}
                  onClick={() => handleMoveClick(videoIndex, 1)}
                  disabled={
                    videoIndex === orderedVideos.length - 1 || replaceVideosMutation.isPending
                  }
                  className="cursor-pointer rounded-full p-1 transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:opacity-30"
                >
                  <Image
                    src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveClick(video.videoId)}
                  disabled={replaceVideosMutation.isPending}
                  className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
