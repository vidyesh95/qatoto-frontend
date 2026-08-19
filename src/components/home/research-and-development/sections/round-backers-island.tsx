// TRANSPORT: client-query — "use client" island. Reads GET /funding-rounds/:roundId/backers,
// and only once a reader expands the list.
"use client";

import { useState } from "react";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useRoundBackersQuery } from "@/hooks/rnd/funding";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type { PledgeStatus } from "@/lib/rnd/funding.schemas";

/**
 * Who actually backed this round.
 *
 * THIS REPLACES A FABRICATION. The four `/dummy/*.avif` faces that once sat here were
 * deleted because they were invented; the count stayed and the names did not. This is the
 * list that deletion was waiting for, and every name in it comes off the wire.
 *
 * COLLAPSED BY DEFAULT, DELIBERATELY. The read is one request per round. Mounted open on a
 * page that lists many rounds it would be one request per card for a list nobody asked to
 * see, which is precisely why the avatar stack was not simply re-pointed at the endpoint.
 *
 * THE LIST IS OFTEN SHORTER THAN `backersCount`, AND THAT IS NOT A BUG. The backend returns
 * commitments that still stand — cancelled, failed and refunded pledges leave the list. So
 * this component never renders its own length as the backer count, and never contradicts
 * the count printed above it.
 *
 * NO MONEY MOVED. `amountInCents` is a commitment, so the copy says committed. A `settled`
 * status means the two parties settled it between themselves; Qatoto held nothing and
 * charged nothing at any point.
 */

const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  committed: "Committed",
  settled: "Settled directly",
  cancelled: "Withdrawn",
  failed: "Failed",
  refunded: "Refunded",
};

export default function RoundBackersIsland({
  roundId,
  backersCount,
}: {
  roundId: string;
  backersCount: number;
}) {
  const [isListOpen, setIsListOpen] = useState(false);

  // `undefined` until opened — the hook's `enabled` guard is what keeps this to one
  // request per round, fired on expand rather than on mount.
  const backersQuery = useRoundBackersQuery(isListOpen ? roundId : undefined);

  const backersError =
    backersQuery.error instanceof ApiRequestError ? backersQuery.error.apiError : null;

  if (backersCount === 0) return null;

  if (!isListOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsListOpen(true)}
        className="cursor-pointer text-xs font-medium text-[#00696E] underline"
      >
        Who backed this round?
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium tracking-wide">Backers</h4>
        <button
          type="button"
          onClick={() => setIsListOpen(false)}
          className="cursor-pointer text-xs text-muted-foreground underline"
        >
          Hide
        </button>
      </div>

      {backersQuery.isPending && <p className="text-xs text-muted-foreground">Loading backers…</p>}

      {backersError !== null && <MutationErrorNotice error={backersError} />}

      {backersQuery.data?.length === 0 && (
        <p className="text-xs text-muted-foreground">No commitment on this round still stands.</p>
      )}

      {backersQuery.data !== undefined && backersQuery.data.length > 0 && (
        <>
          <ul className="space-y-1">
            {backersQuery.data.map((backer) => (
              <li
                key={backer.pledgeId}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/50 py-1.5 text-xs last:border-b-0"
              >
                <span className="font-medium">
                  {backer.backerName}
                  {/* Null handle is an absence — never fall back to the name with an `@`. */}
                  {backer.backerHandle !== null && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      @{backer.backerHandle}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground">
                  {formatMoneyFromCents(BigInt(backer.amountInCents), backer.currency)} ·{" "}
                  {PLEDGE_STATUS_LABELS[backer.status]} · {formatIsoInstant(backer.pledgedAt)}
                </span>
              </li>
            ))}
          </ul>
          {backersQuery.data.length !== backersCount && (
            <p className="text-xs text-muted-foreground">
              {backersQuery.data.length} of {backersCount} commitments still stand. Withdrawn
              commitments leave this list.
            </p>
          )}
        </>
      )}
    </div>
  );
}
