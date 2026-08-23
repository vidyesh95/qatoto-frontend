"use client";

// TRANSPORT: props-only — reads `queue-context`, which talks to no server at all.
//
// THE ONLY SURFACE A QUEUED VIDEO IS VISIBLE FROM, which is why this sits in the navbar
// rather than on the watch page: a viewer queues from a card anywhere in the app, and a
// panel that only existed on `/watch` would mean queueing something and then having to
// find a video to play in order to see what you queued.
//
// IT HIDES ITSELF WHEN THE QUEUE IS EMPTY. A permanent icon that is empty for almost every
// visitor is a permanent question ("what is that?") for no benefit — and unlike the sidebar
// rows beside it, this one has nothing to show a first-time visitor.

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useQueue } from "@/state/queue-context";

export default function QueueButton() {
  const { entries, removeFromQueue, clearQueue } = useQueue();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape and outside-press, the same shape the card menu and share sheet use. Scroll is
  // locked only under the bottom-sheet breakpoint.
  useEffect(() => {
    if (!isPanelOpen) return undefined;

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === "Escape") setIsPanelOpen(false);
    };
    const handlePressOutside = (mouseEvent: MouseEvent) => {
      const pressedNode = mouseEvent.target;
      if (
        pressedNode instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(pressedNode)
      ) {
        setIsPanelOpen(false);
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
  }, [isPanelOpen]);

  /*
   * EMPTYING THE QUEUE CLOSES THE PANEL, and it is done HERE — in the handlers that empty it
   * — rather than in an effect watching `entries.length`.
   *
   * An effect would be a setState-in-effect: a second render to reach a state the event
   * could have set directly. And the early return below is NOT enough on its own, which is
   * the trap worth naming: returning null unmounts the panel but leaves `isPanelOpen` true,
   * so the next video queued would pop the panel open by itself.
   */
  const handleClearClick = () => {
    clearQueue();
    setIsPanelOpen(false);
  };

  const handleRemoveClick = (videoId: string) => {
    removeFromQueue(videoId);
    if (entries.length === 1) setIsPanelOpen(false);
  };

  if (entries.length === 0) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        aria-label={`Queue, ${String(entries.length)} video${entries.length === 1 ? "" : "s"}`}
        aria-haspopup="menu"
        aria-expanded={isPanelOpen}
        onClick={() => setIsPanelOpen((wasOpen) => !wasOpen)}
        className="relative cursor-pointer rounded-full border border-primary bg-white p-1.75"
      >
        <Image
          src="/icons/playlist_play_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={24}
          height={24}
        />
        <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-white">
          {entries.length}
        </span>
      </button>

      {isPanelOpen && (
        <>
          <button
            type="button"
            aria-label="Close queue"
            onClick={() => setIsPanelOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          />

          <div
            role="menu"
            aria-label="Queue"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl bg-background pb-8 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:bottom-auto sm:mt-2 sm:w-80 sm:max-w-[calc(100vw-1rem)] sm:rounded-xl sm:border sm:border-border sm:pb-0"
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 flex-row items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium text-foreground">
                Queue · {entries.length} video{entries.length === 1 ? "" : "s"}
              </h2>
              <button
                type="button"
                onClick={handleClearClick}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              >
                Clear
              </button>
            </header>

            <ul className="min-h-0 flex-1 overflow-y-auto">
              {entries.map((entry) => (
                <li key={entry.videoId} className="flex flex-row items-center gap-2 px-3 py-2">
                  {/* The whole row navigates; the remove button is a sibling, not a child,
                      so a tap on it never falls through to the link. */}
                  <Link
                    href={entry.href}
                    onClick={() => setIsPanelOpen(false)}
                    className="flex min-w-0 flex-1 flex-row items-center gap-2 rounded hover:bg-muted"
                  >
                    <Image
                      src={entry.thumbnailSrc}
                      alt=""
                      width={80}
                      height={45}
                      className="aspect-video w-20 shrink-0 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-xs text-foreground">{entry.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {entry.channelName}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleRemoveClick(entry.videoId)}
                    aria-label={`Remove ${entry.title} from the queue`}
                    className="shrink-0 cursor-pointer rounded-full p-1 hover:bg-muted"
                  >
                    <Image
                      src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={18}
                      height={18}
                    />
                  </button>
                </li>
              ))}
            </ul>

            {/*
              Stated rather than hidden. The queue is deliberately not persisted — see
              `queue-context.tsx` — and a list that silently empties on refresh reads as a
              bug. One line here is the whole fix.
            */}
            <p className="shrink-0 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              Your queue is for this tab only and clears when you close it.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
