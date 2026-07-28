// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import { useState, type ReactNode } from "react";

// THE GOVERNANCE TAB IS REMOVED, not merely emptied. It rendered an escrow ledger this
// contract retired — nine escrow routes now 404 — off a mock project shape that no
// longer exists. Compensation statements are phase 5 and the cross-project mechanics
// already live at /research-and-development/governance, so a tab printing fabricated
// escrow figures beside four wired tabs was the one option that had to go.
type ProjectDetailTab = "overview" | "daily-logs" | "team" | "funding";

const TAB_LABELS: Record<ProjectDetailTab, string> = {
  overview: "Overview",
  "daily-logs": "Daily Logs",
  team: "Team",
  funding: "Funding",
};

const TAB_ORDER: ProjectDetailTab[] = ["overview", "daily-logs", "team", "funding"];

type ProjectTabsProps = {
  overviewPanel: ReactNode;
  dailyLogsPanel: ReactNode;
  teamPanel: ReactNode;
  fundingPanel: ReactNode;
};

// Client island holding only the active-tab state — every panel arrives as a
// server-rendered ReactNode prop and is chosen via an exhaustive switch.
export default function ProjectTabs(props: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>("overview");

  const renderActivePanel = (): ReactNode => {
    switch (activeTab) {
      case "overview":
        return props.overviewPanel;
      case "daily-logs":
        return props.dailyLogsPanel;
      case "team":
        return props.teamPanel;
      case "funding":
        return props.fundingPanel;
      default: {
        const exhaustiveCheck: never = activeTab;
        return exhaustiveCheck;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto px-4 lg:px-6">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>
      {renderActivePanel()}
    </div>
  );
}
