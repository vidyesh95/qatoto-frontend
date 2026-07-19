"use client";

import { useState, type ReactNode } from "react";

type ProofOfEffortSection =
  | "slice-ledger"
  | "verification"
  | "disputes"
  | "optimization"
  | "audit-trail";

const SECTION_LABELS: Record<ProofOfEffortSection, string> = {
  "slice-ledger": "Slice Ledger",
  verification: "Verification",
  disputes: "Disputes",
  optimization: "Optimization",
  "audit-trail": "Audit Trail",
};

const SECTION_ORDER: ProofOfEffortSection[] = [
  "slice-ledger",
  "verification",
  "disputes",
  "optimization",
  "audit-trail",
];

type ProofOfEffortTabsProps = {
  sliceLedgerPanel: ReactNode;
  verificationPanel: ReactNode;
  disputesPanel: ReactNode;
  optimizationPanel: ReactNode;
  auditTrailPanel: ReactNode;
};

// Client island holding only the active-section state — every panel arrives as
// a server-rendered ReactNode prop and is chosen via an exhaustive switch.
export default function ProofOfEffortTabs(props: ProofOfEffortTabsProps) {
  const [activeSection, setActiveSection] = useState<ProofOfEffortSection>("slice-ledger");

  const renderActivePanel = (): ReactNode => {
    switch (activeSection) {
      case "slice-ledger":
        return props.sliceLedgerPanel;
      case "verification":
        return props.verificationPanel;
      case "disputes":
        return props.disputesPanel;
      case "optimization":
        return props.optimizationPanel;
      case "audit-trail":
        return props.auditTrailPanel;
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
