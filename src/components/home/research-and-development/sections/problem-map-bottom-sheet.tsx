// TRANSPORT: props-only — a container. It holds a detent and a drag gesture, nothing else, and it
// fetches nothing.
"use client";

import { type ReactNode, useRef, useState } from "react";

/**
 * The three heights the sheet rests at, as a share of the map region.
 *
 * ⚠️ **`full` STILL LEAVES THE MAP 25% OF THE SCREEN.** There is no fourth detent that covers the
 * canvas, and there must not be: the map is the page, and a list that can hide it entirely is a
 * list the reader cannot get out of without finding a control they have just buried.
 */
const SHEET_DETENTS = ["peek", "half", "full"] as const;
type SheetDetent = (typeof SHEET_DETENTS)[number];

/**
 * How much of the region the sheet covers at each detent.
 *
 * ⚠️ **`peek` IS SIZED BY WHAT MUST BE REACHABLE WITHOUT EXPANDING, NOT BY A ROUND NUMBER.** The
 * handle, the two chip rows, the count, the sort control and the `Report a problem` button come to
 * roughly half the region; an earlier 38% cut the report button off the bottom, which is the one
 * control a reporter standing at the broken thing came for. `full` still leaves the map a quarter
 * of the region — there is no detent that covers the canvas, and there must not be.
 */
const SHEET_HEIGHT_CLASS: Record<SheetDetent, string> = {
  peek: "h-[50%]",
  half: "h-[62%]",
  full: "h-[75%]",
};

/** What the handle says it will do next, for a reader who cannot see the sheet move. */
const SHEET_DETENT_LABEL: Record<SheetDetent, string> = {
  peek: "Expand the cluster list",
  half: "Expand the cluster list",
  full: "Collapse the cluster list",
};

/**
 * How far a pointer must travel before the gesture counts as a drag rather than a tap.
 *
 * Same purpose as `feed/filter.tsx`'s threshold, which this gesture is adapted from: without it a
 * handle press that wobbles by a pixel is read as a drag, and the tap that should have stepped the
 * detent is swallowed.
 */
const DRAG_THRESHOLD_PIXELS = 8;

/** How far the sheet must be dragged, as a share of the region, to settle on the next detent. */
const DETENT_CHANGE_FRACTION = 0.12;

function stepDetent(current: SheetDetent, direction: 1 | -1): SheetDetent {
  const currentIndex = SHEET_DETENTS.indexOf(current);
  const nextIndex = Math.min(Math.max(currentIndex + direction, 0), SHEET_DETENTS.length - 1);
  return SHEET_DETENTS[nextIndex];
}

type ProblemMapBottomSheetProps = {
  readonly children: ReactNode;
};

/**
 * The mobile container for the panel: a sheet over a live map.
 *
 * ⚠️ **IT IS NOT A MODAL AND MUST NEVER BECOME ONE.** No scrim, no focus trap, no `inert` on the
 * canvas, no body scroll lock. `RndSheet` and `ModalSheet` are all four of those things, which is
 * exactly why neither could be reused here: a modal makes the map unreachable while the list is
 * open, and the map is the thing the reader came for. `docs/Design.md` §6 bans modal-as-first-
 * thought, and this is the case it was written about.
 *
 * ⚠️ **THE HANDLE IS A REAL `<button>`, NOT A DECORATIVE BAR.** Both existing sheets in the repo
 * render their handle as a static `<span>` — an affordance that looks draggable and is not. Here
 * the detents are reachable by Enter and by arrow keys, because a sheet that can only be resized by
 * dragging is a sheet a keyboard user cannot open.
 *
 * The drag is adapted from `src/components/home/feed/filter.tsx:121-189`: gesture state in a ref so
 * a pointermove does not re-render, a threshold before capture, and `setPointerCapture` in a
 * `try/catch` because a synthetic or already-released pointer must not throw.
 */
export default function ProblemMapBottomSheet({ children }: ProblemMapBottomSheetProps) {
  const [detent, setDetent] = useState<SheetDetent>("peek");
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragGestureRef = useRef<{
    pointerId: number;
    startClientY: number;
    hasMovedPastThreshold: boolean;
  } | null>(null);

  // The sheet floats OVER a full-bleed canvas, so moving it does not resize the map and nothing
  // needs to be told that it moved. `civic-pulse-vector-map` observes its own container for the
  // resizes that are real.
  function settleOn(nextDetent: SheetDetent) {
    setDetent(nextDetent);
  }

  const handleDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragGestureRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      hasMovedPastThreshold: false,
    };
  };

  const handleDragMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragGestureRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const verticalDelta = event.clientY - drag.startClientY;
    if (!drag.hasMovedPastThreshold && Math.abs(verticalDelta) > DRAG_THRESHOLD_PIXELS) {
      drag.hasMovedPastThreshold = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be released (synthetic events in tests). The gesture still
        // works without capture — capture only matters once the finger leaves the handle.
      }
    }
  };

  const handleDragEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragGestureRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragGestureRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!drag.hasMovedPastThreshold) return;

    // Settle by DIRECTION against a fraction of the region, not by tracking the finger to a pixel
    // height. A sheet that lands wherever it was dropped has no detents; it just has a height the
    // reader has to get right by hand.
    const regionHeight = sheetRef.current?.parentElement?.clientHeight ?? 0;
    const verticalDelta = event.clientY - drag.startClientY;
    if (regionHeight === 0) return;
    if (Math.abs(verticalDelta) < regionHeight * DETENT_CHANGE_FRACTION) return;
    settleOn(stepDetent(detent, verticalDelta < 0 ? 1 : -1));
  };

  // A drag that ends ON the handle fires a click afterwards. Without this the gesture both drags
  // AND steps the detent, so every drag overshoots by one.
  const suppressClickAfterDrag = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (dragGestureRef.current?.hasMovedPastThreshold === true) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      settleOn(stepDetent(detent, 1));
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      settleOn(stepDetent(detent, -1));
    }
  };

  return (
    <div
      ref={sheetRef}
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-2xl border-t border-outline-variant/60 bg-card shadow-lg transition-[height] duration-200 ${SHEET_HEIGHT_CLASS[detent]}`}
    >
      <button
        type="button"
        aria-expanded={detent !== "peek"}
        aria-controls="problem-map-sheet-contents"
        aria-label={SHEET_DETENT_LABEL[detent]}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClickCapture={suppressClickAfterDrag}
        onClick={() => settleOn(detent === "full" ? "peek" : stepDetent(detent, 1))}
        onKeyDown={handleKeyDown}
        // `touch-none` so a vertical drag on the handle is not also a page scroll gesture. It is
        // scoped to the handle alone — the list below must still scroll with a finger.
        className="flex shrink-0 cursor-grab touch-none items-center justify-center py-3 active:cursor-grabbing"
      >
        <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-black/15" />
      </button>

      <div id="problem-map-sheet-contents" className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
}
