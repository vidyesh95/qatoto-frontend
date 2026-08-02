"use client";

// TRANSPORT: client-query — seeded with the first page proof-of-effort-page already read on
// the server, then advances GET …/allocation-proposals by its instant cursor through
// `useKeysetList`.

import LoadMoreControl from "@/components/home/shared/load-more-control";
import RaiseDisputeIsland from "@/components/home/research-and-development/sections/raise-dispute-island";
import { rndKeys } from "@/hooks/rnd/keys";
import { toCursorKeysetPage, useKeysetList } from "@/hooks/keyset-list";
import { formatIsoDate, formatIsoInstant } from "@/lib/rnd/format";
import { listAllocationProposals } from "@/lib/rnd/proof-of-effort.api";
import type {
  AllocationProposal,
  AllocationProposalStatus,
} from "@/lib/rnd/proof-of-effort.schemas";

/** The server page reads this list at the backend's own default, so the island matches it. */
const PROPOSAL_PAGE_LIMIT = 25;

/**
 * Proposed allocations inside their windows, newest window first.
 *
 * THE CURSOR IS `<epochMs>_<id>` and it is ECHOED, NEVER BUILT. Building one would mean
 * turning `windowClosesAt` back into epoch milliseconds on the client, and the column's
 * precision is the backend's to own — it was microseconds until migration 0027 moved it to
 * `timestamp(3)` for exactly this reason. A cursor coarser than its column steps over rows
 * it can neither match nor pass, and a malformed one is a `422`, not a silent first page.
 *
 * ORDER IS `(windowClosesAt DESC, id DESC)`. The `id` tiebreaker used to run ASC, which no
 * btree could serve in one ordered scan — so every page sorted every proposal in the project
 * and then discarded the offset. Normalizing it fixed the sort and the paging together.
 *
 * NOTHING HERE IS IN THE LEDGER. The slices are proposed; a dispute freezes them in escrow,
 * reported separately rather than folded into the cap table. A page boundary must not change
 * that — appended rows are proposals too.
 */
export default function AllocationProposalsIsland({
  projectSlug,
  statusLabels,
  statusBadgeClasses,
  initialProposals,
  initialNextCursor,
}: {
  projectSlug: string;
  statusLabels: Record<AllocationProposalStatus, string>;
  statusBadgeClasses: Record<AllocationProposalStatus, string>;
  initialProposals: AllocationProposal[];
  initialNextCursor: string | null;
}) {
  const proposalList = useKeysetList<AllocationProposal>({
    queryKey: rndKeys.allocationProposals(projectSlug, undefined),
    initialPage: { rows: initialProposals, nextToken: initialNextCursor },
    // `page` is never sent alongside `cursor` — the backend would drop it silently. The
    // `typeof` guard states the token kind: `toCursorKeysetPage` only produces a string.
    fetchPage: (token) =>
      listAllocationProposals(projectSlug, {
        limit: PROPOSAL_PAGE_LIMIT,
        ...(typeof token === "string" ? { cursor: token } : {}),
      }).then(toCursorKeysetPage),
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {proposalList.rows.map((proposal) => (
          <li key={proposal.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{proposal.memberName}</p>
                <p className="text-xs text-muted-foreground">
                  For {formatIsoDate(proposal.claimedForDate)} · {proposal.claimSummary}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[proposal.status]}`}
              >
                {statusLabels[proposal.status]}
              </span>
            </div>

            <p className="mt-2 text-sm">
              {proposal.proposedSlices} slices proposed
              <span className="block text-xs text-muted-foreground">
                exact {proposal.proposedSliceNumerator}
                {proposal.escrowedSlices > 0 &&
                  ` · ${proposal.escrowedSlices} frozen in escrow while this is disputed`}
              </span>
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Window closes {formatIsoInstant(proposal.windowClosesAt)}
              {proposal.settledLedgerEntryId !== null && " · already in the ledger"}
            </p>

            {proposal.status === "open" && (
              <RaiseDisputeIsland projectSlug={projectSlug} proposalId={proposal.id} />
            )}
          </li>
        ))}
      </ul>
      <LoadMoreControl
        hasNextPage={proposalList.hasNextPage}
        isFetchingNextPage={proposalList.isFetchingNextPage}
        errorMessage={proposalList.loadMoreErrorMessage}
        onLoadNextPage={proposalList.loadNextPage}
        label="Load earlier windows"
      />
    </div>
  );
}
