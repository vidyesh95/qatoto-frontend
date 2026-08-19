// TRANSPORT: props-only — presentational server component. Fetches nothing; rounds
// and the confidence signal arrive as view states from a parent that read
// GET …/funding-rounds and GET …/investor-confidence.
import FundingManagementIsland from "@/components/home/research-and-development/sections/funding-management-island";
import PledgeIsland from "@/components/home/research-and-development/sections/pledge-island";
import RoundBackersIsland from "@/components/home/research-and-development/sections/round-backers-island";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type {
  FundingRound,
  FundingRoundType,
  InvestorConfidence,
  Milestone,
} from "@/lib/rnd/funding.schemas";
import type { MemberScopedItemViewState, MemberScopedListViewState } from "@/lib/view-state";

const FUNDING_ROUND_TYPE_LABELS: Record<FundingRoundType, string> = {
  equity: "Equity",
  crowdfunding: "Crowdfunding",
  venture: "Venture",
};

const BASIS_POINTS_PER_PERCENT = 100;
const FULLY_FUNDED_BASIS_POINTS = 10000;

type FundingTabProps = {
  fundingRoundsState: MemberScopedListViewState<FundingRound>;
  investorConfidenceState: MemberScopedItemViewState<InvestorConfidence>;
  milestonesState: MemberScopedListViewState<Milestone>;
  projectSlug: string;
  projectCurrency: string;
  viewerProjectRole: string | null;
};

/**
 * Funding tab: the open round with its progress, past rounds, and the confidence meter.
 *
 * TWO FABRICATIONS WERE DELETED HERE.
 *
 * The confidence meter was a module constant, `INVESTOR_CONFIDENCE_PERCENT = 78`, drawn
 * as a real measurement. `…/investor-confidence` **404s when the signal was never
 * computed**, and the frontend cannot distinguish that from "not a member" — both now
 * render as an absence. A default would publish a finding nobody computed.
 *
 * The backer avatar stack was four `/dummy/*.avif` files presented as this round's
 * backers. The count stayed and the invented faces did not. The honest list now exists:
 * `RoundBackersIsland` reads `GET /funding-rounds/:roundId/backers`, and because that is
 * one request per round it stays COLLAPSED until a reader asks for it.
 *
 * A pledge is a COMMITMENT. `raisedAmountInCents` sums committed pledges; Qatoto holds
 * no funds and charges nobody in this domain, so no copy here may imply a rail, a hold
 * or a fee.
 */
