// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props from a server parent that read GET /discovery/market-insights.
import Link from "next/link";

import { formatMarketInsightStat } from "@/lib/rnd/discovery-format";
import type { MarketInsight } from "@/lib/rnd/discovery.schemas";
import type { TrendDirection } from "@/lib/rnd/shared.schemas";

const TREND_INDICATORS: Record<TrendDirection, { glyph: string; colorClassName: string }> = {
  up: { glyph: "▲", colorClassName: "text-green-600" },
  down: { glyph: "▼", colorClassName: "text-red-600" },
  flat: { glyph: "—", colorClassName: "text-muted-foreground" },
};

// Market-intelligence stat tile shared by the landing rail and the knowledge hub
// grid. The headline figure is COMPOSED HERE from statKind + statValueMilli +
// statUnitKey — the server sends no pre-rendered "+34%" for it to print.
// Fills its parent's width; parents control sizing.
//
// THE HEADLINE IS THE LINK, NOT THE WHOLE CARD, and that is not a styling preference:
// the source citation below is its own `<a>`, and an anchor inside an anchor is invalid
// HTML that browsers resolve by breaking the inner one. Wrapping the card would cost the
// citation link, which is the part a reader checks the figure against.
export default function MarketInsightCard({ insight }: { insight: MarketInsight }) {
  const trendIndicator = TREND_INDICATORS[insight.trendDirection];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <p className="flex items-baseline gap-2 text-2xl font-semibold">
        {formatMarketInsightStat(insight)}
        <span className={`text-base ${trendIndicator.colorClassName}`}>{trendIndicator.glyph}</span>
      </p>
      <p className="text-sm">
        <Link
          href={`/research-and-development/market-research/insight/${insight.id}`}
          className="hover:underline"
        >
          {insight.headline}
        </Link>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {insight.region.displayLabel}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {insight.category.displayLabel}
        </span>
      </div>
      {/* `sourceNote` split into three fields, so the citation can be a real link. */}
      <p className="text-xs text-muted-foreground">
        {insight.sourceUrl === null ? (
          insight.sourceName
        ) : (
          <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="underline">
            {insight.sourceName}
          </a>
        )}
        {" · "}
        {insight.sourcePublishedDate}
      </p>
    </div>
  );
}
