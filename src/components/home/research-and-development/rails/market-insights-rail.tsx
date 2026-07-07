import MarketInsightCard from "@/components/home/research-and-development/cards/market-insight-card";
import SectionHeader from "@/components/home/research-and-development/sections/section-header";

import type { MarketInsight } from "@/types/research-and-development";

type MarketInsightsRailProps = {
  insights: MarketInsight[];
  title?: string;
};

// Horizontally scrolling feed of market-intelligence stat tiles, linking into
// the knowledge hub. The insight card fills its parent, so each one is wrapped
// in a fixed-width slot to keep the rail scrolling.
export default function MarketInsightsRail({
  insights,
  title = "Market insights",
}: MarketInsightsRailProps) {
  return (
    <section className="space-y-1">
      <SectionHeader title={title} href="/research-and-development/knowledge-hub" />
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-2 lg:px-6">
        {insights.map((insight) => (
          <div key={insight.id} className="w-64 shrink-0">
            <MarketInsightCard insight={insight} />
          </div>
        ))}
      </div>
    </section>
  );
}
