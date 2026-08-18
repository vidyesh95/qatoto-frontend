// TRANSPORT: client-query — `GET /admin/metrics/retention-cohorts` via `useRetentionCohortsQuery`.
"use client";

import {
  MetricsSection,
  MetricsStateNotice,
  toMetricsViewState,
  type MetricsViewState,
} from "@/components/admin/metrics/metrics-section";
import { useRetentionCohortsQuery } from "@/hooks/admin/platform-metrics";
import { formatCohortMonthLabel } from "@/lib/admin/metrics-window";
import type { RetentionCohortRow } from "@/lib/admin/platform-metrics.schemas";
import { formatCompactCountLabel } from "@/lib/feed/format";

// A TABLE, NOT A CHART. A cohort grid is a matrix of labelled numbers people read cell by cell and
// compare down a column; rendering it as rects would take the numbers away and give back nothing.
// It is here beside the two bar charts because it is the third question this page answers, not
// because it is the same kind of drawing.
//
// THREE PROPERTIES OF THE RESPONSE THIS RENDERER EXISTS TO HANDLE, all from the backend's SQL:
//
//   1. `retainedByMonthOffset` HOLDS COUNTS, not percentages. The percentage is computed here,
//      against `cohortUserCount`, with integer arithmetic so the same data renders identically on
//      the server and the client.
//   2. THE ARRAY IS RAGGED. Its length is the largest offset with any activity, so a trailing
//      offset is ABSENT rather than zero — "—", never "0%". An interior hole is a real zero and is
//      shown as one.
//   3. A COHORT WHERE NOBODY EVER WATCHED IS MISSING ENTIRELY. The backend inner-joins activity, so
//      a signup month with no watching produces no row at all. The grid therefore cannot be read as
//      "every month we have accounts for" and the footnote says so.

/** The shading ramp. Fixed class strings — Tailwind cannot see a computed one. */
const RETENTION_SHADE_STEPS: readonly {
  readonly minimumPercent: number;
  readonly className: string;
}[] = [
  { minimumPercent: 80, className: "bg-chart-1/85 text-background" },
  { minimumPercent: 60, className: "bg-chart-2/75 text-background" },
  { minimumPercent: 40, className: "bg-chart-3/65" },
  { minimumPercent: 20, className: "bg-chart-4/55" },
  { minimumPercent: 1, className: "bg-chart-5/45" },
];

function shadeClassNameForPercent(retainedPercent: number): string {
  return (
    RETENTION_SHADE_STEPS.find((step) => retainedPercent >= step.minimumPercent)?.className ??
    "bg-muted/40"
  );
}

export function RetentionCohortGrid({ monthCount }: { readonly monthCount: number }) {
  const retentionQuery = useRetentionCohortsQuery(monthCount);
  const view = toMetricsViewState(retentionQuery, (cohorts) => cohorts.length === 0);

  return (
    <MetricsSection
      title="Retention by signup month"
      description="Retained means the account had watch time that month — the only per-user activity this platform records. It is not 'logged in': nothing writes a last-seen, and a number no column supports has no business on this page."
      footnote="Month 0 is the signup month itself and is rarely 100% — an account created on the 30th has one day to watch anything. A dash means the month has not happened yet or produced no activity at all; a signup month where nobody ever watched does not appear as a row."
    >
      <RetentionCohortBody view={view} monthCount={monthCount} />
    </MetricsSection>
  );
}

function RetentionCohortBody({
  view,
  monthCount,
}: {
  readonly view: MetricsViewState<RetentionCohortRow[]>;
  readonly monthCount: number;
}) {
  switch (view.status) {
    case "loading":
      return <MetricsStateNotice message="Loading…" />;
    case "error":
      return <MetricsStateNotice message={view.message} />;
    case "empty":
      return <MetricsStateNotice message="No cohort has any recorded watch activity yet." />;
    case "ready": {
      const monthOffsets = Array.from({ length: monthCount }, (_unused, offset) => offset);

      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 border-separate border-spacing-0.5 text-xs">
            <caption className="sr-only">
              Share of each signup month&apos;s accounts with watch time in the months after
            </caption>
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-left font-medium">
                  Signed up
                </th>
                <th scope="col" className="px-2 py-1 text-right font-medium">
                  Accounts
                </th>
                {monthOffsets.map((offset) => (
                  <th key={offset} scope="col" className="px-2 py-1 text-center font-medium">
                    {offset === 0 ? "M0" : `M${String(offset)}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.data.map((cohort) => (
                <tr key={cohort.cohortMonth}>
                  <th scope="row" className="px-2 py-1 text-left font-normal whitespace-nowrap">
                    {formatCohortMonthLabel(cohort.cohortMonth)}
                  </th>
                  <td className="px-2 py-1 text-right text-muted-foreground">
                    {formatCompactCountLabel(cohort.cohortUserCount)}
                  </td>
                  {monthOffsets.map((offset) => {
                    const retainedCount = cohort.retainedByMonthOffset[offset];
                    if (retainedCount === undefined) {
                      return (
                        <td
                          key={offset}
                          className="px-2 py-1 text-center text-muted-foreground"
                          aria-label="Not applicable"
                        >
                          —
                        </td>
                      );
                    }

                    // Integer division on purpose: a float percent renders a sub-pixel apart
                    // between the server and the client and is a hydration mismatch waiting to
                    // happen — the same rule the chart geometry follows.
                    const retainedPercent =
                      cohort.cohortUserCount === 0
                        ? 0
                        : Math.round((retainedCount * 100) / cohort.cohortUserCount);

                    return (
                      <td
                        key={offset}
                        className={`px-2 py-1 text-center tabular-nums ${shadeClassNameForPercent(retainedPercent)}`}
                        title={`${String(retainedCount)} of ${String(cohort.cohortUserCount)} accounts`}
                      >
                        {retainedPercent}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
