// TRANSPORT: props-only — presentational server component. Fetches nothing; the caller's
// own lines arrive as props from governance-page, which read GET /governance/summary.
import Link from "next/link";

import {
  formatEffortFromMinutes,
  formatMoneyFromCents,
  formatPeriodRange,
  formatSignedEquityFromBasisPoints,
} from "@/lib/rnd/format";
import type {
  CompensationPeriodLineKind,
  GovernanceCallerLine,
} from "@/lib/rnd/compensation.schemas";

const LINE_KIND_LABELS: Record<CompensationPeriodLineKind, string> = {
  cash_retainer: "Cash · retainer",
  cash_hourly: "Cash · hourly",
  equity_delta: "Equity delta",
};

/**
 * The caller's OWN open statement lines — the one exception to this page's
 * no-people rule.
 *
 * A member may always see their own figures, on any surface, and these are reached only
 * through their own `project_member` rows. Nobody else's line is ever shaped into this,
 * and a signed-out caller gets an empty list rather than a sign-in wall: the rest of the
 * page is public and must keep rendering.
 *
 * THESE NUMBERS ARE NOT FINAL. Every line here belongs to an OPEN period, which is
 * recomputed nightly until someone finalizes it. Saying so is the difference between a
 * running total and a promise.
 *
 * `equityBasisPointsDelta` IS SIGNED and a negative delta is the model working: a share
 * falls when others out-contribute you in a period. Rendering it unsigned would hide the
 * one thing Slicing Pie exists to compute.
 */
export default function CallerOpenLines({ lines }: { lines: GovernanceCallerLine[] }) {
  if (lines.length === 0) return null;

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Your own open lines</h2>
        <p className="text-xs text-muted-foreground">
          Only you can see these. They belong to statements that are still open, so the figures move
          until someone finalizes them.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {lines.map((line) => (
          <li
            key={`${line.periodId}-${line.kind}`}
            className="space-y-1 rounded-2xl border border-[#CAC4D0]/60 p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link
                href={`/research-and-development/project/${line.projectSlug}`}
                className="text-sm font-medium hover:text-[#00696E]"
              >
                {line.projectSlug}
              </Link>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {LINE_KIND_LABELS[line.kind]}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {formatPeriodRange(line.periodStartDate, line.periodEndDate)}
            </p>

            {/* Cash and equity are never summed. A cash line has an amount and an equity
                line has a delta; a line carrying one has null for the other. */}
            {line.grossAmountInCents !== null && line.currency !== null && (
              <p className="text-lg font-semibold">
                {formatMoneyFromCents(BigInt(line.grossAmountInCents), line.currency)}
                <span className="block text-xs font-normal text-muted-foreground">
                  Gross. No tax or withholding is computed anywhere on Qatoto.
                </span>
              </p>
            )}

            {line.equityBasisPointsDelta !== null && (
              <p className="text-lg font-semibold">
                {formatSignedEquityFromBasisPoints(line.equityBasisPointsDelta)}
                <span className="block text-xs font-normal text-muted-foreground">
                  Change in your share this period.
                </span>
              </p>
            )}

            {line.effortMinutes !== null && (
              <p className="text-xs text-muted-foreground">
                {formatEffortFromMinutes(line.effortMinutes)} of verified effort
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
