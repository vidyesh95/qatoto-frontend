// TRANSPORT: props-only — presentational server component. Fetches nothing, holds no state:
// each tab is a Link that rewrites the query string, and the page above re-reads
// `searchParams` and re-queries the backend.
//
// TABS AS A QUERY PARAM, NOT NESTED ROUTES OR CLIENT STATE. A `useState` tab is not
// shareable, does not survive back-navigation and cannot be server-rendered; nested routes
// would mean three page bodies fetching overlapping data. `?tab=` is the same mechanism
// `FilterChipRow` uses for every other selection in R&D, and it keeps the whole surface a
// server component.

import Link from "next/link";

import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";

export const MARKET_RESEARCH_TABS = ["overview", "demand", "import-substitution"] as const;
export type MarketResearchTab = (typeof MARKET_RESEARCH_TABS)[number];

const TAB_LABELS: Record<MarketResearchTab, string> = {
  overview: "Overview",
  demand: "Reported demand",
  "import-substitution": "Import substitution",
};

const TAB_DESCRIPTIONS: Record<MarketResearchTab, string> = {
  overview: "Both signals, and where they agree",
  demand: "What people are reporting as problems",
  "import-substitution": "What the country buys from abroad",
};

export default function MarketResearchTabs({
  activeTab,
  searchParams,
}: {
  activeTab: MarketResearchTab;
  searchParams: RawSearchParams;
}) {
  return (
    // A `nav` rather than a `div role="tablist"`: these are links that change the URL and load
    // new data, not client-side panels. A screen reader should announce them as destinations.
    <nav
      aria-label="Market research sections"
      className="border-b border-[#CAC4D0]/60 px-4 lg:px-6"
    >
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {MARKET_RESEARCH_TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <li key={tab}>
              <Link
                href={buildFilterHref(searchParams, { tab })}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-[#00696E] font-medium text-[#00696E]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAB_LABELS[tab]}
                <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">
                  {TAB_DESCRIPTIONS[tab]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
