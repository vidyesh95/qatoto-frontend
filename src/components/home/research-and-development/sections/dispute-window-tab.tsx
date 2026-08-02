// TRANSPORT: props-only — presentational server component. Fetches nothing; proposals and
// disputes arrive as view states from proof-of-effort-page, which read
// GET …/allocation-proposals and GET …/disputes. The proposal list is a client-query island
// — it pages earlier windows by `?cursor=` — and the raise / vote / withdraw / resolve
// controls are client islands nested below.
import AllocationProposalsIsland from "@/components/home/research-and-development/sections/allocation-proposals-island";
import DisputeActionsIsland from "@/components/home/research-and-development/sections/dispute-actions-island";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant } from "@/lib/rnd/format";
import type {
  AllocationProposal,
  AllocationProposalStatus,
  Dispute,
  DisputeStatus,
} from "@/lib/rnd/proof-of-effort.schemas";
import type { MemberScopedCursorListViewState, MemberScopedListViewState } from "@/lib/view-state";

const PROPOSAL_STATUS_LABELS: Record<AllocationProposalStatus, string> = {
  open: "Window open",
  disputed: "Disputed — slices frozen",
  locked: "Settled",
  consensus_reached: "Settled by consensus",
};

const PROPOSAL_STATUS_BADGE_CLASS: Record<AllocationProposalStatus, string> = {
  open: "bg-[#D6E3FF] text-[#191C1C]",
  disputed: "bg-amber-100 text-amber-800",
  locked: "bg-[#00696E]/10 text-[#00696E]",
  consensus_reached: "bg-[#00696E]/10 text-[#00696E]",
};

const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Collecting votes",
  withdrawn: "Withdrawn by the raiser",
  consensus_reached: "Resolved",
};

/**
 * The dispute window: proposed allocations inside their windows, and the disputes raised
 * against them.
 *
 * THIS IS THE COMPLIANCE SURFACE. §14 and §7A.6 name it as the GDPR Art. 22 contestability
 * path — where a member contests an automated decision about what they earned. A backend
 * that offers contestability through an endpoint no screen calls does not, in practice,
 * offer it.
 *
 * NOTHING IS IN THE LEDGER WHILE A PROPOSAL IS `open`. The slices are proposed; a dispute
 * freezes them in escrow, reported SEPARATELY from the cap table's totals rather than
 * folded into them. A UI that showed proposed slices inside someone's percentage would be
 * paying out a decision nobody has made.
 *
 * `windowClosesAt` IS AN ISO INSTANT and is rendered as one. The old mock carried a
 * pre-rendered countdown string, which is wrong within a minute of the page loading.
 */
export default function DisputeWindowTab({
  proposalsState,
  disputesState,
  projectSlug,
  viewerProjectRole,
}: {
  proposalsState: MemberScopedCursorListViewState<AllocationProposal>;
  disputesState: MemberScopedListViewState<Dispute>;
  projectSlug: string;
  viewerProjectRole: string | null;
}) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">
          Allocations in their window
        </h3>
        <p className="text-xs text-muted-foreground">
          A proposed allocation sits in a window before it enters the ledger. Any active member can
          dispute it while the window is open; after that it settles automatically.
        </p>
        {renderProposals()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Disputes</h3>
        {renderDisputes()}
      </section>
    </div>
  );

  function renderProposals() {
    switch (proposalsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the allocation proposals." />;
      case "restricted":
        return proposalsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's allocations." />
        ) : (
          <RndMembersOnlyPanel message="Allocations are visible to this project's team." />
        );
      case "empty":
        return <RndStatusPanel message="No allocations are waiting in a window." />;
      case "ready":
        // The rows moved into an island so earlier windows are reachable — this tab still
        // owns the first page, which the server already read.
        return (
          <AllocationProposalsIsland
            projectSlug={projectSlug}
            statusLabels={PROPOSAL_STATUS_LABELS}
            statusBadgeClasses={PROPOSAL_STATUS_BADGE_CLASS}
            initialProposals={proposalsState.rows}
            initialNextCursor={proposalsState.nextCursor}
          />
        );
      default: {
        const exhaustiveCheck: never = proposalsState;
        return exhaustiveCheck;
      }
    }
  }

  function renderDisputes() {
    switch (disputesState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the disputes." />;
      case "restricted":
        return <RndMembersOnlyPanel message="Disputes are visible to this project's team." />;
      case "empty":
        return <RndStatusPanel message="Nothing has been disputed." />;
      case "ready":
        return (
          <ul className="space-y-3">
            {disputesState.rows.map((dispute) => (
              <li key={dispute.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">Raised by {dispute.raisedByName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatIsoInstant(dispute.createdAt)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {DISPUTE_STATUS_LABELS[dispute.status]}
                  </span>
                </div>

                <p className="mt-2 text-sm">{dispute.disputeNote}</p>

                {/* The quorum is FROZEN at raise time. Recounting today's roster would let
                    someone joining mid-vote move the threshold under a vote in progress. */}
                <p className="mt-2 text-xs text-muted-foreground">
                  {dispute.votes.length} of {dispute.quorumMemberCount} members have voted — the
                  quorum was fixed when the dispute was raised, so joining now does not change it.
                </p>

                {dispute.votes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs">
                    {dispute.votes.map((vote) => (
                      <li key={vote.voterMemberId}>
                        <span className="font-medium">{vote.voterName}</span>:{" "}
                        {vote.position.replaceAll("_", " ")}
                        {vote.note !== null && ` — ${vote.note}`}
                      </li>
                    ))}
                  </ul>
                )}

                {dispute.resolution !== null && (
                  <p className="mt-2 rounded-xl bg-muted/50 p-3 text-xs">
                    Resolved {dispute.resolution.replaceAll("_", " ")}
                    {dispute.resolvedAt !== null && ` on ${formatIsoInstant(dispute.resolvedAt)}`}
                    {dispute.resolutionNote !== null && ` — ${dispute.resolutionNote}`}
                    {/* A voided allocation still writes a ledger entry, at zero. */}
                    {dispute.resolution === "voided" &&
                      " · a zero-slice entry was written, so the decision is on the record rather than a gap in it"}
                    {dispute.resolution === "re_verified" &&
                      " · a scoped re-verification ran and the allocation settled at the number it derived"}
                  </p>
                )}

                {dispute.status === "open" && (
                  <DisputeActionsIsland
                    projectSlug={projectSlug}
                    disputeId={dispute.id}
                    viewerProjectRole={viewerProjectRole}
                  />
                )}
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = disputesState;
        return exhaustiveCheck;
      }
    }
  }
}
