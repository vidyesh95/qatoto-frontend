"use client";

// The play queue — "Add to queue" from a video card's kebab menu.
//
// THE FOURTH PIECE OF CROSS-COMPONENT CLIENT STATE, beside `sidebar-context.tsx`,
// `browser-preferences-context.tsx` and `admin-audit-log-context.tsx`.
//
// CLIENT-ONLY, AND THAT IS THE DESIGN RATHER THAN A GAP. A queue is what you intend to watch
// in the next few minutes; it is not a saved collection. Bookmarks and playlists are the
// durable surfaces and both are server-backed. Giving a queue a table would mean writing a
// row for every idle tap and reconciling it across devices, for state whose whole value is
// that it is cheap and disposable.
//
// AND IT IS NOT PERSISTED, deliberately. `src/lib/browser-preferences.ts` is the ONE storage
// module in this app and `qatoto.browser-preferences` its ONE key — a fact
// `privacy-policy.tsx` states to readers and `data-and-privacy-panel.tsx` offers erasure of.
// A second key would make both of those wrong, and folding a queue into the preferences blob
// would put an ephemeral list inside the thing that survives on purpose. So the queue lives
// for the tab and dies with it, which also means there is no stored-value hydration problem
// to solve: unlike `browser-preferences-context`, the first render and the hydration render
// agree because both are empty.

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

/**
 * One queued video — everything the panel renders, carried by value.
 *
 * A SNAPSHOT, NOT AN ID TO RE-FETCH. The card already had every one of these fields when the
 * viewer queued it, so refetching would be asking the server for what we were just handed —
 * and it would turn opening the panel into N requests. The cost is that a title edited after
 * queueing shows stale until the next visit, which for a list measured in minutes is nothing.
 */
export type QueueEntry = {
  readonly videoId: string;
  readonly title: string;
  readonly thumbnailSrc: string;
  readonly channelName: string;
  /** `/watch?v=…`, already built by whoever queued it. */
  readonly href: string;
};

type QueueContextValue = {
  readonly entries: readonly QueueEntry[];
  /** Appends. A video already queued is NOT added twice — see the note in the provider. */
  readonly addToQueue: (entry: QueueEntry) => void;
  readonly removeFromQueue: (videoId: string) => void;
  readonly clearQueue: () => void;
  readonly isQueued: (videoId: string) => boolean;
};

const QueueContext = createContext<QueueContextValue | undefined>(undefined);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<readonly QueueEntry[]>([]);

  const addToQueue = useCallback((entry: QueueEntry) => {
    setEntries((currentEntries) =>
      // DEDUPED BY `videoId`. A queue holding the same video twice is a queue that plays it
      // twice, and the menu row that adds it reads as a toggle — so a second tap must not
      // silently create a duplicate the viewer then has to remove twice.
      currentEntries.some((queuedEntry) => queuedEntry.videoId === entry.videoId)
        ? currentEntries
        : [...currentEntries, entry],
    );
  }, []);

  const removeFromQueue = useCallback((videoId: string) => {
    setEntries((currentEntries) =>
      currentEntries.filter((queuedEntry) => queuedEntry.videoId !== videoId),
    );
  }, []);

  const clearQueue = useCallback(() => setEntries([]), []);

  const contextValue = useMemo<QueueContextValue>(
    () => ({
      entries,
      addToQueue,
      removeFromQueue,
      clearQueue,
      isQueued: (videoId: string) => entries.some((queuedEntry) => queuedEntry.videoId === videoId),
    }),
    [entries, addToQueue, removeFromQueue, clearQueue],
  );

  return <QueueContext.Provider value={contextValue}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const context = use(QueueContext);
  if (context === undefined) {
    throw new Error("useQueue must be used within a QueueProvider");
  }
  return context;
}
