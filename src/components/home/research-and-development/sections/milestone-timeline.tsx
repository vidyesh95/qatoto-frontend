import type {
  Milestone,
  MilestoneStatus,
  MilestoneVarianceStatus,
} from "@/types/research-and-development";

const MILESTONE_VARIANCE_STYLES: Record<
  MilestoneVarianceStatus,
  { label: string; chipClassName: string }
> = {
  "on-track": { label: "On track", chipClassName: "bg-[#00696E]/10 text-[#00696E]" },
  ahead: { label: "Ahead", chipClassName: "bg-green-100 text-green-800" },
  behind: { label: "Behind", chipClassName: "bg-amber-100 text-amber-800" },
  "at-risk": { label: "At risk", chipClassName: "bg-red-100 text-red-800" },
};

const MILESTONE_STATUS_STYLES: Record<
  MilestoneStatus,
  { label: string; dotClassName: string; chipClassName: string }
> = {
  done: {
    label: "Done",
    dotClassName: "bg-[#00696E] text-white",
    chipClassName: "bg-[#00696E]/10 text-[#00696E]",
  },
  current: {
    label: "In progress",
    dotClassName: "bg-background ring-2 ring-[#00696E]",
    chipClassName: "bg-[#D6E3FF] text-[#191C1C]",
  },
  upcoming: {
    label: "Upcoming",
    dotClassName: "bg-muted",
    chipClassName: "bg-muted text-muted-foreground",
  },
};

// Vertical milestone timeline for the Overview tab: a left rail of status
// dots joined by a connector line, with per-milestone escrow-release chips.
// Escrow releases are display-only mocks — the ledger is backend-owned later.
export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol>
      {milestones.map((milestone, milestoneIndex) => {
        const statusStyle = MILESTONE_STATUS_STYLES[milestone.status];
        const isLastMilestone = milestoneIndex === milestones.length - 1;

        return (
          <li key={milestone.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLastMilestone && (
              <span
                aria-hidden
                className="absolute top-6 left-3 -ml-px h-full border-l border-border"
              />
            )}
            <span
              className={`z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs ${statusStyle.dotClassName}`}
            >
              {milestone.status === "done" ? "✓" : null}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {milestone.title}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.chipClassName}`}
                >
                  {statusStyle.label}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">{milestone.description}</p>
              <p className="text-xs text-muted-foreground">Target: {milestone.targetDate}</p>
              {milestone.escrowReleaseAmount && (
                <span className="inline-block rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
                  Releases {milestone.escrowReleaseAmount} from escrow
                </span>
              )}
              {milestone.variance && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-[#CAC4D0]/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">Production variance</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${MILESTONE_VARIANCE_STYLES[milestone.variance.varianceStatus].chipClassName}`}
                    >
                      {MILESTONE_VARIANCE_STYLES[milestone.variance.varianceStatus].label} ·{" "}
                      {milestone.variance.varianceLabel}
                    </span>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>Expected:</dt>
                      <dd className="text-foreground">
                        {milestone.variance.expectedQuantityLabel}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Actual:</dt>
                      <dd className="text-foreground">{milestone.variance.actualQuantityLabel}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Quality:</dt>
                      <dd className="text-foreground">{milestone.variance.qualityMetricLabel}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
