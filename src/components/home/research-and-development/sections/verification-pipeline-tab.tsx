// TRANSPORT: props-only — presentational server component. Fetches nothing; the claim
// index and the caller's receipts arrive as view states from proof-of-effort-page, which
// read GET …/effort-claims and GET …/physical-receipts. The per-claim disclosure below is
// a client island of its own.
import ClaimDetailDisclosure from "@/components/home/research-and-development/sections/claim-detail-disclosure";
import ClaimSubmitIsland from "@/components/home/research-and-development/sections/claim-submit-island";
import FilterChipRow, {
  type FilterChipOption,
} from "@/components/home/research-and-development/sections/filter-chip-row";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { buildFilterHref, type RawSearchParams } from "@/lib/rnd/filter-href";
import { formatIsoDate, formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type {
  ClaimSummary,
  EffortVerificationStatus,
  PhysicalReceipt,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedListViewState } from "@/lib/rnd/view-state";

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
 * THE HUMAN-REVIEW QUEUE IS `?claimStatus=flagged_for_review`, forwarded to the backend as
 * `?status=` and applied in SQL. No override-queue endpoint exists and there is no
 * `VerificationOverrideRequest` concept server-side; the flagged claims ARE the queue.
 * Recorded in R_AND_D_BACKEND_STRUCTURE.md Appendix D, because this is the EU AI Act
 * Art. 14 surface and which shape it has matters.
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
  claimsState: MemberScopedListViewState<ClaimSummary>;
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
        return (
          <ul className="space-y-3">
            {claimsState.rows.map((claim) => (
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
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_STATUS_BADGE_CLASS[claim.verificationStatus]}`}
                  >
                    {VERIFICATION_STATUS_LABELS[claim.verificationStatus]}
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
