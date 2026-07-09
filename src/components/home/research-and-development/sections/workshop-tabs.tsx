"use client";

import { useState, type ReactNode } from "react";

type WorkshopSection = "boards" | "files" | "chat";

const SECTION_LABELS: Record<WorkshopSection, string> = {
  boards: "Boards",
  files: "Files",
  chat: "Chat",
};

const SECTION_ORDER: WorkshopSection[] = ["boards", "files", "chat"];

type WorkshopTabsProps = {
  boardsPanel: ReactNode;
  filesPanel: ReactNode;
  chatPanel: ReactNode;
};

// Client island holding only the active-section state — every panel arrives as
// a server-rendered ReactNode prop and is chosen via an exhaustive switch.
export default function WorkshopTabs(props: WorkshopTabsProps) {
  const [activeSection, setActiveSection] = useState<WorkshopSection>("boards");

  const renderActivePanel = (): ReactNode => {
    switch (activeSection) {
      case "boards":
        return props.boardsPanel;
      case "files":
        return props.filesPanel;
      case "chat":
        return props.chatPanel;
      default: {
        const exhaustiveCheck: never = activeSection;
        return exhaustiveCheck;
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto px-4 lg:px-6">
        {SECTION_ORDER.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeSection === section ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
            }`}
          >
            {SECTION_LABELS[section]}
          </button>
        ))}
      </div>
      {renderActivePanel()}
    </div>
  );
}
