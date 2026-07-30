"use client";

// TRANSPORT: client-query — seeded with the first page proof-of-effort-page already read on
// the server, then advances GET …/slice-ledger by `?fromSequence=` through `useKeysetList`.

import LoadMoreControl from "@/components/home/research-and-development/sections/load-more-control";
import { rndKeys } from "@/hooks/rnd/keys";
import { toSequenceKeysetPage, useKeysetList } from "@/hooks/rnd/keyset-list";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import { listSliceLedger } from "@/lib/rnd/proof-of-effort.api";
import type { LedgerEntry } from "@/lib/rnd/proof-of-effort.schemas";

/** Matches `LEDGER_PAGE_LIMIT` on the server page, so pages stay a uniform size. */
const LEDGER_PAGE_LIMIT = 50;

/**
 * The append-only ledger, ordered by `sequenceNumber` ASC, with the rest of it reachable.
 *
 * PAGED BY `fromSequence`, NEVER BY `page`. This is the exact shape where OFFSET drifts: an
 * award written between two page fetches shifts every later page by one and the reader
 * silently skips a row. On a slice ledger that row is somebody's equity, so the drift is not
 * a cosmetic problem — it is a member's contribution disappearing from the audit surface
 * built to show it. The sequence is gapless and monotonic by construction, which is what
 * makes it a safe cursor.
 */
export default function SliceLedgerRowsIsland({
  projectSlug,
  projectCurrency,
  initialEntries,
  initialNextSequence,
}: {
  projectSlug: string;
  projectCurrency: string;
  initialEntries: LedgerEntry[];
  initialNextSequence: number | null;
}) {
  const ledger = useKeysetList<LedgerEntry>({
    queryKey: rndKeys.sliceLedger(projectSlug),
    initialPage: { rows: initialEntries, nextToken: initialNextSequence },
    // `fromSequence` NEVER `page`: `toSequenceKeysetPage` only produces a number, and the
    // guard says so rather than asserting it.
    fetchPage: (token) =>
      listSliceLedger(projectSlug, {
        limit: LEDGER_PAGE_LIMIT,
        ...(typeof token === "number" ? { fromSequence: token } : {}),
      }).then(toSequenceKeysetPage),
  });

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">#</th>
              <th className="p-2 font-medium">Member</th>
              <th className="p-2 font-medium">Kind</th>
              <th className="p-2 font-medium">Slices</th>
              <th className="p-2 font-medium">Effort / cash</th>
              <th className="p-2 font-medium">Occurred</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((entry) => (
              <tr key={entry.id} className="border-t border-[#CAC4D0]/40">
                <td className="p-2 tabular-nums">{entry.sequenceNumber}</td>
                <td className="p-2">{entry.memberName}</td>
                <td className="p-2">
                  {entry.entryKind === "reversal" ? "Reversal" : "Award"} ·{" "}
                  {entry.contributionKind === "cash" ? "Cash" : "Time"}
                </td>
                <td className="p-2 tabular-nums">
                  {entry.slicesAwarded}
                  {/* The exact rational, kept beside the rounded integer so the
                      half-slice is never presented as if it vanished. */}
                  <span className="block text-xs text-muted-foreground">
                    exact {entry.sliceNumerator}
                  </span>
                </td>
                <td className="p-2">
                  {entry.effortMinutes !== null && `${entry.effortMinutes} min`}
                  {entry.cashInCents !== null &&
                    formatMoneyFromCents(BigInt(entry.cashInCents), projectCurrency)}
                </td>
                <td className="p-2">{formatIsoInstant(entry.occurredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <LoadMoreControl
        hasNextPage={ledger.hasNextPage}
        isFetchingNextPage={ledger.isFetchingNextPage}
        errorMessage={ledger.loadMoreErrorMessage}
        onLoadNextPage={ledger.loadNextPage}
        label="Load later entries"
      />
      <p className="text-xs text-muted-foreground">
        The ledger is append-only. A correction is a reversing entry, never an edit — which is why
        sequence numbers never have gaps and a deleted row would be detectable.
      </p>
    </div>
  );
}
