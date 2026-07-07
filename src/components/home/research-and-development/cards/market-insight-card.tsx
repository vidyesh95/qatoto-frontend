import type { MarketInsight, TrendDirection } from "@/types/research-and-development";

const TREND_INDICATORS: Record<TrendDirection, { glyph: string; colorClassName: string }> = {
  up: { glyph: "▲", colorClassName: "text-green-600" },
  down: { glyph: "▼", colorClassName: "text-red-600" },
  flat: { glyph: "—", colorClassName: "text-muted-foreground" },
};

// Market-intelligence stat tile shared by the landing rail and the knowledge
// hub grid: headline stat with a trend glyph, region + category chips, and a
// source note. Fills its parent's width — parents control sizing.
export default function MarketInsightCard({ insight }: { insight: MarketInsight }) {
  const trendIndicator = TREND_INDICATORS[insight.trendDirection];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <p className="flex items-baseline gap-2 text-2xl font-semibold">
        {insight.statValue}
        <span className={`text-base ${trendIndicator.colorClassName}`}>{trendIndicator.glyph}</span>
      </p>
      <p className="text-sm">{insight.headline}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{insight.region}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{insight.category}</span>
      </div>
      <p className="text-xs text-muted-foreground">{insight.sourceNote}</p>
    </div>
  );
}
