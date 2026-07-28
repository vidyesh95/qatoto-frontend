// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import DisputeCaseCard from "@/components/home/research-and-development/cards/dispute-case-card";
import DisputeWindowEntryCard from "@/components/home/research-and-development/cards/dispute-window-entry-card";
import RaiseDisputeSheet from "@/components/home/research-and-development/sheets/raise-dispute-sheet";
import type {
  DisputeCase,
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
// allocations sit before locking in, plus the raise / vote / resolve path over
// them (§14.1). Disputed slices freeze *outside the pie* — a pool of slices,
// never money. Qatoto holds no funds anywhere in this domain.
export default function DisputeWindowTab({
  disputeWindowEntries,
  disputeCases,
  teamMembers,
}: {
  disputeWindowEntries: DisputeWindowEntry[];
  disputeCases: DisputeCase[];
  teamMembers: TeamMember[];
}) {
  const orderedEntries = disputeWindowEntries.toSorted(
    (firstEntry, secondEntry) => STATUS_ORDER[firstEntry.status] - STATUS_ORDER[secondEntry.status],
  );
  const openEntries = disputeWindowEntries.filter((entry) => entry.status === "open");
  const openCases = disputeCases.filter((disputeCase) => disputeCase.status !== "resolved");
  const resolvedCases = disputeCases.filter((disputeCase) => disputeCase.status === "resolved");

  const findAllocationSummary = (disputeWindowEntryId: string) =>
    disputeWindowEntries.find((entry) => entry.id === disputeWindowEntryId)
      ?.proposedAllocationSummary;

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Proposed slice allocations post here for 24 hours before locking in. Any member can
          dispute one — disputed slices freeze outside the pie until the team votes, and no
          member&apos;s cash is affected either way.
        </p>
        <RaiseDisputeSheet openEntries={openEntries} />
      </div>

      {openCases.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Open cases — your vote</h3>
          <p className="text-xs text-muted-foreground">
            A slice decision made about you is a decision you can contest. Every case names who
            raised it, what they saw, and how each member voted.
          </p>
          <div className="max-w-2xl space-y-3">
            {openCases.map((disputeCase) => (
              <DisputeCaseCard
                key={disputeCase.id}
                disputeCase={disputeCase}
                teamMembers={teamMembers}
                allocationSummary={findAllocationSummary(disputeCase.disputeWindowEntryId)}
              />
            ))}
          </div>
        </section>
      )}

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

      {resolvedCases.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Resolved cases</h3>
          <div className="max-w-2xl space-y-3">
            {resolvedCases.map((disputeCase) => (
              <DisputeCaseCard
                key={disputeCase.id}
                disputeCase={disputeCase}
                teamMembers={teamMembers}
                allocationSummary={findAllocationSummary(disputeCase.disputeWindowEntryId)}
              />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Disputes, votes and quorum are display-only mocks — freezing, tallying and write-back are
        backend-owned later.
      </p>
    </div>
  );
}
