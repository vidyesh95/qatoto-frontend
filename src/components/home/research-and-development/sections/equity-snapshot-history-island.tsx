// TRANSPORT: client-query — "use client" island. Reads GET …/equity/snapshots, and only
// once a reader expands the history.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useEquitySnapshotsQuery } from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { formatEquityFromBasisPoints, formatIsoInstant } from "@/lib/rnd/format";
import type { EquitySnapshot } from "@/lib/rnd/proof-of-effort.schemas";

/**
 * How the cap table got to where it is.
 *
 * THE BLOCK ABOVE THIS ONE IS `NOW`; THIS ONE IS `OVER TIME`. `getProofOfEffortSummary`
 * embeds the current snapshot and `slice-ledger-tab` renders it in full. These are the
 * nightly recalculations behind it, newest first. Never present one as a substitute for
 * the other — a member reading a historical row must be able to tell it is history.
 *
 * A DEGENERATE SNAPSHOT IS A REAL STATE, NOT A ZERO. Shares sum to exactly 10000 basis
 * points UNLESS `isDegenerate`, in which case every share is 0 and they do not sum at all.
 * The same refusal to normalize applies here as in the current-snapshot block: nothing
 * fills the remainder, because a project nobody has contributed to has no cap table.
 *
 * ONCE `isBaked` IS TRUE THE HISTORY STOPS GROWING. The nightly job skips a baked project
 * entirely, so the newest row is the last one there will ever be.
 */
export default function EquitySnapshotHistoryIsland({ projectSlug }: { projectSlug: string }) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);

  const snapshotsQuery = useEquitySnapshotsQuery(isHistoryOpen ? projectSlug : undefined);

  const snapshotsError =
    snapshotsQuery.error instanceof ApiRequestError ? snapshotsQuery.error.apiError : null;

  if (!isHistoryOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsHistoryOpen(true)}
        className="cursor-pointer text-xs font-medium text-[#00696E] underline"
      >
        How did this pie get here?
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium tracking-wide">Recalculation history</h4>
        <button
          type="button"
          onClick={() => setIsHistoryOpen(false)}
          className="cursor-pointer text-xs text-muted-foreground underline"
        >
          Hide
        </button>
      </div>

      {snapshotsQuery.isPending && (
        <p className="text-xs text-muted-foreground">Loading the history…</p>
      )}

      {snapshotsError !== null && <MutationErrorNotice error={snapshotsError} />}

      {snapshotsQuery.data?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          The cap table has never been computed for this project.
        </p>
      )}

      {snapshotsQuery.data !== undefined && snapshotsQuery.data.length > 0 && (
        <ul className="space-y-2">
          {snapshotsQuery.data.map((snapshot) => (
            <li key={snapshot.id} className="rounded-2xl border border-[#CAC4D0]/60 p-3">
              {renderSnapshotRow(snapshot)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  function renderSnapshotRow(snapshot: EquitySnapshot) {
    const isExpanded = expandedSnapshotId === snapshot.id;

    return (
      <>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-xs font-medium">
            As of {formatIsoInstant(snapshot.asOf)}
            {snapshot.isBaked && (
              <span className="ml-2 rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[#00696E]">
                Baked
              </span>
            )}
            {snapshot.isDegenerate && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                Nothing awarded yet
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {snapshot.totalSlices} slices · {snapshot.memberCount} member
            {snapshot.memberCount === 1 ? "" : "s"}
          </span>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Computed {formatIsoInstant(snapshot.computedAt)} through ledger entry #
          {snapshot.throughLedgerSequenceNumber} using {snapshot.apportionmentAlgorithm}.
        </p>

        {snapshot.shares.length > 0 && (
          <button
            type="button"
            onClick={() => setExpandedSnapshotId(isExpanded ? null : snapshot.id)}
            className="mt-1 cursor-pointer text-xs font-medium text-[#00696E] underline"
          >
            {isExpanded ? "Hide the split" : "Show the split"}
          </button>
        )}

        {isExpanded && (
          <ul className="mt-2 space-y-1">
            {snapshot.shares.map((share) => (
              <li
                key={share.memberId}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <span className="truncate">{share.memberName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatEquityFromBasisPoints(share.equityBasisPoints)} · {share.slices} slices
                </span>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
}
