import Image from "next/image";

import type { MemberSliceBreakdown, TeamMember } from "@/types/research-and-development";

// Per-member Slicing Pie tile: locked fair-market rate, the worked time/cash
// slice equations, and the resulting slice + live-equity totals. Every figure
// is a pre-computed display string — the formula is backend-owned later.
export default function MemberSliceBreakdownCard({
  breakdown,
  member,
}: {
  breakdown: MemberSliceBreakdown;
  member: TeamMember;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        <Image
          src={member.avatarImageSrc}
          width={48}
          height={48}
          alt={member.name}
          className="size-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{member.name}</p>
          <p className="truncate text-xs text-muted-foreground">{member.role}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
          {breakdown.lockedFairMarketRateLabel} locked
        </span>
      </div>
      <div className="space-y-1.5">
        <div>
          <p className="text-xs text-muted-foreground">Time × 2</p>
          <p className="text-sm">{breakdown.timeSliceEquationLabel}</p>
        </div>
        {breakdown.cashSliceEquationLabel && (
          <div>
            <p className="text-xs text-muted-foreground">Cash × 4</p>
            <p className="text-sm">{breakdown.cashSliceEquationLabel}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded bg-[#D6E3FF] px-1.5 py-0.5 font-medium text-[#191C1C]">
          {breakdown.totalSlicesLabel}
        </span>
        <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 font-medium text-[#00696E]">
          {breakdown.liveEquityShareLabel} live equity
        </span>
        <span>{breakdown.verifiedUnpaidHoursLabel} verified</span>
      </div>
    </div>
  );
}
