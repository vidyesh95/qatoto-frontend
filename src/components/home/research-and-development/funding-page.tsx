// TRANSPORT: server-fetch — server component. Reads GET /funding/deals (requireAuth) via
// @/lib/rnd/funding.api, with the session cookie forwarded by callerRequestOptions().
// Two client-query islands hang off it: the caller's own commitments, and the pledge form
// on each deal card.
import FundingDealFilterGrid from "@/components/home/research-and-development/sections/funding-deal-filter-grid";
import MyPledgesPanel from "@/components/home/research-and-development/sections/my-pledges-panel";
import PitchReviewQueue from "@/components/home/research-and-development/sections/pitch-review-queue";
import PublicPitchesRail from "@/components/home/research-and-development/sections/public-pitches-rail";
import RndStatusPanel, {
  RndErrorPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { readEnumParam, type RawSearchParams } from "@/lib/filter-href";
import { listFundingDeals } from "@/lib/rnd/funding.api";
import { FUNDING_ROUND_TYPES, type ListFundingDealsFilter } from "@/lib/rnd/funding.schemas";
import { PROJECT_STAGES } from "@/lib/rnd/shared.schemas";
import { toArrayViewState } from "@/lib/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const DEALS_PAGE_LIMIT = 24;

/**
 * Investor deal flow (§11): every project with an open round.
 *
 * `GET /funding/deals` IS `requireAuth`, so a signed-out visitor gets `401` and sees a
 * sign-in prompt — not an empty grid, which would read as "nobody is raising".
 *
 * UNPAGINATED ON THE WIRE: the controller responds with a plain envelope and no
 * `pagination` sibling even though it accepts `?page=`, which is why this uses
 * `toArrayViewState` rather than the offset variant.
 *
 * The old page derived deals by flatMapping mock projects and defaulted a missing
 * confidence score to `50`. Both are gone: the server owns the join, and a signal nobody
 * computed is rendered as absent rather than as a middling number.
 */
export default async function FundingPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const requestOptions = await callerRequestOptions();

  const dealsFilter: ListFundingDealsFilter = {
    limit: DEALS_PAGE_LIMIT,
    roundType: readEnumParam(resolvedSearchParams, "roundType", FUNDING_ROUND_TYPES),
    stage: readEnumParam(resolvedSearchParams, "stage", PROJECT_STAGES),
  };

  const dealsState = toArrayViewState(await listFundingDeals(dealsFilter, requestOptions));

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <header className="space-y-1 px-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Deal Flow</h1>
        {/* Non-negotiable copy rule: Qatoto holds no funds and charges nobody in this
            domain. A pledge is a commitment on the record, settled between the parties. */}
        <p className="text-sm text-muted-foreground">
          Projects raising right now — every pledge is a commitment on the record, settled between
          the backer and the project. Qatoto holds no funds and charges nobody.
        </p>
      </header>
      <MyPledgesPanel />
      {renderDeals()}
      {/* §12. AFTER the deal grid, not before: an on-platform round with a real pledge
          control is the stronger thing to lead with, and a pitch is a listing pointing
          somewhere else. The rail's own read is PUBLIC, so it still renders for a
          signed-out visitor who only sees a sign-in prompt above it. */}
      <PublicPitchesRail />
      {/* Moderator-only, and it renders NOTHING for anyone else — the read 403s and that
          answer is the whole check. It sits here rather than on its own admin route because
          this is the page a moderator already opens to see what is being raised. */}
      <PitchReviewQueue />
    </div>
  );

  function renderDeals() {
    switch (dealsState.status) {
      case "error":
        return (
          <div className="px-4 lg:px-6">
            {dealsState.isSignInRequired ? (
              <RndSignInRequiredPanel message="Sign in to see which projects are raising." />
            ) : (
              <RndErrorPanel message="Couldn't load deal flow." />
            )}
          </div>
        );
      // The grid keeps its chips on an empty result so a too-narrow filter is
      // recoverable, but with no filters applied there is nothing to widen.
      case "empty":
        return hasAnyFilter(resolvedSearchParams) ? (
          <FundingDealFilterGrid deals={[]} searchParams={resolvedSearchParams} />
        ) : (
          <div className="px-4 lg:px-6">
            <RndStatusPanel message="No project has an open round right now." />
          </div>
        );
      case "ready":
        return (
          <FundingDealFilterGrid deals={dealsState.rows} searchParams={resolvedSearchParams} />
        );
      default: {
        const exhaustiveCheck: never = dealsState;
        return exhaustiveCheck;
      }
    }
  }
}

function hasAnyFilter(searchParams: RawSearchParams): boolean {
  return searchParams.roundType !== undefined || searchParams.stage !== undefined;
}
