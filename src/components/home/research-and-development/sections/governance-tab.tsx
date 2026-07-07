import type {
  EscrowDirection,
  EscrowVerificationStatus,
  ResearchProject,
} from "@/types/research-and-development";

const ESCROW_DIRECTION_BADGES: Record<EscrowDirection, { label: string; className: string }> = {
  in: { label: "In", className: "bg-green-100 text-green-800" },
  out: { label: "Out", className: "bg-red-100 text-red-800" },
};

const ESCROW_STATUS_BADGES: Record<EscrowVerificationStatus, { label: string; className: string }> =
  {
    verified: { label: "Verified", className: "bg-[#00696E]/10 text-[#00696E]" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
  };

const MOCK_HOURLY_PAYOUT_RATE_IN_DOLLARS = 18;

function parseAmountToNumber(displayAmount: string): number {
  return Number(displayAmount.replace(/[^0-9.]/g, ""));
}

function formatDollarAmount(amountInDollars: number): string {
  return `$${amountInDollars.toLocaleString()}`;
}

// Governance tab: fund-allocation summary, the escrow ledger, and per-member
// compensation. Every figure here is summed from static mock strings for
// display only — escrow and compensation math is server-owned later.
export default function GovernanceTab({ project }: { project: ResearchProject }) {
  const allocatedInDollars = project.escrowLedger
    .filter((ledgerEntry) => ledgerEntry.direction === "in")
    .reduce(
      (runningTotal, ledgerEntry) => runningTotal + parseAmountToNumber(ledgerEntry.amount),
      0,
    );
  const releasedInDollars = project.escrowLedger
    .filter((ledgerEntry) => ledgerEntry.direction === "out")
    .reduce(
      (runningTotal, ledgerEntry) => runningTotal + parseAmountToNumber(ledgerEntry.amount),
      0,
    );
  const heldInDollars = allocatedInDollars - releasedInDollars;

  const fundAllocationSummaries = [
    { label: "Allocated", amountInDollars: allocatedInDollars },
    { label: "Released", amountInDollars: releasedInDollars },
    { label: "Held", amountInDollars: heldInDollars },
  ];

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Fund allocation</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {fundAllocationSummaries.map((allocationSummary) => (
            <div
              key={allocationSummary.label}
              className="rounded-2xl border border-[#CAC4D0]/60 p-4"
            >
              <p className="text-xs text-muted-foreground">{allocationSummary.label}</p>
              <p className="text-xl font-semibold">
                {formatDollarAmount(allocationSummary.amountInDollars)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Display-only mock — escrow math is server-owned later.
        </p>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Escrow ledger</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 font-medium">Direction</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Milestone</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {project.escrowLedger.map((ledgerEntry) => {
                const directionBadge = ESCROW_DIRECTION_BADGES[ledgerEntry.direction];
                const statusBadge = ESCROW_STATUS_BADGES[ledgerEntry.verificationStatus];
                const linkedMilestoneTitle =
                  project.milestones.find(
                    (milestone) => milestone.id === ledgerEntry.linkedMilestoneId,
                  )?.title ?? "—";

                return (
                  <tr key={ledgerEntry.id} className="border-b border-border/50">
                    <td className="py-2 pr-4 whitespace-nowrap">{ledgerEntry.date}</td>
                    <td className="py-2 pr-4">{ledgerEntry.description}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${directionBadge.className}`}
                      >
                        {directionBadge.label}
                      </span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{ledgerEntry.amount}</td>
                    <td className="py-2 pr-4">{linkedMilestoneTitle}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Member compensation</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Member</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Hours logged</th>
                <th className="py-2 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {project.teamMembers.map((teamMember) => (
                <tr key={teamMember.id} className="border-b border-border/50">
                  <td className="py-2 pr-4">{teamMember.name}</td>
                  <td className="py-2 pr-4">{teamMember.role}</td>
                  <td className="py-2 pr-4">{teamMember.effortHoursLogged}</td>
                  <td className="py-2 whitespace-nowrap">
                    {formatDollarAmount(
                      teamMember.effortHoursLogged * MOCK_HOURLY_PAYOUT_RATE_IN_DOLLARS,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Calculated from logged effort — mock rate, backend-owned later.
        </p>
      </section>
    </div>
  );
}
