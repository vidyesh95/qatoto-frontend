"use client";

import { useState, type ReactNode } from "react";

type ProjectDetailTab = "overview" | "daily-logs" | "team" | "funding" | "governance";

const TAB_LABELS: Record<ProjectDetailTab, string> = {
  overview: "Overview",
  "daily-logs": "Daily Logs",
  team: "Team",
  funding: "Funding",
  governance: "Governance",
};

const TAB_ORDER: ProjectDetailTab[] = ["overview", "daily-logs", "team", "funding", "governance"];

type ProjectTabsProps = {
  overviewPanel: ReactNode;
  dailyLogsPanel: ReactNode;
  teamPanel: ReactNode;
  fundingPanel: ReactNode;
  governancePanel: ReactNode;
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
      case "governance":
        return props.governancePanel;
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
