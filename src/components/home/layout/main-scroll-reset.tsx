// TRANSPORT: props-only — reads the pathname and one DOM node. No network, no state.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The id `(home)/layout.tsx` puts on its `<main>`, which is the group's scroll container.
 *
 * Exported rather than written twice: the whole point of this component is that it targets that
 * exact element, and a typo would fail silently as "scrolling just stopped resetting".
 */
export const HOME_SCROLL_CONTAINER_ID = "home-scroll-container";

/**
 * Puts the group's scroll container back to the top when the route changes.
 *
 * ⚠️ **THIS EXISTS BECAUSE `<main>` IS THE SCROLLER NOW, NOT THE DOCUMENT.** Next's App Router
 * scrolls the DOCUMENT on navigation, and the document no longer scrolls — so without this, a
 * reader half way down `/store` clicks through to a product and arrives half way down that too.
 * The behaviour is not new work; it is the behaviour the browser used to give for free.
 *
 * ⚠️ **PATHNAME ONLY, NEVER `useSearchParams`.** A filter chip changes the query string and must
 * NOT jump the reader to the top — `FilterChipRow` passes `scroll={false}` for exactly that reason,
 * because the chips someone is using are usually below the fold. Watching search params here would
 * silently undo that on every filtered surface in the group.
 *
 * `instant` rather than smooth: this is a new page, not a movement within one, and an animated
 * scroll on arrival is motion the reader did not ask for.
 */
export default function MainScrollReset() {
  const pathname = usePathname();
  /**
   * The last path actually scrolled for.
   *
   * It makes the dependency a real input rather than a bare trigger, and it earns its place: the
   * effect must fire when the ROUTE changed and at no other time, so comparing is more honest than
   * relying on how often React chooses to re-run it.
   */
  const lastResetPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastResetPathnameRef.current === pathname) return;
    lastResetPathnameRef.current = pathname;

    const scrollContainer = document.getElementById(HOME_SCROLL_CONTAINER_ID);
    // No throw and no warning when it is missing: this component is mounted by the layout beside
    // the element it looks for, so an absence means the tree is mid-transition rather than wrong.
    scrollContainer?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
