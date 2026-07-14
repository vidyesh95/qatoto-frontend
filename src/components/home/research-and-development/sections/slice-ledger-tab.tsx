import Image from "next/image";

import MemberSliceBreakdownCard from "@/components/home/research-and-development/cards/member-slice-breakdown-card";
import type {
  PieStatus,
  ProjectProofOfEffortLedger,
  TeamMember,
} from "@/types/research-and-development";

const PIE_STATUS_BADGES: Record<PieStatus, { label: string; className: string }> = {
  dynamic: { label: "Dynamic — recalculating daily", className: "bg-[#00696E]/10 text-[#00696E]" },
  baked: { label: "Baked — percentages frozen", className: "bg-[#D6E3FF] text-[#191C1C]" },
};

const SLICE_SEGMENT_COLORS = ["#00696E", "#1DBDC5", "#4A6363", "#7DA0A2", "#B4D2D4"];

// Slice ledger tab: pie status, the slice pool as a stacked bar with an
// open-role reserve, and per-member Slicing Pie breakdowns. Every figure is a
// pre-computed display string — the deterministic formula is backend-owned later.
export default function SliceLedgerTab({
  ledger,
  teamMembers,
}: {
  ledger: ProjectProofOfEffortLedger;
  teamMembers: TeamMember[];
}) {
  const pieStatusBadge = PIE_STATUS_BADGES[ledger.pieStatus];
  const sliceSegments = ledger.memberSliceBreakdowns.flatMap((breakdown, breakdownIndex) => {
    const member = teamMembers.find((teamMember) => teamMember.id === breakdown.memberId);
    if (!member) return [];
    return [
      {
        breakdown,
        member,
        color: SLICE_SEGMENT_COLORS[breakdownIndex % SLICE_SEGMENT_COLORS.length],
      },
    ];
  });
  const slicePoolSummaries = [
    { label: "Total slice pool", valueLabel: ledger.totalSlicesInPoolLabel },
    { label: "Open-role reserve", valueLabel: ledger.reservedSlicesLabel },
    {
      label: "Members earning",
      valueLabel: `${ledger.memberSliceBreakdowns.length} of ${teamMembers.length} members`,
    },
  ];

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">How the pie is calculated</h3>
        <div className="flex flex-col gap-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
          <span
            className={`flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${pieStatusBadge.className}`}
          >
            {ledger.pieStatus === "baked" && (
              <Image
                src="/icons/lock_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                width={16}
                height={16}
                alt=""
              />
            )}
            {pieStatusBadge.label}
          </span>
          <p className="text-sm text-muted-foreground">{ledger.pieStatusNote}</p>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Slice pool</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {slicePoolSummaries.map((poolSummary) => (
            <div key={poolSummary.label} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
              <p className="text-xs text-muted-foreground">{poolSummary.label}</p>
              <p className="text-xl font-semibold">{poolSummary.valueLabel}</p>
            </div>
          ))}
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {sliceSegments.map((segment) => (
            <div
              key={segment.member.id}
              style={{
                width: `${segment.breakdown.sliceSharePercent}%`,
                backgroundColor: segment.color,
              }}
            />
          ))}
          <div className="flex-1 bg-muted" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {sliceSegments.map((segment) => (
            <span key={segment.member.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              {segment.member.name} — {segment.breakdown.totalSlicesLabel}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-muted" />
            Reserve — {ledger.reservedSlicesLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{ledger.reservedSlicesNote}</p>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Member breakdowns</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sliceSegments.map((segment) => (
            <MemberSliceBreakdownCard
              key={segment.member.id}
              breakdown={segment.breakdown}
              member={segment.member}
            />
          ))}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">
        Slice math is a display-only mock — the deterministic Slicing Pie formula runs on the
        backend later.
      </p>
    </div>
  );
}
