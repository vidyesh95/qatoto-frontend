"use client";

import Image from "next/image";
import { useState } from "react";

import type {
  DisputeWindowEntry,
  DisputeWindowStatus,
  TeamMember,
} from "@/types/research-and-development";

const DISPUTE_STATUS_BADGES: Record<DisputeWindowStatus, { label: string; className: string }> = {
  open: { label: "Open — 24h window", className: "bg-blue-100 text-blue-800" },
  disputed: { label: "Disputed — frozen in escrow", className: "bg-red-100 text-red-800" },
  "consensus-reached": { label: "Consensus reached", className: "bg-green-100 text-green-800" },
  locked: { label: "Locked", className: "bg-[#00696E]/10 text-[#00696E]" },
};

// Transparency-ledger entry with a local-state-only Dispute toggle. No dispute
// is sent in the UI-building phase — escrow and consensus are backend-owned.
export default function DisputeWindowEntryCard({
  entry,
  member,
}: {
  entry: DisputeWindowEntry;
  member: TeamMember;
}) {
  const [hasViewerDisputed, setHasViewerDisputed] = useState(false);

  const handleDisputeClick = () => setHasViewerDisputed(true);

  const statusBadge =
    entry.status === "open" && hasViewerDisputed
      ? DISPUTE_STATUS_BADGES.disputed
      : DISPUTE_STATUS_BADGES[entry.status];

  function renderStatusDetail() {
    switch (entry.status) {
      case "open":
        return hasViewerDisputed ? (
          <p className="text-xs text-muted-foreground">
            You disputed this allocation — slices frozen in escrow pending team consensus.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{entry.timeRemainingToLockLabel}</span>
            <button
              type="button"
              onClick={handleDisputeClick}
              className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E] transition-colors"
            >
              Dispute
            </button>
          </div>
        );
      case "disputed":
        return <p className="text-xs text-muted-foreground">{entry.disputeNote}</p>;
      case "consensus-reached":
        return (
          <>
            <p className="text-xs text-muted-foreground">{entry.disputeNote}</p>
            <p className="text-xs font-medium text-[#00696E]">{entry.consensusOutcomeLabel}</p>
          </>
        );
      case "locked":
        return <span className="text-xs text-muted-foreground">{entry.lockedOnLabel}</span>;
      default: {
        const exhaustiveCheck: never = entry;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Image
          src={member.avatarImageSrc}
          width={32}
          height={32}
          alt={member.name}
          className="size-8 shrink-0 rounded-full object-cover"
        />
        <span className="text-sm font-medium">{member.name}</span>
        <span className="text-xs text-muted-foreground">{entry.allocationDateLabel}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
      </div>
      <p className="text-sm">{entry.proposedAllocationSummary}</p>
      <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 text-xs font-medium text-[#191C1C]">
        {entry.proposedSlicesLabel}
      </span>
      {renderStatusDetail()}
    </div>
  );
}
