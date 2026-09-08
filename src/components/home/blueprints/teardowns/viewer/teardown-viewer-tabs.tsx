// TRANSPORT: props-only — the tab bar. Holds no state; the explorer owns the active tab.

"use client";

import type { KeyboardEvent } from "react";

import {
  TEARDOWN_VIEWER_TAB_LABELS,
  TEARDOWN_VIEWER_TABS,
  type TeardownViewerTab,
} from "@/lib/blueprints/viewer-tabs";

export interface TeardownViewerTabsProps {
  readonly activeTab: TeardownViewerTab;
  readonly onTabChange: (tab: TeardownViewerTab) => void;
  /** Tabs that would show an empty panel are not offered at all. */
  readonly availableTabs: readonly TeardownViewerTab[];
}

/**
 * A `tablist`, not a row of buttons — arrow keys move between tabs and only the active one is in
 * the tab order, which is what a keyboard user and a screen reader expect of something shaped like
 * this. Each panel names its tab back with `aria-labelledby` in the explorer.
 */
export default function TeardownViewerTabs({
  activeTab,
  onTabChange,
  availableTabs,
}: TeardownViewerTabsProps) {
  const orderedTabs = TEARDOWN_VIEWER_TABS.filter((tab) => availableTabs.includes(tab));

  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = orderedTabs.indexOf(activeTab);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = orderedTabs[(currentIndex + offset + orderedTabs.length) % orderedTabs.length];
    if (nextTab !== undefined) onTabChange(nextTab);
  }

  return (
    <div
      role="tablist"
      aria-label="Teardown viewer"
      // The container carries the arrow-key handler, so it has to be able to receive the event —
      // but focus belongs on the active tab, not the list, hence -1 here and 0 on the tab.
      tabIndex={-1}
      onKeyDown={handleTabKeyDown}
      className="flex flex-wrap gap-1 rounded-full border border-[#CAC4D0]/60 bg-white p-1"
    >
      {orderedTabs.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`teardown-viewer-tab-${tab}`}
            aria-selected={isActive}
            aria-controls={`teardown-viewer-panel-${tab}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive ? "bg-[#00696E] text-white" : "text-foreground hover:bg-muted"
            }`}
          >
            {TEARDOWN_VIEWER_TAB_LABELS[tab]}
          </button>
        );
      })}
    </div>
  );
}
