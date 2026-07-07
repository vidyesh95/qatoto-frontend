import type { Milestone, MilestoneStatus } from "@/types/research-and-development";

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
            </div>
          </li>
        );
      })}
    </ol>
  );
}
