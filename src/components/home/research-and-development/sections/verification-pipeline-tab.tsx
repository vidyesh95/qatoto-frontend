// TRANSPORT: props-only — presentational server component. Fetches nothing; the claim
// index and the caller's receipts arrive as view states from proof-of-effort-page, which
// read GET …/effort-claims and GET …/physical-receipts. The claim index is a client-query
// island — it pages the rest of the index by `?cursor=` — the per-claim disclosure inside
// it is another, and the review queue is a third (it reads GET …/override-queue itself,
// because it must refetch when a step is answered).
import ClaimIndexIsland from "@/components/home/research-and-development/sections/claim-index-island";
import ClaimSubmitIsland from "@/components/home/research-and-development/sections/claim-submit-island";
import OverrideQueueIsland from "@/components/home/research-and-development/sections/override-queue-island";
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import { formatIsoInstant } from "@/lib/rnd/format";
import type {
  ClaimSummary,
  EffortVerificationStatus,
  PhysicalReceipt,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedCursorListViewState, MemberScopedListViewState } from "@/lib/view-state";

const VERIFICATION_STATUS_LABELS: Record<EffortVerificationStatus, string> = {
  not_run: "Not run",
  queued: "Queued",
  running: "Running",
  verified: "Verified",
  flagged_for_review: "Flagged for review",
  unverified: "Unverified — zero slices",
};

/**
 * `flagged_for_review` is amber, not red. A flagged claim is real work withheld pending a
 * human, and colouring it as a failure tells the member they were caught at something.
 */
const VERIFICATION_STATUS_BADGE_CLASS: Record<EffortVerificationStatus, string> = {
  not_run: "bg-muted text-muted-foreground",
  queued: "bg-muted text-muted-foreground",
  running: "bg-[#D6E3FF] text-[#191C1C]",
  verified: "bg-[#00696E]/10 text-[#00696E]",
  flagged_for_review: "bg-amber-100 text-amber-800",
  unverified: "bg-red-100 text-red-800",
};

/** The three statuses worth a chip. The other three are transient pipeline states. */
const FILTERABLE_STATUSES: EffortVerificationStatus[] = [
  "flagged_for_review",
  "verified",
  "unverified",
];

/**
 * The verification pipeline: the claim index, one claim's full run history on demand, and
 * the receipts a physical claim can cite.
 *
 * THE INDEX IS NOT THE DETAIL. `GET …/effort-claims` returns a summary row per claim — who,
 * when, how much, what the verdict was — because the detail view fans out to runs, steps
 * and evidence, which is four queries per claim and catastrophic for a page of twenty.
 * Opening a row fetches the rest.
 *
 * ⚠️ THE HUMAN-REVIEW QUEUE IS ITS OWN READ, `GET …/override-queue`, AND THIS FILE USED TO
 * SAY IT DID NOT EXIST. The claim was that `?claimStatus=flagged_for_review` was the queue
 * because no override-queue endpoint existed; the route has been declared in
 * `proof-of-effort.routes.ts` since the domain shipped and only the client wrapper was
 * missing. This is the EU AI Act Art. 14 surface, so a comment about its shape being wrong
 * was not a stale note — it was the surface describing itself incorrectly.
 *
 * THE HALF THAT WAS RIGHT: there is still no `VerificationOverrideRequest` entity, and there
 * must not be. The queue is a PREDICATE over facts that already exist —
 * `verification_step.status = 'flagged' AND overridden_status IS NULL` — so answering a step
 * removes it in the same statement that records the answer. A request table would duplicate
 * the flag's timestamp, author and finding, and could say review was pending on a step
 * somebody had already answered.
 *
 * THE CHIP AND THE QUEUE ARE BOTH KEPT, because they are different units. The chip filters
 * CLAIMS; the queue lists STEPS. A claim with one answered step and one still waiting
 * appears under the chip either way, which tells a reviewer nothing about what is left.
 *
 * ANY MEMBER SEES ANY MEMBER'S CLAIMS. That is §9's transparency posture rather than a
 * leak: people sharing a pie can audit what everyone else was credited for.
 */
