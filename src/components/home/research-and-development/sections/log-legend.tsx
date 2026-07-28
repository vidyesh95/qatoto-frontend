// TRANSPORT: props-only — presentational server component. Fetches nothing.
import { EFFORT_VERIFICATION_STATUSES } from "@/lib/rnd/daily-logs.schemas";
import { EFFORT_VERIFICATION_STATUS_LABELS } from "@/lib/rnd/labels";
import type { EffortVerificationStatus } from "@/lib/rnd/daily-logs.schemas";

/**
 * What each of the six verification states means.
 *
 * The vocabulary is now the SHIPPED enum rather than a hand-kept list — the tuple is
 * the source, so a seventh backend state becomes a compile error in this record instead
 * of a silently missing row. Cards render these states directly now, which is why the
 * old caveat about "today's single verified badge" is gone.
 *
 * Every meaning is about the CHECK, never about the person: a state other than
 * `verified` says what the pipeline could establish, not that someone did less work.
 */
const EFFORT_VERIFICATION_STATUS_MEANINGS: Record<EffortVerificationStatus, string> = {
  not_run: "No verification has been attempted on this log.",
  queued: "Waiting for a verification run to pick it up.",
  running: "A run is in progress; there is no verdict yet.",
  verified: "The claim matched the evidence.",
  flagged_for_review:
    "A human decides, in writing, and can reverse the flag. Cash is untouched either way.",
  unverified: "The run finished without enough evidence to confirm the claim.",
};

/**
 * Stage 04 legend.
 *
 * THE AI-TAG HALF IS GONE. `DailyLogView` carries no `aiSummaryChips` — they live on
 * `GET …/daily-logs/:logId` alone — so no card in the feed below shows a tag, and a
 * legend for symbols that never appear teaches a vocabulary the page does not speak.
 * It returns when the feed row does.
 */
export default function LogLegend() {
  return (
    <section className="px-4 lg:px-6">
      <div className="max-w-2xl space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <h2 className="text-sm font-medium tracking-wide">What verification can say</h2>
        <ul className="space-y-2">
          {EFFORT_VERIFICATION_STATUSES.map((verificationStatus) => (
            <li key={verificationStatus} className="flex flex-wrap items-baseline gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {EFFORT_VERIFICATION_STATUS_LABELS[verificationStatus]}
              </span>
              <span className="text-xs text-muted-foreground">
                {EFFORT_VERIFICATION_STATUS_MEANINGS[verificationStatus]}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Six outcomes, not two. A log that is not verified has not been rejected — it may simply be
          waiting its turn.
        </p>
      </div>
    </section>
  );
}
