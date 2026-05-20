"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

// Labels rendered as filter chips. First entry is the default selection.
const FILTER_CHIPS = [
  "All",
  "Live",
  "Trending",
  "New to you",
  "News",
  "Recently uploaded",
  "Watched",
  "Gaming",
  "Shopping",
  "Cosplay",
  "Music",
  "News",
  "Robotics",
  "AI",
  "Research",
  "Hardware",
  "Upcoming",
  "Minimalist",
  "Retro",
  "Electronics",
  "Sports",
  "Precision",
  "Animated",
];

// Distance the pointer must travel before we treat the gesture as a drag
// rather than a click. Keeps small accidental mouse jiggles from being
// interpreted as scroll drags.
const DRAG_THRESHOLD_PIXELS = 5;

// Fraction of the visible chip-row width to advance per chevron click.
const PAGE_SCROLL_FRACTION = 0.8;

export default function Filter() {
  // Reference to the horizontally-scrollable container that holds the chips.
  // We read its scrollLeft/scrollWidth/clientWidth and imperatively scroll it.
  const chipsScrollContainerRef = useRef<HTMLDivElement>(null);

  // Whether the back/forward chevron buttons should be rendered. They appear
  // only when there is hidden content in that direction.
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  // Currently selected chip's index in FILTER_CHIPS. Defaults to 0 ("All").
  const [selectedChipIndex, setSelectedChipIndex] = useState(0);

  // Recomputes whether the chip row currently overflows in either direction.
  // Called on mount, on every scroll event, and whenever the container is
  // resized — so the chevrons appear/disappear in sync with the actual
  // scroll position and available width.
  const recalculateScrollAvailability = useCallback(() => {
    const container = chipsScrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollBackward(scrollLeft > 0);
    setCanScrollForward(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Wires the scroll listener and ResizeObserver that keep the chevron
  // visibility state up to date. Returns the matching cleanup so React tears
  // them down on unmount.
  useEffect(() => {
    const container = chipsScrollContainerRef.current;
    if (!container) return;
    recalculateScrollAvailability();
    container.addEventListener("scroll", recalculateScrollAvailability, { passive: true });
    const resizeObserver = new ResizeObserver(recalculateScrollAvailability);
    resizeObserver.observe(container);
    return () => {
      container.removeEventListener("scroll", recalculateScrollAvailability);
      resizeObserver.disconnect();
    };
  }, [recalculateScrollAvailability]);

  // Scrolls the chip row one "page" in the requested direction with a smooth
  // animation. Triggered by the back/forward chevron buttons.
  const scrollChipsByOnePage = (direction: 1 | -1) => {
    const container = chipsScrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * container.clientWidth * PAGE_SCROLL_FRACTION,
      behavior: "smooth",
    });
  };

  // State for an in-progress YouTube-style click-and-drag scroll gesture.
  // Stored in a ref (not useState) because updating it every pointermove
  // should not re-render the component.
  const dragGestureRef = useRef<{
    pointerId: number;
    startClientX: number;
    startScrollLeft: number;
    hasMovedPastThreshold: boolean;
  } | null>(null);

  // Records where the gesture started so subsequent pointermove events can
  // compute how far the user has dragged. Ignores non-primary mouse buttons.
  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const container = chipsScrollContainerRef.current;
    if (!container) return;
    dragGestureRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startScrollLeft: container.scrollLeft,
      hasMovedPastThreshold: false,
    };
  };

  // While the user holds the pointer down and moves it, scroll the container
  // by the same horizontal delta. Once the gesture passes the drag threshold,
  // capture the pointer so we keep receiving move events even if the cursor
  // leaves the chip row, and flag the gesture as "actually a drag" so the
  // upcoming click is suppressed.
  const handleDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragGestureRef.current;
    const container = chipsScrollContainerRef.current;
    if (!drag || !container || drag.pointerId !== event.pointerId) return;
    const horizontalDelta = event.clientX - drag.startClientX;
    if (!drag.hasMovedPastThreshold && Math.abs(horizontalDelta) > DRAG_THRESHOLD_PIXELS) {
      drag.hasMovedPastThreshold = true;
      try {
        container.setPointerCapture(event.pointerId);
      } catch {
        // Pointer may already be released (e.g. synthetic events in tests).
        // Drag still works without explicit capture — capture only matters
        // when the cursor leaves the container mid-drag.
      }
    }
    if (drag.hasMovedPastThreshold) {
      container.scrollLeft = drag.startScrollLeft - horizontalDelta;
      event.preventDefault();
    }
  };

  // Ends the drag gesture: releases pointer capture (if we took it) and
  // clears the recorded state. Bound to both pointerup and pointercancel.
  const handleDragEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragGestureRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const container = chipsScrollContainerRef.current;
    if (container?.hasPointerCapture(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }
    dragGestureRef.current = null;
  };

  // Stops the synthetic click that fires after a drag from reaching the chip
  // buttons. Without this, dragging across the row would also "select" the
  // chip the user happened to release the pointer on.
  const suppressClickAfterDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragGestureRef.current?.hasMovedPastThreshold) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div className="relative">
      {canScrollBackward && (
        <button
          type="button"
          onClick={() => scrollChipsByOnePage(-1)}
          className="absolute left-0 top-0 bottom-0 z-10 bg-linear-to-r from-white via-white to-transparent py-4 pl-4 pr-18 cursor-pointer"
        >
          <Image
            src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter back"
          />
        </button>
      )}
      <div
        ref={chipsScrollContainerRef}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClickCapture={suppressClickAfterDrag}
        className="h-14 flex flex-row items-center gap-2 px-4 overflow-x-auto cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTER_CHIPS.map((chipLabel, chipIndex) => {
          const isSelected = selectedChipIndex === chipIndex;
          return (
            <button
              key={`${chipLabel}-${chipIndex}`}
              type="button"
              onClick={() => setSelectedChipIndex(chipIndex)}
              className={`px-4 py-1.5 text-sm text-nowrap rounded-lg cursor-pointer border ${
                isSelected ? "bg-primary border-primary" : "border-outline hover:bg-black/5"
              }`}
            >
              {chipLabel}
            </button>
          );
        })}
      </div>
      {canScrollForward && (
        <button
          type="button"
          onClick={() => scrollChipsByOnePage(1)}
          className="absolute right-0 top-0 bottom-0 z-10 bg-linear-to-l from-white via-white to-transparent py-4 pl-18 pr-4 cursor-pointer"
        >
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter forward"
          />
        </button>
      )}
    </div>
  );
}