export default function VerificationPipelineTab({
  claimsState,
  receiptsState,
  projectSlug,
  projectCurrency,
  viewerProjectRole,
  searchParams,
  selectedClaimStatus,
}: {
  claimsState: MemberScopedCursorListViewState<ClaimSummary>;
  receiptsState: MemberScopedListViewState<PhysicalReceipt>;
  projectSlug: string;
  projectCurrency: string;
  viewerProjectRole: string | null;
  searchParams: RawSearchParams;
  selectedClaimStatus: EffortVerificationStatus | undefined;
}) {
  const statusChips: FilterChipOption[] = [
    {
      label: "All claims",
      href: buildFilterHref(searchParams, { claimStatus: undefined }),
      isSelected: selectedClaimStatus === undefined,
    },
    ...FILTERABLE_STATUSES.map((status) => ({
      label: VERIFICATION_STATUS_LABELS[status],
      href: buildFilterHref(searchParams, { claimStatus: status }),
      isSelected: selectedClaimStatus === status,
    })),
  ];

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {/* Above the index on purpose: the index is a record, the queue is work. A reviewer
          opening this tab is answering what is waiting far more often than browsing what
          has already been decided. */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Waiting on a person</h3>
          <p className="text-xs text-muted-foreground">
            Steps the pipeline flagged and nobody has answered. Maintainers can answer them here.
          </p>
        </div>
        <OverrideQueueIsland
          projectSlug={projectSlug}
          projectCurrency={projectCurrency}
          viewerProjectRole={viewerProjectRole}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Claims</h3>
          <p className="text-xs text-muted-foreground">
            Every member can see every member&apos;s claims — that is the point of a shared pie.
          </p>
        </div>
        <FilterChipRow options={statusChips} ariaLabel="Filter claims by verification status" />
        {renderClaims()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Your physical receipts</h3>
        {renderReceipts()}
      </section>

      <ClaimSubmitIsland
        projectSlug={projectSlug}
        receipts={receiptsState.status === "ready" ? receiptsState.rows : []}
        viewerProjectRole={viewerProjectRole}
      />
    </div>
  );

  function renderClaims() {
    switch (claimsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the claims." />;
      case "restricted":
        return claimsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's claims." />
        ) : (
          <RndMembersOnlyPanel message="Claims are visible to this project's team." />
        );
      case "empty":
        return (
          <RndStatusPanel
            message={
              selectedClaimStatus === undefined
                ? "No claims have been filed yet."
                : "No claims with that verification status."
            }
          />
        );
      case "ready":
        // The rows moved into an island so the rest of the index is reachable — this tab
        // still owns the first page, which the server already read, and still owns the
        // status chips, which are URL state rather than client state.
        return (
          <ClaimIndexIsland
            projectSlug={projectSlug}
            projectCurrency={projectCurrency}
            viewerProjectRole={viewerProjectRole}
            selectedClaimStatus={selectedClaimStatus}
            statusLabels={VERIFICATION_STATUS_LABELS}
            statusBadgeClasses={VERIFICATION_STATUS_BADGE_CLASS}
            initialClaims={claimsState.rows}
            initialNextCursor={claimsState.nextCursor}
          />
        );
      default: {
        const exhaustiveCheck: never = claimsState;
        return exhaustiveCheck;
      }
    }
  }

  function renderReceipts() {
    switch (receiptsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load your receipts." />;
      case "restricted":
        return <RndMembersOnlyPanel message="Receipts are visible to this project's team." />;
      case "empty":
        return (
          <RndStatusPanel message="You have uploaded no receipts. Physical work is claimed by photographing it — the capture times in the image are what the minutes come from." />
        );
      case "ready":
        return (
          <ul className="grid gap-3 sm:grid-cols-2">
            {receiptsState.rows.map((receipt) => (
              <li key={receipt.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="font-medium">{receipt.receiptKind.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {/* Null capture time is the whole story on a physical claim: with no
                      EXIF there is no span to derive minutes from. */}
                  {receipt.capturedAt === null
                    ? "No capture time in the file"
                    : `Captured ${formatIsoInstant(receipt.capturedAt)}`}
                  {receipt.claimId !== null && " · cited by a claim"}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs">
                  {receipt.forensics.map((check) => (
                    <li key={check.checkKind}>
                      <span className="text-muted-foreground">
                        {check.checkKind.replaceAll("_", " ")}:
                      </span>{" "}
                      {check.result.replaceAll("_", " ")}
                      {check.findingSummary !== null && ` — ${check.findingSummary}`}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = receiptsState;
        return exhaustiveCheck;
      }
    }
  }
}
