"use client";

// WHETHER THE RENDER HAPPENING RIGHT NOW IS THE ONE HYDRATION COMPARES AGAINST.
//
// THE BUG THIS EXISTS TO CLOSE is the sibling of the one in `use-viewer-signed-in.ts`: a client
// island whose render reads a store that RESOLVED WHILE THE PAGE WAS STILL STREAMING. Under
// `cacheComponents` the layout's shell hydrates long before a slow page's HTML arrives, so a query
// fired from the navbar can be sitting in the cache — answered — by the time the page's islands
// hydrate. Those islands then render a value the streamed HTML does not contain, and React discards
// the whole subtree.
//
// The fix is to make the FIRST client render replay the server's, then let the live value win on the
// render after. `useSyncExternalStore` is what makes that exact: React uses `getServerSnapshot` for
// both the SSR render and the hydration render, notices the two snapshots disagree once hydration
// commits, and schedules a re-render. There is no effect to miss and no window where a stale answer
// is painted twice.
//
// USE IT TO ALIGN A RENDER, NEVER TO GATE BEHAVIOUR. An event handler already runs after hydration,
// so nothing in one needs this. A component that returns `null` until hydrated is not using this
// hook, it is disabling SSR — that is `dynamic(..., { ssr: false })` and it should say so.

import { useSyncExternalStore } from "react";

/** No store to watch — the value changes exactly once, when React commits hydration. */
const subscribeToNothing = () => () => {};
const getHydratedSnapshot = () => true;
const getServerSnapshot = () => false;

/** `false` during the server render and the hydration render, `true` from the next render on. */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribeToNothing, getHydratedSnapshot, getServerSnapshot);
}
