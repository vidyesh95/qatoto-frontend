import MarketInsightCard from "@/components/home/research-and-development/cards/market-insight-card";
import TrendingDemandSignals from "@/components/home/research-and-development/sections/trending-demand-signals";
import {
  MOCK_MARKET_INSIGHTS,
  MOCK_TRENDING_SIGNALS,
} from "@/mocks/research-and-development-mocks";

// Knowledge-hub composition ("where demand is highest"): the full market-insight
// grid plus trending demand signals (rising-category chips + leaderboard).
// Server component over static mocks — no fetching this phase.
export default function KnowledgeHubPage() {
  return (
    <div className="space-y-8 px-4 pb-8 lg:px-6">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Knowledge Hub</h1>
        <p className="text-sm text-muted-foreground">
          Where demand is highest — market intelligence for your next build.
        </p>
      </header>
      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Market insights</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MOCK_MARKET_INSIGHTS.map((insight) => (
            <MarketInsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>
      <TrendingDemandSignals signals={MOCK_TRENDING_SIGNALS} />
    </div>
  );
}
