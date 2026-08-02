"use client";

// TRANSPORT: client-query — seeded with the first page project-detail already read on the
// server, then advances GET …/compensation-periods by `?beforeSequenceNumber=` through
// `useKeysetList`.

import CompensationPeriodIsland from "@/components/home/research-and-development/sections/compensation-period-island";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import { rndKeys } from "@/hooks/rnd/keys";
import { useKeysetList, type KeysetToken } from "@/hooks/keyset-list";
import { listCompensationPeriods } from "@/lib/rnd/compensation.api";
import type {
  CompensationPeriodStatus,
  CompensationPeriodSummary,
} from "@/lib/rnd/compensation.schemas";
import { formatIsoInstant, formatPeriodRange, shortenHashForDisplay } from "@/lib/rnd/format";

/** Matches `COMPENSATION_PERIOD_LIMIT` on the server page, so pages stay a uniform size. */
const COMPENSATION_PERIOD_LIMIT = 12;

/**
 * THE ONLY LIST HERE WHOSE TOKEN THE SERVER DOES NOT SEND.
 *
 * `GET …/compensation-periods` answers with a BARE ARRAY — no `pagination`, no `nextCursor`,
 * no `nextSequence` — and the backend intends the client to echo the last row's
 * `sequenceNumber` back as `?beforeSequenceNumber=`, which it filters with a strict `<`.
 * That is safe in a way constructing a cursor is not: `sequenceNumber` is a plain integer the
 * row itself carries and is unique per project, so there is nothing to encode, no precision
 * to lose and no timezone to shift. It is never keyed on a date — two periods cannot share a
 * sequence number, but a cursor on a non-unique column skips rows.
 *
 * HOW "IS THERE MORE?" IS DECIDED, and why it is weaker here than everywhere else: with no
 * token and no count, a FULL PAGE is the only available signal. So a final page that happens
 * to hold exactly `limit` rows costs one extra request that comes back empty, after which the
 * control disappears. That is the honest reading of what the endpoint says — the alternative
 * is hiding the control while rows remain, which is worse.
 */
function deriveNextToken(
  periods: readonly CompensationPeriodSummary[],
  requestedLimit: number,
): KeysetToken | null {
  if (periods.length < requestedLimit) return null;
  return periods.at(-1)?.sequenceNumber ?? null;
}

export default function CompensationPeriodsIsland({
  projectSlug,
  viewerProjectRole,
  periodStatusLabels,
  initialPeriods,
}: {
  projectSlug: string;
  viewerProjectRole: string | null;
  periodStatusLabels: Record<CompensationPeriodStatus, string>;
  initialPeriods: CompensationPeriodSummary[];
}) {
  const periodList = useKeysetList<CompensationPeriodSummary>({
    queryKey: rndKeys.compensationPeriods(projectSlug, undefined),
    initialPage: {
      rows: initialPeriods,
      nextToken: deriveNextToken(initialPeriods, COMPENSATION_PERIOD_LIMIT),
    },
    fetchPage: (token) =>
      listCompensationPeriods(projectSlug, {
        limit: COMPENSATION_PERIOD_LIMIT,
        ...(typeof token === "number" ? { beforeSequenceNumber: token } : {}),
      }).then((result) =>
        result.success
          ? {
              success: true as const,
              data: {
                rows: result.data,
                nextToken: deriveNextToken(result.data, COMPENSATION_PERIOD_LIMIT),
              },
            }
          : result,
      ),
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {periodList.rows.map((period) => (
          <li key={period.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">
                  {formatPeriodRange(period.periodStartDate, period.periodEndDate)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Statement #{period.sequenceNumber} · {period.timeZone}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {periodStatusLabels[period.status]}
              </span>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {period.status === "open"
                ? period.lastDraftedAt === null
                  ? "The nightly draft has not run yet — that is not the same as everyone being owed zero."
                  : `Last recomputed ${formatIsoInstant(period.lastDraftedAt)}. These figures still move.`
                : period.finalizedAt !== null &&
                  `Finalized ${formatIsoInstant(period.finalizedAt)}`}
              {period.countersignedAt !== null &&
                ` · countersigned ${formatIsoInstant(period.countersignedAt)}`}
              {period.statementHash !== null && ` · ${shortenHashForDisplay(period.statementHash)}`}
            </p>

            {period.supersededByPeriodId !== null && (
              <p className="mt-1 text-xs text-amber-800">
                Corrected by a later statement. Nothing here was edited — a correction is always a
                new statement.
              </p>
            )}

            <CompensationPeriodIsland
              projectSlug={projectSlug}
              periodId={period.id}
              periodStatus={period.status}
              isCountersigned={period.countersignedAt !== null}
              viewerProjectRole={viewerProjectRole}
            />
          </li>
        ))}
      </ul>
      <LoadMoreControl
        hasNextPage={periodList.hasNextPage}
        isFetchingNextPage={periodList.isFetchingNextPage}
        errorMessage={periodList.loadMoreErrorMessage}
        onLoadNextPage={periodList.loadNextPage}
        label="Load earlier statements"
      />
    </div>
  );
}
