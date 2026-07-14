import DisputeWindowEntryCard from "@/components/home/research-and-development/cards/dispute-window-entry-card";
import type {
  DisputeWindowEntry,
  DisputeWindowStatus,
  TeamMember,
} from "@/types/research-and-development";

const STATUS_ORDER: Record<DisputeWindowStatus, number> = {
  open: 0,
  disputed: 1,
  "consensus-reached": 2,
  locked: 3,
};

// Dispute Window tab: the 24-hour transparency ledger where proposed slice
// allocations sit before locking in. Escrow freezing is backend-owned later.
export default function DisputeWindowTab({
  disputeWindowEntries,
  teamMembers,
}: {
  disputeWindowEntries: DisputeWindowEntry[];
  teamMembers: TeamMember[];
}) {
  const orderedEntries = disputeWindowEntries.toSorted(
    (firstEntry, secondEntry) => STATUS_ORDER[firstEntry.status] - STATUS_ORDER[secondEntry.status],
  );

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <p className="text-sm text-muted-foreground">
        Proposed slice allocations post here for 24 hours before locking in. Any member can dispute
        — disputed slices freeze in escrow until the team reaches consensus.
      </p>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">
          24-hour transparency ledger
        </h3>
        <div className="max-w-2xl space-y-3">
          {orderedEntries.map((disputeWindowEntry) => {
            const proposingMember = teamMembers.find(
              (teamMember) => teamMember.id === disputeWindowEntry.memberId,
            );
            if (!proposingMember) return null;
            return (
              <DisputeWindowEntryCard
                key={disputeWindowEntry.id}
                entry={disputeWindowEntry}
                member={proposingMember}
              />
            );
          })}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Dispute escrow is a display-only mock — freezing and consensus resolution are backend-owned
        later.
      </p>
    </div>
  );
}
