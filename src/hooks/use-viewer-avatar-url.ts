"use client";

// THE VIEWER'S OWN AVATAR, ALIGNED ACROSS THE SERVER RENDER AND THE HYDRATION RENDER.
//
// `use-viewer-signed-in.ts` closed this bug for the BOOLEAN and stopped there. The three navbar
// clusters still read `session?.user.image` raw, so a signed-in viewer whose session atom resolved
// while the page was streaming hydrated a different `src` than the HTML carried — and React DOES
// NOT PATCH ATTRIBUTE MISMATCHES. With the atom already settled there was no later store update to
// force a re-render either, so the dummy photo stuck in the DOM PERMANENTLY: a signed-in viewer
// never saw their own avatar in the bar.
//
// `useIsHydrated()` is `false` for the server render AND the hydration render, so both emit the
// fallback and agree; the live photo wins on the render after. The server cannot do better here —
// `hasCallerSession()` reads the cookie, never the profile, and fetching one would make every
// layout render pay a backend round trip for a first paint that lasts one frame.

import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { useSession } from "@/lib/auth-client";

/** Shown before the session lands, and for a viewer who never set a photo of their own. */
export const VIEWER_AVATAR_FALLBACK_SRC = "/dummy/profile_photo_girl.avif";

/** The signed-in viewer's photo, or the fallback until the live session says otherwise. */
export function useViewerAvatarUrl(): string {
  const { data: session } = useSession();
  const isHydrated = useIsHydrated();

  if (!isHydrated) return VIEWER_AVATAR_FALLBACK_SRC;

  return session?.user.image ?? VIEWER_AVATAR_FALLBACK_SRC;
}
