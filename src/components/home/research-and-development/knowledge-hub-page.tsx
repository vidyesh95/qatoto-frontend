// TRANSPORT: server-fetch — server component. Reads GET /discovery/market-insights
// and GET /discovery/demand-signals via @/lib/rnd/discovery.api, with the session
// cookie forwarded by callerRequestOptions(). Both are public (attachOptionalUser).
// No React Query here; adding "use client" would move the fetch into the browser
// bundle and break the next/headers import.
import MarketInsightCard from "@/components/home/research-and-development/cards/market-insight-card";
import RndStatusPanel, {
  RndErrorPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import TrendingDemandSignals from "@/components/home/research-and-development/sections/trending-demand-signals";
import type { DemandSignal, MarketInsight } from "@/lib/rnd/discovery.schemas";
import { listDemandSignals, listMarketInsights } from "@/lib/rnd/discovery.api";
import { toListViewState, type ListViewState } from "@/lib/rnd/view-state";
import { callerRequestOptions } from "@/lib/server-http";

const INSIGHTS_PAGE_LIMIT = 24;
const DEMAND_SIGNALS_PAGE_LIMIT = 20;

/**
 * Knowledge hub ("where demand is highest"): the market-insight grid plus the demand
 * leaderboard.
 *
 * The two reads are fired CONCURRENTLY — they share no data, so awaiting them in
 * sequence would add a round trip to the page's time to first byte for nothing. Each
 * gets its own view state, so a failed leaderboard does not blank the insight grid.
 */
export default async function KnowledgeHubPage() {
  const requestOptions = await callerRequestOptions();

  const [insightsResult, demandSignalsResult] = await Promise.all([
    listMarketInsights({ limit: INSIGHTS_PAGE_LIMIT }, requestOptions),
    listDemandSignals({ limit: DEMAND_SIGNALS_PAGE_LIMIT }, requestOptions),
  ]);

  return (
    <div className="space-y-8 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Knowledge Hub</h1>
        <p className="text-sm text-muted-foreground">
          Where demand is highest — market intelligence for your next build.
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Market insights</h2>
        {renderInsights(toListViewState(insightsResult))}
      </section>
      {renderDemandSignals(toListViewState(demandSignalsResult))}
    </div>
  );
}

// Exhaustive switch with a `never` default (CLAUDE.md Pattern 1): adding a variant to
// `ListViewState` becomes a compile error here rather than a silently unhandled state.
function renderInsights(state: ListViewState<MarketInsight>) {
  switch (state.status) {
    case "error":
      return state.isSignInRequired ? (
        <RndSignInRequiredPanel message="Sign in to read market insights." />
      ) : (
        <RndErrorPanel message="Couldn't load market insights." />
      );
    case "empty":
      return <RndStatusPanel message="No market insights published yet." />;
    case "ready":
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {state.rows.map((insight) => (
            <MarketInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      );
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

function renderDemandSignals(state: ListViewState<DemandSignal>) {
  switch (state.status) {
    case "error":
      return state.isSignInRequired ? (
        <RndSignInRequiredPanel message="Sign in to read the demand leaderboard." />
      ) : (
        <RndErrorPanel message="Couldn't load the demand leaderboard." />
      );
    // No rows means no scoring run has completed. That is a real, distinct state — not
    // a zeroed table, which would publish "no demand anywhere" as a finding about the
    // world rather than about the job.
    case "empty":
      return <RndStatusPanel message="No demand snapshot has been computed yet." />;
    case "ready":
      return <TrendingDemandSignals signals={state.rows} />;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
