"use client";

// TRANSPORT: client-query — `GET /playlists/mine?videoId=`, `PUT`/`DELETE
// /playlists/:playlistId/videos/:videoId`.
//
// A SECOND PICKER RATHER THAN A REUSE OF `studio/upload/playlists-picker.tsx`, and the two
// are not the same control wearing different clothes:
//
//   THAT ONE is fully controlled and writes nothing. It hands `selectedPlaylistIds` up to
//   `upload-modal`, which sends them once at save time — correct there, because the video
//   does not exist yet and there is nothing to add it to.
//
//   THIS ONE writes per toggle against a video that already exists, and reads its own
//   checked state from the server. Bolting that onto the other would mean one component
//   with a "does it write?" flag deciding between two different data flows.
//
// What IS shared is the row markup — a `<span>` fake checkbox inside a `<button>` — because
// `src/components/ui/` has no multi-select component and every surface hand-rolls one.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useMyPlaylistsQuery, useTogglePlaylistVideoMutation } from "@/hooks/playlists";
import { describeEngagementError } from "@/hooks/feed/mutations";

/** One page is the whole list for anyone picking by hand; see the note on the query below. */
const PLAYLIST_PAGE_LIMIT = 100;

type SaveToPlaylistSheetProps = {
  /** The video being filed. Never empty — the caller branches before rendering this. */
  readonly videoId: string;
  /** Called when the sheet should close — backdrop, Escape, or Done. */
  readonly onClose: () => void;
};

export default function SaveToPlaylistSheet({ videoId, onClose }: SaveToPlaylistSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // `videoId` IS PASSED TO THE READ, which is what makes every row arrive knowing whether it
  // already holds this video. Without it the sheet would open with every box unchecked and
  // then have to ask once per playlist.
  //
  // ONE PAGE, NO PAGINATION. `limit: 100` matches the backend's cap, and a person curating
  // playlists by hand does not have more than that; a viewer who does can still use the
  // studio. Paginating a picker means the checked state a viewer is looking for might be on
  // a page they have to go and find.
  const myPlaylistsQuery = useMyPlaylistsQuery({ limit: PLAYLIST_PAGE_LIMIT, videoId });
  const togglePlaylistVideoMutation = useTogglePlaylistVideoMutation();

  // Which row is mid-flight, so only that row shows it. `null` when nothing is.
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(null);

  // Escape and outside-press, matching `share-sheet.tsx`. Scroll is locked only under the
  // bottom-sheet breakpoint — locking the page behind a desktop popover is wrong.
  useEffect(() => {
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") onClose();
    };
    const handlePressOutside = (mouseEvent: MouseEvent) => {
      const pressedNode = mouseEvent.target;
      if (
        pressedNode instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(pressedNode)
      ) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePressOutside);

    const isSheetViewport = !window.matchMedia("(min-width: 640px)").matches;
    const previousBodyOverflow = document.body.style.overflow;
    if (isSheetViewport) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePressOutside);
      if (isSheetViewport) document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose]);

  const handlePlaylistToggle = (playlistId: string, isCurrentlyIn: boolean) => {
    setPendingPlaylistId(playlistId);
    togglePlaylistVideoMutation.mutate(
      { playlistId, videoId, shouldBeInPlaylist: !isCurrentlyIn },
      {
        // The tick is NOT flipped here. `useTogglePlaylistVideoMutation` marks the list stale
        // and the refetch carries the server's own `containsVideo` — so the checkbox is the
        // backend's answer rather than this component's guess about it.
        onSettled: () => setPendingPlaylistId(null),
      },
    );
  };

  const refusal =
    togglePlaylistVideoMutation.error === null
      ? null
      : describeEngagementError(togglePlaylistVideoMutation.error);

  return (
    <>
      {/* Backdrop — bottom-sheet viewport only. */}
      <button
        type="button"
        aria-label="Close save to playlist"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
      />

      <div
        ref={panelRef}
        // No `role="dialog"`: `share-sheet.tsx` labels its panel the same way and the lint
        // rule wants a real <dialog> element, which would bring its own focus-trap and
        // top-layer behaviour that this popover does not want.
        aria-label="Save to playlist"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-1 sm:w-72 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:pb-0 sm:shadow-lg"
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Save to playlist</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{renderPlaylistRows()}</div>

        {refusal !== null && (
          <p role="alert" className="shrink-0 px-4 py-2 text-xs text-red-700">
            {refusal.message}
          </p>
        )}
      </div>
    </>
  );

  function renderPlaylistRows() {
    if (myPlaylistsQuery.isPending) {
      return <p className="px-4 py-6 text-sm text-muted-foreground">Loading your playlists…</p>;
    }

    if (myPlaylistsQuery.isError) {
      // The refusal is shown rather than an empty list, for the reason the admin api file
      // states about its own queue: "nothing here" and "we could not ask" are different
      // answers, and a signed-out viewer meeting the first one has nothing to act on.
      return (
        <p role="alert" className="px-4 py-6 text-sm text-red-700">
          {describeEngagementError(myPlaylistsQuery.error).message}
        </p>
      );
    }

    if (myPlaylistsQuery.data.rows.length === 0) {
      return (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No playlists yet. Create one in your library, then save videos to it from here.
        </p>
      );
    }

    return (
      <ul>
        {myPlaylistsQuery.data.rows.map((playlist) => {
          // `?? false` covers only the impossible case of a row arriving without the key —
          // the query always sends `videoId`, so the backend always answers it. It is here
          // so a contract change degrades to "unchecked" rather than to `undefined`.
          const isInPlaylist = playlist.containsVideo ?? false;
          const isRowPending = pendingPlaylistId === playlist.id;
          return (
            <li key={playlist.id}>
              <button
                type="button"
                // `aria-pressed`, not `role="checkbox"` — a checkbox role on a <button>
                // makes the rule ask for an <input>, and a toggle button is what this is.
                aria-pressed={isInPlaylist}
                disabled={isRowPending}
                onClick={() => handlePlaylistToggle(playlist.id, isInPlaylist)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                    isInPlaylist ? "border-foreground bg-foreground" : "border-border"
                  }`}
                >
                  {isInPlaylist && (
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
                  {isRowPending ? "Saving…" : playlist.visibility}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }
}
