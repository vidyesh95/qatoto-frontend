// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

import { formatMoneyFromCents } from "@/components/home/research-and-development/sections/compensation-format";
import type { GovernanceProjectRollupRow } from "@/types/research-and-development";

// Cross-project rollup: counts and committed totals, never people. Per-member
// statement lines stay on each project's own governance tab, behind membership
// — a line names a person and what they are owed, and publishing that to anyone
// with the URL is what this shape exists to prevent.
export default function CommitmentsOverview({ rows }: { rows: GovernanceProjectRollupRow[] }) {
  const totalCommittedInCents = rows.reduce(
    (runningTotal, row) => runningTotal + row.committedFundingInCents,
    0,
  );
  const totalFinalizedPeriodCount = rows.reduce(
    (runningTotal, row) => runningTotal + row.finalizedPeriodCount,
    0,
  );
  const totalCountersignedPeriodCount = rows.reduce(
    (runningTotal, row) => runningTotal + row.countersignedPeriodCount,
    0,
  );

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Commitments and statements, project by project
        </h2>
        <p className="text-xs text-muted-foreground">
          Committed totals are sums of pledged commitments. Nothing has been collected, charged or
          held — a backer settles directly with the project when the time comes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Committed across all projects</p>
          <p className="text-xl font-semibold">
            {formatMoneyFromCents(totalCommittedInCents, "USD")}
          </p>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Statements finalized</p>
          <p className="text-xl font-semibold">{totalFinalizedPeriodCount}</p>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Countersigned by a second admin</p>
          <p className="text-xl font-semibold">{totalCountersignedPeriodCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Project
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Open
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Finalized
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Countersigned
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Superseded
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Committed
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.projectId} className="border-t border-[#CAC4D0]/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/research-and-development/project/${row.projectId}`}
                    className="font-medium hover:underline"
                  >
                    {row.projectName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">{row.openPeriodCount}</td>
                <td className="px-4 py-3 text-right">{row.finalizedPeriodCount}</td>
                <td className="px-4 py-3 text-right">{row.countersignedPeriodCount}</td>
                <td className="px-4 py-3 text-right">{row.supersededPeriodCount}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoneyFromCents(row.committedFundingInCents, row.currency)}
                </td>
                {/* Never computed reads as absent. A 0 here would publish "no
                    confidence" as a finding about the project rather than
                    about the job that has not run. */}
                <td className="px-4 py-3 text-right">
                  {row.investorConfidencePoints === null ? (
                    <span className="text-xs text-muted-foreground">Not computed yet</span>
                  ) : (
                    <span className="font-medium text-[#00696E]">
                      {row.investorConfidencePoints}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        A finalized statement that nobody countersigned is still a one-sided document — the second
        signature is what makes it a shared record.
      </p>
    </section>
  );
}
