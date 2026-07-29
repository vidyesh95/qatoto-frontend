// TRANSPORT: props-only — presentational server component. Fetches nothing; the rollup
// arrives as props from governance-page, which read GET /governance/summary.
import Link from "next/link";

import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type {
  GovernancePeriodCounts,
  GovernanceProjectRollup,
} from "@/lib/rnd/compensation.schemas";

/**
 * Sums decimal-string cent totals exactly.
 *
 * `BigInt`, NEVER `Number`. These are `bigint` columns on the wire as strings, and a
 * committed-funding total across every project on the platform is precisely the number
 * most likely to pass 2^53 cents — at which point `Number` starts silently rounding
 * someone's money.
 */
function sumCentStrings(centStrings: readonly string[]): bigint {
  // `BigInt(0)` rather than the `0n` literal: this repo's tsconfig target predates ES2020
  // literals, and the constructor form compiles everywhere the app runs.
  return centStrings.reduce(
    (runningTotal, centString) => runningTotal + BigInt(centString),
    BigInt(0),
  );
}

/**
 * The cross-project rollup: COUNTS AND MECHANICS, NEVER PEOPLE.
 *
 * A statement line names a person and what they are owed. Pay is personal data under the
 * GDPR and specially sensitive in several member states, so nothing on this page carries a
 * member id, a name or a per-member amount — those stay on each project's own governance
 * tab, behind membership. This shape exists to make that impossible to get wrong.
 *
 * "COMMITTED" IS THE WHOLE CLAIM. `committedFundingInCents` sums pledges people committed
 * to. Nothing was collected, held, charged or escrowed, and no label here may imply
 * otherwise — Qatoto operates no money rail.
 *
 * `investorConfidenceBasisPoints` is NULL when no snapshot was ever computed, and null
 * renders as an absence. Coercing it to 0 would publish "no confidence" as a finding about
 * the project rather than about a job that has not run.
 */
export default function CommitmentsOverview({
  rows,
  platformTotals,
  asOf,
}: {
  rows: GovernanceProjectRollup[];
  platformTotals: GovernancePeriodCounts;
  asOf: string;
}) {
  // Per-project currencies can differ, so a single cross-project money total would be
  // adding rupees to dollars. Grouped by currency instead, which is the only honest sum.
  const currencies = [...new Set(rows.map((row) => row.currency))].toSorted();
  const committedByCurrency = currencies.map((currency) => ({
    currency,
    totalInCents: sumCentStrings(
      rows.filter((row) => row.currency === currency).map((row) => row.committedFundingInCents),
    ),
  }));

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Commitments and statements, project by project
        </h2>
        <p className="text-xs text-muted-foreground">
          Counts and totals only. Who was paid what stays inside each project, visible to its team —
          as of {formatIsoInstant(asOf)}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Committed funding</p>
          {committedByCurrency.length === 0 ? (
            <p className="text-xl font-semibold">—</p>
          ) : (
            committedByCurrency.map((total) => (
              <p key={total.currency} className="text-xl font-semibold">
                {formatMoneyFromCents(total.totalInCents, total.currency)}
              </p>
            ))
          )}
          <p className="text-xs text-muted-foreground">Committed, not collected or held.</p>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Statements finalized</p>
          <p className="text-xl font-semibold">{platformTotals.finalizedPeriodCount}</p>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Countersigned</p>
          <p className="text-xl font-semibold">{platformTotals.countersignedPeriodCount}</p>
          <p className="text-xs text-muted-foreground">
            By a second admin, never the one who finalized.
          </p>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Still open</p>
          <p className="text-xl font-semibold">{platformTotals.openPeriodCount}</p>
          <p className="text-xs text-muted-foreground">
            An open statement&apos;s figures still move.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Project</th>
              <th className="p-2 font-medium">Committed</th>
              <th className="p-2 font-medium">Open</th>
              <th className="p-2 font-medium">Finalized</th>
              <th className="p-2 font-medium">Countersigned</th>
              <th className="p-2 font-medium">Superseded</th>
              <th className="p-2 font-medium">Backer confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.projectSlug} className="border-t border-[#CAC4D0]/40">
                <td className="p-2">
                  <Link
                    href={`/research-and-development/project/${row.projectSlug}`}
                    className="font-medium hover:text-[#00696E]"
                  >
                    {row.projectName}
                  </Link>
                </td>
                <td className="p-2 tabular-nums">
                  {formatMoneyFromCents(BigInt(row.committedFundingInCents), row.currency)}
                </td>
                <td className="p-2 tabular-nums">{row.openPeriodCount}</td>
                <td className="p-2 tabular-nums">{row.finalizedPeriodCount}</td>
                <td className="p-2 tabular-nums">{row.countersignedPeriodCount}</td>
                <td className="p-2 tabular-nums">{row.supersededPeriodCount}</td>
                <td className="p-2">
                  {/* Never a defaulted 0 — that is a published finding about the project
                      rather than about the job that has not run. */}
                  {row.investorConfidenceBasisPoints === null
                    ? "Not computed"
                    : `${(row.investorConfidenceBasisPoints / 100).toFixed(0)}%`}
                  {row.investorConfidenceAsOf !== null && (
                    <span className="block text-xs text-muted-foreground">
                      {formatIsoInstant(row.investorConfidenceAsOf)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
