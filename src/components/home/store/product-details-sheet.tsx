"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Image from "next/image";

// Fraction of the visible tab-row width to advance per chevron click.
const TAB_SCROLL_FRACTION = 0.6;

// "All product details" bottom sheet for the product page (UI-only phase, no
// fetch). Horizontally scrollable tabs (Features & Specs, Item details,
// Measurements, Additional details), each rendering a list of spec label/value
// rows. Static mock copy for now — real specs come from the backend later; the
// client only renders them. Bottom sheet on mobile, centered modal on desktop —
// mirrors TradeProtectionSheet.

type SpecRow = { label: string; value: string };
type SpecTab = { id: string; label: string; rows: SpecRow[] };

const SPEC_TABS: SpecTab[] = [
  {
    id: "features-and-specs",
    label: "Features & Specs",
    rows: [
      { label: "Frame Material", value: "Powder-coated cold-rolled steel" },
      { label: "Finish", value: "Anti-rust matte coating" },
      { label: "Weight Capacity", value: "150 kg" },
      { label: "Folded Thickness", value: "5 cm" },
      { label: "Max Stack Height", value: "12 chairs" },
      { label: "Floor Glides", value: "Non-marking, indoor/outdoor" },
      { label: "Assembly", value: "Pre-assembled, no tools" },
      { label: "Tested Standard", value: "EN 16139" },
    ],
  },
  {
    id: "item-details",
    label: "Item details",
    rows: [
      { label: "Brand Name", value: "Louis Vuitton" },
      { label: "Model Name", value: "Folding Metal Living Room Chair" },
      {
        label: "Box Contents",
        value: "1 × Folding chair, 4 × floor glides, cleaning cloth, warranty card",
      },
      { label: "Manufacturer", value: "Guangdong Puda Electrical Appliance Co., Ltd" },
      { label: "Model Number", value: "LV-FMC-RED-01" },
      { label: "Item Type Name", value: "Folding Living Room Chair" },
      { label: "Country of Origin", value: "China" },
    ],
  },
  {
    id: "measurements",
    label: "Measurements",
    rows: [
      { label: "Item Dimensions D × W × H", value: "52D × 46W × 81H Centimeters" },
      { label: "Seat Height", value: "45 Centimeters" },
      { label: "Folded Dimensions", value: "5 × 46 × 90 Centimeters" },
      { label: "Item Weight", value: "4.2 Kilograms" },
    ],
  },
  {
    id: "additional-details",
    label: "Additional details",
    rows: [
      { label: "Colour", value: "Raspberry Red" },
      { label: "Style", value: "Modern Folding" },
      { label: "Warranty", value: "1 Year Manufacturer Warranty" },
    ],
  },
];

