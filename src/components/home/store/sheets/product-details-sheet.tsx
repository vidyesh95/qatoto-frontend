// TRANSPORT: props-only — renders the specifications it was handed, no network.
//
// "All product details": horizontally scrollable tabs, each rendering spec label/value rows.
//
// THE TABS ARE THE SPEC GROUPS, DERIVED — NOT A HARDCODED FIVE. `specifications[]` carries
// `{key, value, group, position}` and `group` is FREE TEXT on purpose: the useful groupings for a
// chair and for a transformer share nothing, so the backend lets the seller name them. `null` means
// ungrouped, which is every pre-Phase-8 row, and those collect under one "Specifications" tab.
//
// A product with one group therefore gets ONE tab rather than five empty ones, which is what the
// mock's fixed tab list produced for every product that was not the demo chair.
//
// `brand`, `modelNumber`, `countryOfOriginCode`, `condition` and `unitOfMeasure` are FIRST-CLASS
// FIELDS on the projection rather than spec rows, so they are assembled into their own leading tab
// here instead of being hunted for among the seller's free-text keys.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";

import ModalSheet from "@/components/home/shared/modal-sheet";
import { countryLabelFromCode } from "@/lib/store/format";
import { PRODUCT_CONDITION_LABELS, type StoreProductDetail } from "@/lib/store/products.schemas";

// Fraction of the visible tab-row width to advance per chevron click.
const TAB_SCROLL_FRACTION = 0.6;

type SpecRow = { readonly label: string; readonly value: string };
type SpecTab = { readonly id: string; readonly label: string; readonly rows: readonly SpecRow[] };

/** The ungrouped bucket. Named rather than left blank so the tab has something to say. */
const UNGROUPED_TAB_LABEL = "Specifications";

/**
 * The projection's own first-class fields, as a tab.
 *
 * Each is omitted when null rather than rendered as a dash — "the seller did not state a model
 * number" and "the model number is —" are different claims.
 */
function buildItemDetailsTab(product: StoreProductDetail): SpecTab | null {
  const rows: SpecRow[] = [];
  if (product.brand !== null) rows.push({ label: "Brand", value: product.brand });
  if (product.modelNumber !== null) {
    rows.push({ label: "Model number", value: product.modelNumber });
  }
  rows.push({ label: "Condition", value: PRODUCT_CONDITION_LABELS[product.condition] });
  if (product.countryOfOriginCode !== null) {
    rows.push({
      label: "Country of origin",
      value: countryLabelFromCode(product.countryOfOriginCode),
    });
  }
  if (product.unitOfMeasure !== null) {
    rows.push({ label: "Unit of measure", value: product.unitOfMeasure });
  }
  rows.push({ label: "Sold by", value: product.seller.displayName });
  return rows.length === 0 ? null : { id: "item-details", label: "Item details", rows };
}

/**
 * Distinct `group` values, in the order the server's `position` puts them.
 *
 * Insertion order into the Map IS the tab order, which keeps the seller's own arrangement rather
 * than alphabetising it into something they did not choose.
 */
function buildSpecificationTabs(
  specifications: StoreProductDetail["specifications"],
): readonly SpecTab[] {
  const rowsByGroup = new Map<string, SpecRow[]>();
  for (const specification of specifications.toSorted(
    (left, right) => left.position - right.position,
  )) {
    const groupLabel = specification.group ?? UNGROUPED_TAB_LABEL;
    const groupRows = rowsByGroup.get(groupLabel) ?? [];
    groupRows.push({ label: specification.key, value: specification.value });
    rowsByGroup.set(groupLabel, groupRows);
  }
  return [...rowsByGroup.entries()].map(([groupLabel, rows]) => ({
    id: `group-${groupLabel}`,
    label: groupLabel,
    rows,
  }));
}

export default function ProductDetailsSheet({
  product,
  onClose,
}: {
  readonly product: StoreProductDetail;
  readonly onClose: () => void;
}) {
  const specTabs = useMemo<readonly SpecTab[]>(() => {
    const itemDetailsTab = buildItemDetailsTab(product);
    return [
      ...(itemDetailsTab === null ? [] : [itemDetailsTab]),
      ...buildSpecificationTabs(product.specifications),
    ];
  }, [product]);

  const [activeTabId, setActiveTabId] = useState(specTabs[0]?.id ?? "");

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
  const moveFocusToTab = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, specTabs.length - 1));
      setFocusedTabIndex(clampedIndex);
      const tab = tabButtonRefs.current[clampedIndex];
      tab?.focus();
      tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
    },
    [specTabs.length],
  );

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
        moveFocusToTab(specTabs.length - 1);
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

  const activeTab = specTabs.find((tab) => tab.id === activeTabId) ?? specTabs[0] ?? null;

  return (
    // `isFixedHeight` is what keeps this sheet from resizing as the buyer moves between tabs:
    // the panels run from three rows to twenty-eight, and a content-sized sheet would grow and
    // shrink under the cursor mid-comparison.
    <ModalSheet title="Product details" onClose={onClose} isFixedHeight>
      {/* Tabs — horizontally scrollable pill row with chevron arrows that appear only when
          there is hidden content in that direction.

          `sticky` rather than a second slot on the shell: the tab row has to stay put while the
          panel below it scrolls, and one caller needing a pinned sub-header is not worth a prop
          every other sheet would have to read past. The z-index sits above the rows and below
          the chevron overlays, which are children of this same wrapper. */}
      <div className="relative sticky top-0 z-10 shrink-0 bg-background">
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
          {specTabs.map((tab, tabIndex) => {
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

      <div className="px-4 pb-5">
        <dl>
          {(activeTab?.rows ?? []).map((row) => (
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
    </ModalSheet>
  );
}
