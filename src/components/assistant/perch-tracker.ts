// TRANSPORT: props-only — reads layout from the DOM. No fetching, no React.
//
// WHERE THE PERCH IS, AT THE COST OF AT MOST ONE LAYOUT READ PER FRAME.
//
// A perch is any element carrying `data-assistant-perch="<id>"`. It is an attribute rather than a
// hook or a ref so a SERVER component can be a perch with zero client JavaScript of its own.
//
// THE RULE THAT KEEPS SCROLLING SMOOTH: EVENTS NEVER MEASURE. Scroll, resize and the observers only
// set `isDirty`. The one `getBoundingClientRect()` happens inside the mascot's own ticker, at most
// once a frame and only when something marked it dirty, and the controller does every DOM write for
// that frame AFTER it. A read inside a scroll handler, interleaved with writes, is a forced
// synchronous layout per event, and scroll fires far more often than frames do.
//
// Three details that are easy to get wrong:
//  - The scroll listener is on `document` in the CAPTURE phase. In `(home)` the scroll container is
//    `<main>`, not the window, and a scroll event does not bubble, so a bubbling listener on
//    `window` never hears it.
//  - Scrolled out of view is the IntersectionObserver's job, not per-frame arithmetic.
//  - A removed perch fires nothing. It is caught as `isConnected === false` on the next dirty read,
//    and the caller marks the tracker dirty on navigation for exactly that reason.
//
// Nothing is observed while no perch is targeted: a docked mascot costs no listeners and no reads.

export type PerchReading =
  /** No perch is targeted. */
  | { readonly kind: "none" }
  /** Still the last anchor that was read; nothing marked it dirty. */
  | { readonly kind: "unchanged" }
  /** The perch's top-centre in viewport pixels. */
  | { readonly kind: "anchor"; readonly anchorX: number; readonly anchorY: number }
  /** The perch exists but is scrolled out of view. Tracking continues so the mascot can return. */
  | { readonly kind: "hidden" }
  /** The perch never appeared, or left the document. Tracking has stopped. */
  | { readonly kind: "lost" };

type PerchTrackerState =
  | { readonly status: "idle" }
  | { readonly status: "acquiring"; readonly perchId: string; readonly deadlineMs: number }
  | {
      readonly status: "tracking";
      readonly perchId: string;
      readonly perchElement: Element;
      readonly detachObservers: () => void;
    };

/**
 * How long a targeted perch may take to appear. The signal that names a perch usually fires one
 * render BEFORE the element mounts — checkout emits `order_placed` in the same handler that moves
 * to the confirmed step.
 */
const PERCH_ACQUIRE_TIMEOUT_MS = 2_000;

export interface PerchTracker {
  readonly track: (perchId: string, nowMs: number) => void;
  readonly untrack: () => void;
  readonly markDirty: () => void;
  readonly read: (nowMs: number) => PerchReading;
  readonly targetPerchId: () => string | null;
}

/**
 * The first RENDERED element carrying this perch id. Some surfaces render the same control twice
 * for different breakpoints (the product page's buy buttons sit in a mobile bar AND the desktop
 * column) and hide one with `display: none`; that one has no client rects and is skipped. This is a
 * layout read, but it only runs while a perch is being acquired, never per frame once tracked.
 */
function findPerchElement(perchId: string): Element | null {
  const candidateElements = document.querySelectorAll(
    `[data-assistant-perch="${CSS.escape(perchId)}"]`,
  );
  for (const candidateElement of candidateElements) {
    if (candidateElement.getClientRects().length > 0) return candidateElement;
  }
  return null;
}

export function createPerchTracker(): PerchTracker {
  let trackerState: PerchTrackerState = { status: "idle" };
  let isDirty = false;
  let isPerchIntersecting = true;

  const markDirty = () => {
    isDirty = true;
  };

  const attachObservers = (perchElement: Element): (() => void) => {
    const scrollListenerOptions = { passive: true, capture: true } as const;
    document.addEventListener("scroll", markDirty, scrollListenerOptions);
    window.addEventListener("resize", markDirty, { passive: true });

    const perchResizeObserver = new ResizeObserver(markDirty);
    perchResizeObserver.observe(perchElement);

    const perchIntersectionObserver = new IntersectionObserver((entries) => {
      const latestEntry = entries.at(-1);
      if (latestEntry === undefined) return;
      isPerchIntersecting = latestEntry.isIntersecting;
      isDirty = true;
    });
    perchIntersectionObserver.observe(perchElement);

    return () => {
      document.removeEventListener("scroll", markDirty, scrollListenerOptions);
      window.removeEventListener("resize", markDirty);
      perchResizeObserver.disconnect();
      perchIntersectionObserver.disconnect();
    };
  };

  const untrack = () => {
    if (trackerState.status === "tracking") trackerState.detachObservers();
    trackerState = { status: "idle" };
  };

  const track = (perchId: string, nowMs: number) => {
    if (trackerState.status !== "idle" && trackerState.perchId === perchId) {
      isDirty = true;
      return;
    }
    untrack();
    trackerState = { status: "acquiring", perchId, deadlineMs: nowMs + PERCH_ACQUIRE_TIMEOUT_MS };
  };

  const readTrackedAnchor = (perchElement: Element): PerchReading => {
    if (!isDirty) return { kind: "unchanged" };
    isDirty = false;
    if (!perchElement.isConnected) {
      untrack();
      return { kind: "lost" };
    }
    if (!isPerchIntersecting) return { kind: "hidden" };
    const perchRect = perchElement.getBoundingClientRect();
    return {
      kind: "anchor",
      anchorX: perchRect.left + perchRect.width / 2,
      anchorY: perchRect.top,
    };
  };

  const read = (nowMs: number): PerchReading => {
    switch (trackerState.status) {
      case "idle":
        return { kind: "none" };
      case "acquiring": {
        // Polled each frame only for the two seconds a newly named perch may take to mount.
        const perchElement = findPerchElement(trackerState.perchId);
        if (perchElement === null) {
          if (nowMs < trackerState.deadlineMs) return { kind: "hidden" };
          untrack();
          return { kind: "lost" };
        }
        // Assume visible until the observer's first callback, which lands within a frame.
        isPerchIntersecting = true;
        isDirty = true;
        trackerState = {
          status: "tracking",
          perchId: trackerState.perchId,
          perchElement,
          detachObservers: attachObservers(perchElement),
        };
        return readTrackedAnchor(perchElement);
      }
      case "tracking":
        return readTrackedAnchor(trackerState.perchElement);
      default: {
        const exhaustiveCheck: never = trackerState;
        return exhaustiveCheck;
      }
    }
  };

  const targetPerchId = () => (trackerState.status === "idle" ? null : trackerState.perchId);

  return { track, untrack, markDirty, read, targetPerchId };
}
