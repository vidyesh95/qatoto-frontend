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
const PAGE_SCROLL_FRACTION = 0.1;

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

  // Index of the chip that is currently keyboard-focusable. We use the WAI-ARIA
  // toolbar "roving tabindex" pattern: exactly one chip has tabIndex 0 (so the
  // whole row is a single Tab stop) and arrow keys move focus between chips.
  // Initialised to the selected chip so Tab lands on the active filter.
  const [focusedChipIndex, setFocusedChipIndex] = useState(0);

  // Per-chip button refs so keyboard navigation can imperatively move DOM focus
  // and scroll the newly-focused chip into view.
  const chipButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
    if (!container) return undefined;
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

  // Moves the roving focus to the chip at `index` (clamped to the valid range),
  // updates which chip is the single Tab stop, and scrolls it into view. We use
  // `block: "nearest"` so a horizontally-scrolling chip never jumps the page
  // vertically when it is already on screen.
  const moveFocusToChip = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, FILTER_CHIPS.length - 1));
    setFocusedChipIndex(clampedIndex);
    const chip = chipButtonRefs.current[clampedIndex];
    chip?.focus();
    chip?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  // Standard WAI-ARIA toolbar keyboard model: Left/Right move focus between
  // chips, Home/End jump to the ends. Activation (selecting a filter) stays on
  // the native button's Enter/Space → onClick, so arrowing through the row never
  // triggers a filter change on its own.
  const handleChipRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocusToChip(focusedChipIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        moveFocusToChip(focusedChipIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        moveFocusToChip(0);
        break;
      case "End":
        event.preventDefault();
        moveFocusToChip(FILTER_CHIPS.length - 1);
        break;
    }
  };

  return (
    <div className="relative">
      {canScrollBackward && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollChipsByOnePage(-1)}
          title="Scroll filter chips left"
          className="absolute left-0 top-0 bottom-0 z-10 bg-linear-to-r from-white via-white to-transparent py-4 pl-2.5 lg:pl-4 pr-18 cursor-pointer"
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
        role="toolbar"
        tabIndex={-1}
        aria-label="Filter videos"
        aria-orientation="horizontal"
        onKeyDown={handleChipRowKeyDown}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClickCapture={suppressClickAfterDrag}
        className="h-14 flex flex-row items-center gap-2 px-4 lg:px-6 overflow-x-auto cursor-grab active:cursor-grabbing select-none scrollbar-none"
      >
        {FILTER_CHIPS.map((chipLabel, chipIndex) => {
          const isSelected = selectedChipIndex === chipIndex;
          return (
            <button
              key={chipIndex}
              ref={(node) => {
                chipButtonRefs.current[chipIndex] = node;
              }}
              type="button"
              aria-pressed={isSelected}
              tabIndex={chipIndex === focusedChipIndex ? 0 : -1}
              onClick={() => {
                setSelectedChipIndex(chipIndex);
                setFocusedChipIndex(chipIndex);
              }}
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
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => scrollChipsByOnePage(1)}
          title="Scroll filter chips right"
          className="absolute right-0 top-0 bottom-0 z-10 bg-linear-to-l from-white via-white to-transparent py-4 pl-18 pr-2.5 lg:pr-4 cursor-pointer"
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