export default function FundingTab({
  fundingRoundsState,
  investorConfidenceState,
  milestonesState,
  projectSlug,
  projectCurrency,
  viewerProjectRole,
}: FundingTabProps) {
  function renderRounds() {
    switch (fundingRoundsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load this project's funding rounds." />;
      case "restricted":
        return fundingRoundsState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's funding rounds." />
        ) : (
          <RndMembersOnlyPanel message="Funding rounds are visible to this project's team." />
        );
      case "empty":
        return <RndStatusPanel message="This project has never opened a round." />;
      case "ready":
        return renderRoundSections(fundingRoundsState.rows);
      default: {
        const exhaustiveCheck: never = fundingRoundsState;
        return exhaustiveCheck;
      }
    }
  }

  function renderRoundSections(fundingRounds: FundingRound[]) {
    const openRound = fundingRounds.find((fundingRound) => fundingRound.status === "open");
    const closedRounds = fundingRounds.filter((fundingRound) => fundingRound.status === "closed");

    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Current round</h3>
          {openRound ? (
            renderOpenRound(openRound)
          ) : (
            <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
              No open round right now.
            </p>
          )}
        </section>
        {closedRounds.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-medium tracking-wide xl:text-lg">Past rounds</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-md text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Goal</th>
                    <th className="py-2 pr-4 font-medium">Committed</th>
                    <th className="py-2 font-medium">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {closedRounds.map((closedRound) => (
                    <tr key={closedRound.id} className="border-b border-border/50">
                      <td className="py-2 pr-4">{FUNDING_ROUND_TYPE_LABELS[closedRound.type]}</td>
                      <td className="py-2 pr-4">
                        {formatMoneyFromCents(
                          BigInt(closedRound.goalAmountInCents),
                          closedRound.currency,
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {formatMoneyFromCents(
                          BigInt(closedRound.raisedAmountInCents),
                          closedRound.currency,
                        )}
                      </td>
                      <td className="py-2">
                        {closedRound.closedAt ? formatIsoInstant(closedRound.closedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    );
  }

  function renderOpenRound(openRound: FundingRound) {
    // May exceed 10000 — an over-funded round is a real state, so the LABEL keeps the
    // true figure even though the bar itself is capped at full width.
    const fundedPercent = openRound.percentageFundedBasisPoints / BASIS_POINTS_PER_PERCENT;
    const barWidthPercent =
      Math.min(openRound.percentageFundedBasisPoints, FULLY_FUNDED_BASIS_POINTS) /
      BASIS_POINTS_PER_PERCENT;

    return (
      <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <span className="inline-block rounded-full bg-[#D6E3FF] px-2 py-0.5 text-xs font-medium text-[#191C1C]">
          {FUNDING_ROUND_TYPE_LABELS[openRound.type]}
        </span>
        <p className="text-lg font-semibold">
          {formatMoneyFromCents(BigInt(openRound.raisedAmountInCents), openRound.currency)}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            committed of{" "}
            {formatMoneyFromCents(BigInt(openRound.goalAmountInCents), openRound.currency)} goal
          </span>
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${barWidthPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {fundedPercent}% · {openRound.backersCount} backer
          {openRound.backersCount === 1 ? "" : "s"}
          {openRound.closesAt && ` · Closes ${formatIsoInstant(openRound.closesAt)}`}
        </p>
        <p className="text-xs text-muted-foreground">
          A pledge is a commitment to the founder, not a charge. Qatoto holds no funds.
        </p>
        <RoundBackersIsland roundId={openRound.id} backersCount={openRound.backersCount} />
        <PledgeIsland roundId={openRound.id} roundTitle={openRound.title} />
      </div>
    );
  }

  function renderInvestorConfidence() {
    if (investorConfidenceState.status !== "ready") {
      // Restricted and never-computed are indistinguishable on the wire, and both are
      // an absence. Rendering a number here would be inventing one.
      return (
        <p className="text-xs text-muted-foreground">
          No confidence signal has been computed for this project.
        </p>
      );
    }

    const confidence = investorConfidenceState.item;
    const confidencePercent = confidence.confidenceBasisPoints / BASIS_POINTS_PER_PERCENT;

    return (
      <>
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium tracking-wide xl:text-lg">Investor confidence</h3>
          <span className="text-xs font-semibold text-[#00696E]">{confidencePercent} / 100</span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#00696E]"
            style={{ width: `${confidencePercent}%` }}
          />
          <span
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[#00696E]"
            style={{ left: `${confidencePercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {confidence.verifiedMilestoneCount} of {confidence.totalMilestoneCount} milestones
          verified · {confidence.dailyLogStreakDays}-day log streak · {confidence.openDisputeCount}{" "}
          open dispute
          {confidence.openDisputeCount === 1 ? "" : "s"}
        </p>
        {/* Stored, not live — say when it was computed rather than implying "now". */}
        <p className="text-xs text-muted-foreground">As of {formatIsoInstant(confidence.asOf)}</p>
      </>
    );
  }

  return (
    <div className="space-y-6 px-4 lg:px-6">
      {renderRounds()}
      <section className="max-w-xl space-y-2">{renderInvestorConfidence()}</section>
      <FundingManagementIsland
        projectSlug={projectSlug}
        rounds={fundingRoundsState.status === "ready" ? fundingRoundsState.rows : []}
        milestones={milestonesState.status === "ready" ? milestonesState.rows : []}
        projectCurrency={projectCurrency}
        viewerProjectRole={viewerProjectRole}
      />
    </div>
  );
}
