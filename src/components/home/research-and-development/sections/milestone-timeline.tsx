// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET …/milestones.
import { formatEffortFromMinutes, formatIsoDate, formatMoneyFromCents } from "@/lib/rnd/format";
import type { Milestone, MilestoneStatus, MilestoneVariance } from "@/lib/rnd/funding.schemas";

const MILESTONE_STATUS_STYLES: Record<
  MilestoneStatus,
  { label: string; dotClassName: string; chipClassName: string }
> = {
  planned: {
    label: "Planned",
    dotClassName: "bg-muted",
    chipClassName: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In progress",
    dotClassName: "bg-background ring-2 ring-[#00696E]",
    chipClassName: "bg-[#D6E3FF] text-[#191C1C]",
  },
  done: {
    label: "Done",
    dotClassName: "bg-[#00696E] text-white",
    chipClassName: "bg-[#00696E]/10 text-[#00696E]",
  },
  cancelled: {
    label: "Cancelled",
    dotClassName: "bg-muted",
    chipClassName: "bg-muted text-muted-foreground",
  },
};

const BASIS_POINTS_PER_PERCENT = 100;
const NO_PLANNED_PAYOUT = BigInt(0);

/**
 * `varianceBasisPoints` is SIGNED — negative is behind, positive is ahead — which is
 * what replaces the mock's `varianceLabel: "26% behind"`. That one string carried a
 * magnitude, a direction and a judgement at once, and none of the three could be
 * localized or compared across rows.
 *
 * Zero is "on pace", a real finding, and must not fall into the same branch as behind.
 */
function describeVariance(varianceBasisPoints: number): {
  label: string;
  chipClassName: string;
} {
  const magnitudePercent = Math.abs(varianceBasisPoints) / BASIS_POINTS_PER_PERCENT;
  if (varianceBasisPoints === 0) {
    return { label: "On pace", chipClassName: "bg-[#00696E]/10 text-[#00696E]" };
  }
  if (varianceBasisPoints > 0) {
    return { label: `${magnitudePercent}% ahead`, chipClassName: "bg-green-100 text-green-800" };
  }
  return { label: `${magnitudePercent}% behind`, chipClassName: "bg-amber-100 text-amber-800" };
}

/**
 * The unit noun TRAVELS WITH THE NUMBER (`scheduleUnitKey`) so no client hardcodes an
 * English word and comparing two variance rows means reading the key rather than
 * guessing what "12" counted.
 */
function formatScheduleDuration(
  durationDays: number,
  scheduleUnitKey: MilestoneVariance["scheduleUnitKey"],
): string {
  if (scheduleUnitKey === "weeks") {
    const durationWeeks = Math.round((durationDays / 7) * 10) / 10;
    return `${durationWeeks} week${durationWeeks === 1 ? "" : "s"}`;
  }
  return `${durationDays} day${durationDays === 1 ? "" : "s"}`;
}

/**
 * Vertical milestone timeline for the Overview tab.
 *
 * `plannedPayoutInCents` is what the project INTENDS to pay when the milestone lands.
 * It replaces the mock's `escrowReleaseAmount`, renamed as well as retyped because
 * Qatoto holds no funds, releases none and operates no payment rail here — nine escrow
 * routes now 404. Nothing in this component may imply money moves through the platform.
 */
export default function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <ol>
      {milestones.map((milestone, milestoneIndex) => {
        const statusStyle = MILESTONE_STATUS_STYLES[milestone.status];
        const isLastMilestone = milestoneIndex === milestones.length - 1;
        const plannedPayoutInCents = BigInt(milestone.plannedPayoutInCents);
        const variance = milestone.variance;

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
              {milestone.description && (
                <p className="text-sm text-muted-foreground">{milestone.description}</p>
              )}
              {milestone.dueDate && (
                <p className="text-xs text-muted-foreground">
                  Target: {formatIsoDate(milestone.dueDate)}
                </p>
              )}
              {plannedPayoutInCents > NO_PLANNED_PAYOUT && (
                <span className="inline-block rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
                  Planned payout {formatMoneyFromCents(plannedPayoutInCents, milestone.currency)}
                </span>
              )}
              {variance && (
                <div className="mt-2 space-y-1.5 rounded-xl border border-[#CAC4D0]/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium">Production variance</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${describeVariance(variance.varianceBasisPoints).chipClassName}`}
                    >
                      {describeVariance(variance.varianceBasisPoints).label}
                    </span>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>Schedule:</dt>
                      <dd className="text-foreground">
                        {formatScheduleDuration(
                          variance.actualDurationDays,
                          variance.scheduleUnitKey,
                        )}{" "}
                        of{" "}
                        {formatScheduleDuration(
                          variance.plannedDurationDays,
                          variance.scheduleUnitKey,
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Cost:</dt>
                      <dd className="text-foreground">
                        {formatMoneyFromCents(
                          BigInt(variance.actualCostInCents),
                          variance.currency,
                        )}{" "}
                        of{" "}
                        {formatMoneyFromCents(
                          BigInt(variance.plannedCostInCents),
                          variance.currency,
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>Effort:</dt>
                      <dd className="text-foreground">
                        {formatEffortFromMinutes(variance.actualEffortMinutes)} of{" "}
                        {formatEffortFromMinutes(variance.plannedEffortMinutes)}
                      </dd>
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
