"use client";

// ONE DETERMINISTIC ANSWER TO "IS ANYONE SIGNED IN", ACROSS THE SERVER RENDER AND THE FIRST CLIENT ONE.
//
// THE BUG THIS EXISTS TO CLOSE. `useSession()` comes from `better-auth/react`, whose React adapter
// hands `useSyncExternalStore` the SAME function for `getSnapshot` and `getServerSnapshot`, reading a
// MODULE-LEVEL SINGLETON atom that starts `{ data: null, isPending: true }` and begins fetching on its
// first subscriber. The navbar subscribes it from the layout, so `GET /api/auth/get-session` is
// already in flight before a page's islands hydrate — and if it lands first, an island's hydration
// render sees `isPending: false` where the server rendered `isPending: true`.
//
// The result was seven components rendering a different tree on the client than the server sent:
// "Sign in to order a sample" appearing from nowhere, `deliver-to` swapping its whole body, and
// `storefront-contact-actions` swapping a `<button>` for an `<a>` — an ELEMENT-TYPE mismatch, which is
// why `suppressHydrationWarning` (the house pattern in `shared/relative-time.tsx`) could not have
// covered this. React discards and re-renders the whole subtree on any of them.
//
// So the server answers first. `hasCallerSession()` resolves the boolean during the server render and
// it arrives here as a prop; this hook holds that answer until the live session resolves, at which
// point the live one wins. Both renders that hydration compares therefore read the SAME value.
//
// IT IS AN INITIAL VALUE, NOT AN AUTHORITY, and the distinction is load-bearing. `hasCallerSession()`
// tests for the PRESENCE of an auth cookie — a stale or forged one passes it (`server-http.ts:65-76`
// says so). Use this to decide which prompt or affordance to paint first. NEVER use it to decide what
// a viewer is permitted to do: the live session governs that on the client, and the backend
// re-authorizes every request regardless (CLAUDE.md, "the client is hostile").

import { useSession } from "@/lib/auth-client";

/**
 * Whether a session exists, seeded from the server so the first client render matches the HTML.
 *
 * @param isViewerSignedIn what the server saw, from `hasCallerSession()`, threaded down as a prop.
 */
export function useViewerSignedIn(isViewerSignedIn: boolean): boolean {
  const { data: session, isPending } = useSession();

  // While the atom is unresolved the server's answer stands. Note this deliberately does NOT also
  // gate on `isPending` at the call sites: with a seed there is no third "we do not know" state to
  // render around, which is what removes the `!isSessionPending &&` guards that caused the mismatch.
  if (isPending) return isViewerSignedIn;

  return session !== null && session !== undefined;
}
