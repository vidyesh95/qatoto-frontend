"use client";

import { type RefObject, useEffect, useState } from "react";

/**
 * `true` once the element has come within `rootMarginPx` of the viewport, and stays `true`.
 *
 * ONE-SHOT ON PURPOSE. This gates a download (an engine chunk, a model), and a download that
 * started should not be cancelled because the reader scrolled past — it would only be requested
 * again on the way back. A browser without `IntersectionObserver` is treated as "near", so the
 * gate can only ever delay work, never withhold it.
 *
 * `false` on the server and on the first client render, so the gated placeholder is identical on
 * both sides and hydration has nothing to disagree about.
 */
export function useIsNearViewport(
  targetRef: RefObject<HTMLElement | null>,
  rootMarginPx: number,
): boolean {
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (target === null || isNearViewport) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      // Next frame rather than synchronously, so the effect does not cascade a render on itself.
      const frameHandle = requestAnimationFrame(() => setIsNearViewport(true));
      return () => cancelAnimationFrame(frameHandle);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${rootMarginPx}px 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetRef, rootMarginPx, isNearViewport]);

  return isNearViewport;
}
