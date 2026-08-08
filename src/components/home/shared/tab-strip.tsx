// TRANSPORT: props-only — holds which tab is open, fetches nothing.
"use client";

// A tab row whose panels are handed in as `ReactNode`.
//
// PANELS AS PROPS, NOT CHILDREN-BY-ID, and that is the whole design: it keeps each panel a SERVER
// component rendered by the page above, so a tabbed page does not become a client component just
// because it has tabs. Only the strip itself is interactive. This is the idiom
// `sections/project-tabs.tsx`, `proof-of-effort-tabs.tsx` and `workshop-tabs.tsx` already use three
// times over — extracted here rather than written a fourth.
//
// It renders EVERY panel and hides the inactive ones with `hidden`, rather than mounting only the
// active one. Two reasons: a server-rendered panel is already in the payload, so mounting is free and
// switching is instant; and a form or scroll position inside a panel survives a tab change, which
// unmounting would silently discard.
//
// `isLazy` IS THE ESCAPE HATCH FOR PANELS THAT FETCH. "Mounting is free" holds for a server-rendered
// panel and is false for a client-query one: a hidden panel's `useQuery` fires anyway, so a tab nobody
// opened still costs a request. A lazy panel is not rendered until first activated, and stays mounted
// afterwards — so it keeps the state-survives-a-tab-change property for every visit but the first.
// Default is eager, because that is right for the server-rendered majority.
//
// Not migrating the three existing copies. They work, the change would be behaviour-free, and it would
// bulk a batch that has real work in it.

import { useState, type ReactNode } from "react";

export interface TabStripItem {
  readonly id: string;
  readonly label: string;
  readonly panel: ReactNode;
  /** A count or short state word beside the label. Omit rather than passing `0` — see below. */
  readonly badge?: string;
  /** Mount only once activated. Set it when the panel performs a read — see the note above. */
  readonly isLazy?: boolean;
}

export default function TabStrip({
  tabs,
  initialTabId,
  ariaLabel,
}: {
  tabs: readonly TabStripItem[];
  initialTabId: string;
  ariaLabel: string;
}) {
  const [activeTabId, setActiveTabId] = useState(initialTabId);
  // Which lazy panels have ever been opened. Ids are only ADDED, never removed, so a lazy panel unmounts
  // exactly never once it has been seen.
  const [activatedTabIds, setActivatedTabIds] = useState<ReadonlySet<string>>(
    () => new Set([initialTabId]),
  );

  if (tabs.length === 0) return null;

  function handleTabClick(tabId: string) {
    setActiveTabId(tabId);
    setActivatedTabIds((previous) =>
      previous.has(tabId) ? previous : new Set([...previous, tabId]),
    );
  }

  return (
    <div>
      {/* `role="tablist"` with real `tab`/`tabpanel` wiring, so a screen reader announces this as a
          tab set rather than a row of buttons. The panels below carry the matching ids. */}
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex gap-2 overflow-x-auto px-4 pb-3 lg:px-6"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => handleTabClick(tab.id)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
              }`}
            >
              {tab.label}
              {/* A badge only when the caller passed one. A `0` badge on every empty tab is noise, so
                  the caller decides whether zero is worth saying — and on a work queue it usually is
                  not. */}
              {tab.badge !== undefined && (
                <span className={isActive ? "ml-1.5 opacity-80" : "ml-1.5 text-muted-foreground"}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTabId}
        >
          {tab.isLazy === true && !activatedTabIds.has(tab.id) ? null : tab.panel}
        </div>
      ))}
    </div>
  );
}
