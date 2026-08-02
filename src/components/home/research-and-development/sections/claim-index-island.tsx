"use client";

// TRANSPORT: client-query — seeded with the first page proof-of-effort-page already read on
// the server, then advances GET …/effort-claims by its date cursor through `useKeysetList`.

import ClaimDetailDisclosure from "@/components/home/research-and-development/sections/claim-detail-disclosure";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import { rndKeys } from "@/hooks/rnd/keys";
import { toCursorKeysetPage, useKeysetList } from "@/hooks/keyset-list";
import { formatIsoDate, formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import { listEffortClaims } from "@/lib/rnd/proof-of-effort.api";
import type { ClaimSummary, EffortVerificationStatus } from "@/lib/rnd/proof-of-effort.schemas";

/** Matches `CLAIMS_PAGE_LIMIT` on the server page, so pages stay a uniform size. */
const CLAIMS_PAGE_LIMIT = 25;

/**
 * The claim index, ordered `(claimedForDate DESC, id DESC)`, with the rest of it reachable.
 *
 * THE CURSOR IS `<YYYY-MM-DD>_<id>` and it is ECHOED, NEVER BUILT. The date half is a
 * calendar date the backend keeps as a string end to end precisely so it never passes
 * through a `Date` — putting a date-only value through one is how a day shifts by one in a
 * non-UTC zone. Constructing a cursor here would reintroduce that on the client, and a
 * malformed one is a `422`, not a silent first page.
 *
 * SENDING A CURSOR PUTS THE READ IN KEYSET MODE, which drops the `pagination` block — the
 * backend skips the `COUNT` rather than reporting a total of zero beneath a list of claims.
 * Nothing here reads a total, so there is nothing to lose. `page` is never sent alongside:
 * it would be silently dropped.
 */
export default function ClaimIndexIsland({
  projectSlug,
  projectCurrency,
  viewerProjectRole,
  selectedClaimStatus,
  statusLabels,
  statusBadgeClasses,
  initialClaims,
  initialNextCursor,
}: {
  projectSlug: string;
  projectCurrency: string;
  viewerProjectRole: string | null;
  selectedClaimStatus: EffortVerificationStatus | undefined;
  statusLabels: Record<EffortVerificationStatus, string>;
  statusBadgeClasses: Record<EffortVerificationStatus, string>;
  initialClaims: ClaimSummary[];
  initialNextCursor: string | null;
}) {
  const claimList = useKeysetList<ClaimSummary>({
    // The status is in the key because it is a SERVER filter — a different status is a
    // different list, and its pages must not accumulate on top of the previous one's.
    queryKey: rndKeys.claims(projectSlug, { status: selectedClaimStatus }),
    initialPage: { rows: initialClaims, nextToken: initialNextCursor },
    // `page` is never sent alongside `cursor` — the backend would drop it silently. The
    // `typeof` guard states the token kind: `toCursorKeysetPage` only produces a string.
    fetchPage: (token) =>
      listEffortClaims(projectSlug, {
        limit: CLAIMS_PAGE_LIMIT,
        ...(selectedClaimStatus === undefined ? {} : { status: selectedClaimStatus }),
        ...(typeof token === "string" ? { cursor: token } : {}),
      }).then(toCursorKeysetPage),
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {claimList.rows.map((claim) => (
          <li key={claim.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{claim.memberName}</p>
                <p className="text-xs text-muted-foreground">
                  For {formatIsoDate(claim.claimedForDate)} ·{" "}
                  {claim.sourceKind === "daily_log" ? "From a daily log" : "From receipts"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses[claim.verificationStatus]}`}
              >
                {statusLabels[claim.verificationStatus]}
              </span>
            </div>

            <p className="mt-2 text-sm">{claim.claimSummary}</p>

            <p className="mt-2 text-xs text-muted-foreground">
              {/* Null is not zero. A claim with no grounded minutes has not been
                  graded; one with 0 was graded and found nothing. */}
              {claim.groundedMinutes === null
                ? "No grounded minutes yet"
                : `${claim.groundedMinutes} grounded minutes`}
              {claim.overriddenMinutes !== null &&
                ` · overridden to ${claim.overriddenMinutes} after review`}
              {claim.groundedCashInCents !== null &&
                ` · ${formatMoneyFromCents(BigInt(claim.groundedCashInCents), projectCurrency)} cash`}
              {claim.verdictReachedAt !== null &&
                ` · verdict ${formatIsoInstant(claim.verdictReachedAt)}`}
            </p>

            <ClaimDetailDisclosure
              projectSlug={projectSlug}
              claimId={claim.id}
              initialVerificationStatus={claim.verificationStatus}
              projectCurrency={projectCurrency}
              viewerProjectRole={viewerProjectRole}
            />
          </li>
        ))}
      </ul>
      <LoadMoreControl
        hasNextPage={claimList.hasNextPage}
        isFetchingNextPage={claimList.isFetchingNextPage}
        errorMessage={claimList.loadMoreErrorMessage}
        onLoadNextPage={claimList.loadNextPage}
        label="Load older claims"
      />
    </div>
  );
}