export default function ProductDetailsSheet({ onClose }: { onClose: () => void }) {
  const [activeTabId, setActiveTabId] = useState(SPEC_TABS[0].id);

  // Horizontally-scrollable tab row plus the chevron buttons that appear only
  // when there is hidden content in that direction (mirrors feed/filter.tsx).
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollBackward, setCanScrollBackward] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  // Index of the tab that is currently keyboard-focusable. WAI-ARIA roving
  // tabindex: exactly one tab has tabIndex 0 (the row is a single Tab stop) and
  // arrow keys move focus between tabs; Enter/Space activates via the native
  // button onClick. Initialised to the active tab so Tab lands on it.
  const [focusedTabIndex, setFocusedTabIndex] = useState(0);

  // Per-tab button refs so keyboard navigation can move DOM focus and scroll
  // the newly-focused tab into view.
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Moves the roving focus to the tab at `index` (clamped to the valid range),
  // makes it the single Tab stop, and scrolls it into view.
  const moveFocusToTab = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, SPEC_TABS.length - 1));
    setFocusedTabIndex(clampedIndex);
    const tab = tabButtonRefs.current[clampedIndex];
    tab?.focus();
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, []);

  // Left/Right move focus between tabs, Home/End jump to the ends. Activation
  // (selecting a tab) stays on the native button's Enter/Space → onClick.
  const handleTabsKeyDown = (keyEvent: React.KeyboardEvent<HTMLDivElement>) => {
    switch (keyEvent.key) {
      case "ArrowRight":
        keyEvent.preventDefault();
        moveFocusToTab(focusedTabIndex + 1);
        break;
      case "ArrowLeft":
        keyEvent.preventDefault();
        moveFocusToTab(focusedTabIndex - 1);
        break;
      case "Home":
        keyEvent.preventDefault();
        moveFocusToTab(0);
        break;
      case "End":
        keyEvent.preventDefault();
        moveFocusToTab(SPEC_TABS.length - 1);
        break;
    }
  };

  const recalculateScrollAvailability = useCallback(() => {
    const container = tabsScrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollBackward(scrollLeft > 0);
    setCanScrollForward(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const container = tabsScrollContainerRef.current;
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

  const scrollTabsByOnePage = (direction: 1 | -1) => {
    const container = tabsScrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * container.clientWidth * TAB_SCROLL_FRACTION,
      behavior: "smooth",
    });
  };

  // Move focus onto the active tab when the sheet opens so arrow keys work
  // immediately — without this the toolbar's onKeyDown never fires (nothing
  // inside it is focused). `preventScroll` keeps the sheet from jumping.
  useEffect(() => {
    tabButtonRefs.current[focusedTabIndex]?.focus({ preventScroll: true });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const activeTab = SPEC_TABS.find((tab) => tab.id === activeTabId) ?? SPEC_TABS[0];

  return (
    <>
      <button
        type="button"
        aria-label="Close product details"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        aria-label="All product details"
        className="fixed inset-x-0 bottom-0 z-60 flex h-[80dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-[80dvh] sm:max-h-160 sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 items-center gap-2 px-4 py-3">
          <h2 className="flex-1 text-base font-medium">Product details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        {/* Tabs — horizontally scrollable pill row with chevron arrows that
            appear only when there is hidden content in that direction. */}
        <div className="relative shrink-0">
          {canScrollBackward && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => scrollTabsByOnePage(-1)}
              title="Scroll tabs left"
              className="absolute top-0 bottom-3 left-0 z-10 flex cursor-pointer items-center bg-linear-to-r from-background via-background to-transparent pr-10 pl-4"
            >
              <Image
                src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={24}
                height={24}
                alt="Navigate tabs back"
              />
            </button>
          )}

          <div
            ref={tabsScrollContainerRef}
            role="toolbar"
            tabIndex={-1}
            aria-label="Product detail sections"
            aria-orientation="horizontal"
            onKeyDown={handleTabsKeyDown}
            className="flex scrollbar-none gap-2 overflow-x-auto px-4 pb-3"
          >
            {SPEC_TABS.map((tab, tabIndex) => {
              const isActive = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabButtonRefs.current[tabIndex] = node;
                  }}
                  type="button"
                  aria-pressed={isActive}
                  tabIndex={tabIndex === focusedTabIndex ? 0 : -1}
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setFocusedTabIndex(tabIndex);
                  }}
                  className={`shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-[#2A76FD] bg-[#D6E3FF]/40 font-medium text-[#191C1C]"
                      : "border-[#CAC4D0] text-[#6F7979]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {canScrollForward && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => scrollTabsByOnePage(1)}
              title="Scroll tabs right"
              className="absolute top-0 right-0 bottom-3 z-10 flex cursor-pointer items-center bg-linear-to-l from-background via-background to-transparent pr-4 pl-10"
            >
              <Image
                src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={24}
                height={24}
                alt="Navigate tabs forward"
              />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <dl>
            {activeTab.rows.map((row) => (
              <div
                key={row.label}
                className="flex gap-4 border-b border-[#CAC4D0]/60 py-3 last:border-b-0"
              >
                <dt className="w-2/5 shrink-0 text-sm font-medium text-[#6F7979]">{row.label}</dt>
                <dd className="flex-1 text-sm text-[#191C1C]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </>
  );
}
