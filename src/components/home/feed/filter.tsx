// TRANSPORT: client-query — the chip row. Categories arrive from the server render as
// `initialData` and React Query only refetches them; the SELECTION is not state here at all.
//
// THE CHIPS ARE LINKS, NOT BUTTONS, AND THAT IS THE WHOLE DESIGN.
//
// The old version held the selection in `useState`, which is exactly why the chips filtered
// nothing: a selection the URL does not carry cannot be shared, cannot be bookmarked, and is
// lost on back-navigation. The URL is the single source of truth for what the page is showing
// (HOME_STRUCTURE §4) — the server page reads `searchParams`, passes them to the backend as
// query params, and hands the resulting selection back down to this row.
//
// So a chip's job is to name a destination, and an anchor is what names a destination. It also
// buys real middle-click and open-in-new-tab behaviour for free, which `router.replace` does
// not.
//
// EVERY INTERACTION BEHAVIOUR BELOW IS UNCHANGED from the mock version: roving tabindex
// (WAI-ARIA toolbar), drag-to-scroll with a 5px threshold, chevrons that appear only when
// there is hidden content. Only the data source and the activation mechanism moved.

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useFeedCategoriesQuery } from "@/hooks/feed/queries";
import { buildFeedChips, isChipSelected, toChipHrefPatch } from "@/lib/feed/chips";
import type { FeedSelection } from "@/lib/feed/feed-search-params";
import type { ContentCategory } from "@/lib/feed/schemas";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";

// Distance the pointer must travel before we treat the gesture as a drag
// rather than a click. Keeps small accidental mouse jiggles from being
// interpreted as scroll drags.
const DRAG_THRESHOLD_PIXELS = 5;

// Fraction of the visible chip-row width to advance per chevron click.
const PAGE_SCROLL_FRACTION = 0.1;

export default function Filter({
  initialCategories,
  searchParams,
  selection,
}: {
  readonly initialCategories: ContentCategory[];
  readonly searchParams: RawSearchParams;
  readonly selection: FeedSelection;
}) {
  // A FAILED CATEGORY READ MUST NOT BLANK THIS ROW. `buildFeedChips([])` still returns the
  // five mode chips, which do not depend on `/feed/categories` and are five working controls.
  // Rendering an empty row instead would teach users the filters are broken.
  const categoriesQuery = useFeedCategoriesQuery(initialCategories);
  const chips = buildFeedChips(categoriesQuery.data ?? []);

  // Reference to the horizontally-scrollable container that holds the chips.
  // We read its scrollLeft/scrollWidth/clientWidth and imperatively scroll it.
  const chipsScrollContainerRef = useRef<HTMLDivElement>(null);

  // Whether the back/forward chevron buttons should be rendered. They appear
  // only when there is hidden content in that direction.
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  // Index of the chip that is currently keyboard-focusable. We use the WAI-ARIA
  // toolbar "roving tabindex" pattern: exactly one chip has tabIndex 0 (so the
  // whole row is a single Tab stop) and arrow keys move focus between chips.
  //
  // This is the ONLY chip state left. The selection lives in the URL.
  const selectedChipIndex = Math.max(
    0,
    chips.findIndex((chip) => isChipSelected(chip, selection)),
  );
  const [focusedChipIndex, setFocusedChipIndex] = useState(selectedChipIndex);

  // Per-chip refs so keyboard navigation can imperatively move DOM focus
  // and scroll the newly-focused chip into view.
  const chipLinkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Recomputes whether the chip row currently overflows in either direction.
  // Called on mount, on every scroll event, and whenever the container is
  // resized — so the chevrons appear/disappear in sync with the actual
  // scroll position and available width. `chipCount` re-runs this when the
  // category query resolves and the row grows.
  const chipCount = chips.length;
  useEffect(() => {
    const container = chipsScrollContainerRef.current;
    if (container === null) return undefined;

    function recalculateScrollAvailability(scrollContainer: HTMLDivElement) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
      setCanScrollBackward(scrollLeft > 0);
      setCanScrollForward(scrollLeft + clientWidth < scrollWidth - 1);
    }

    container.setAttribute("data-chip-count", String(chipCount));
    recalculateScrollAvailability(container);
    const handleScroll = () => recalculateScrollAvailability(container);
    container.addEventListener("scroll", handleScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => recalculateScrollAvailability(container));
    resizeObserver.observe(container);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [chipCount]);

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

  // Stops the synthetic click that fires after a drag from reaching the chips.
  // MORE LOAD-BEARING NOW THAN IT WAS: the chips are anchors, so an unsuppressed
  // post-drag click does not merely reselect a filter, it NAVIGATES. `preventDefault`
  // on the capture phase is what stops the browser following the href.
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
  const moveFocusToChip = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, chips.length - 1));
      setFocusedChipIndex(clampedIndex);
      const chip = chipLinkRefs.current[clampedIndex];
      chip?.focus();
      chip?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [chips.length],
  );

  // Standard WAI-ARIA toolbar keyboard model: Left/Right move focus between
  // chips, Home/End jump to the ends. Activation stays on the anchor's own
  // Enter handling, so arrowing through the row never navigates on its own.
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
        moveFocusToChip(chips.length - 1);
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
          className="absolute top-0 bottom-0 left-0 z-10 cursor-pointer bg-linear-to-r from-white via-white to-transparent py-4 pr-18 pl-2.5 lg:pl-4"
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
        className="flex h-14 cursor-grab scrollbar-none flex-row items-center gap-2 overflow-x-auto px-4 select-none active:cursor-grabbing lg:px-6"
      >
        {chips.map((chip, chipIndex) => {
          const isSelected = chipIndex === selectedChipIndex;
          const chipKey = chip.kind === "mode" ? `mode:${chip.mode}` : `topic:${chip.categorySlug}`;
          return (
            <Link
              key={chipKey}
              ref={(node) => {
                chipLinkRefs.current[chipIndex] = node;
              }}
              href={buildFilterHref(searchParams, toChipHrefPatch(chip))}
              // The chip row sits above the feed; jumping to the top on every filter change
              // would throw away the reader's position for no reason.
              scroll={false}
              aria-current={isSelected ? "true" : undefined}
              tabIndex={chipIndex === focusedChipIndex ? 0 : -1}
              onClick={() => setFocusedChipIndex(chipIndex)}
              className={`cursor-pointer rounded-lg border px-4 py-1.5 text-sm text-nowrap ${
                isSelected ? "border-primary bg-primary" : "border-outline hover:bg-black/5"
              }`}
            >
              {chip.label}
            </Link>
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
          className="absolute top-0 right-0 bottom-0 z-10 cursor-pointer bg-linear-to-l from-white via-white to-transparent py-4 pr-2.5 pl-18 lg:pr-4"
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
