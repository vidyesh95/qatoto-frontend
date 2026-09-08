// TRANSPORT: props-only — an in-page command channel between a step list and a video player.
// Nothing here fetches.

"use client";

import { createContext, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";

/**
 * What a walkthrough player can be told to do. ONE METHOD, deliberately — nothing renders playback
 * position, and a handle method with no caller is a claim the component has to keep working for
 * nobody.
 */
export interface WalkthroughPlayerHandle {
  /**
   * Plays from `positionSeconds`, mounting the player first if the poster is still up. Idempotent
   * in the sense that matters: calling it twice with the same number seeks twice.
   */
  readonly seekToSeconds: (positionSeconds: number) => void;
}

export interface WalkthroughSeekChannel {
  /** The video block registers into this. One player per provider. */
  readonly playerRef: RefObject<WalkthroughPlayerHandle | null>;
  /** A no-op when no player is mounted — a seek is an enhancement, never a claim. */
  readonly requestSeekToSeconds: (positionSeconds: number) => void;
}

/**
 * WHY CONTEXT AND NOT A PROP. The step list and the walkthrough sit in different subtrees whose
 * only common ancestor is `teardown-detail-page.tsx` — an async SERVER component. It creates both
 * elements, so a client wrapper placed around them receives them as opaque `children` and cannot
 * inject a callback into either. Context is the only mechanism that reaches sideways into a
 * server-created sibling, and it does it without making those siblings client components: they
 * render on the server and pass through as `ReactNode`, exactly as `specificationsSlot` already
 * does on that page.
 *
 * WHY A REF AND NOT A STORE. `explosion-store.ts` exists because the thing it commands lives
 * inside `<Canvas>`, in R3F's separate reconciler, where a ref cannot be threaded out — so a
 * command has to become a snapshot the rig reacts to, which is why `CameraCommand` needs a
 * monotonic `requestToken` to defeat snapshot de-duplication. A video is an ordinary DOM component
 * in the same reconciler. It can expose a method. Doing this with a store would mean inventing
 * that token again, subscribing the player so every seek re-renders it, and adding a second
 * concept named almost the same as the first. This provider holds no state, so a step click
 * re-renders nothing at all.
 *
 * The day something needs playback position flowing BACK — highlighting the step currently
 * playing — a store becomes the right answer. It is not needed for a one-way command.
 */
const WalkthroughSeekContext = createContext<WalkthroughSeekChannel | null>(null);

export function WalkthroughSeekProvider({ children }: { readonly children: ReactNode }) {
  const playerRef = useRef<WalkthroughPlayerHandle | null>(null);

  const channel = useMemo<WalkthroughSeekChannel>(
    () => ({
      playerRef,
      requestSeekToSeconds(positionSeconds) {
        playerRef.current?.seekToSeconds(positionSeconds);
      },
    }),
    [],
  );

  return <WalkthroughSeekContext value={channel}>{children}</WalkthroughSeekContext>;
}

/**
 * `null` outside a provider, and that is NOT an oversight to replace with a throw. The showcase
 * detail page renders the same video block with no step list anywhere near it, and a step list is
 * independently renderable by design — its `store` prop is nullable for the same reason. Absent a
 * channel a timestamp stays plain text, which is truthful; a throw would make a page fail over a
 * missing enhancement.
 */
export function useWalkthroughSeek(): WalkthroughSeekChannel | null {
  return useContext(WalkthroughSeekContext);
}
