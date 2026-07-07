import type { TrendDirection, TrendingSignal } from "@/types/research-and-development";

const TREND_INDICATORS: Record<TrendDirection, { glyph: string; colorClassName: string }> = {
  up: { glyph: "▲", colorClassName: "text-green-600" },
  down: { glyph: "▼", colorClassName: "text-red-600" },
  flat: { glyph: "—", colorClassName: "text-muted-foreground" },
};

// Knowledge-hub demand intelligence: a rising-categories chips row (upward
// signals by demand score) above the ranked demand leaderboard table. Plain
// numbers and arrow glyphs only — real charting is a later phase.
export default function TrendingDemandSignals({ signals }: { signals: TrendingSignal[] }) {
  const risingSignals = signals
    .filter((signal) => signal.trendDirection === "up")
    .toSorted((firstSignal, secondSignal) => secondSignal.demandScore - firstSignal.demandScore);
  const rankedSignals = signals.toSorted(
    (firstSignal, secondSignal) => firstSignal.rank - secondSignal.rank,
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Rising categories</h2>
        <div className="flex flex-wrap gap-2">
          {risingSignals.map((signal) => (
            <span
              key={signal.id}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
            >
              ▲ {signal.category} — {signal.region}
            </span>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Demand leaderboard</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Demand score</th>
                <th className="px-4 py-3 font-medium">Trend</th>
                <th className="px-4 py-3 font-medium">Related projects</th>
              </tr>
            </thead>
            <tbody>
              {rankedSignals.map((signal) => {
                const trendIndicator = TREND_INDICATORS[signal.trendDirection];

                return (
                  <tr key={signal.id} className="border-t border-[#CAC4D0]/60">
                    <td className="px-4 py-3 font-medium">#{signal.rank}</td>
                    <td className="px-4 py-3">{signal.category}</td>
                    <td className="px-4 py-3">{signal.region}</td>
                    <td className="px-4 py-3 font-semibold">{signal.demandScore}</td>
                    <td className={`px-4 py-3 ${trendIndicator.colorClassName}`}>
                      {trendIndicator.glyph}
                    </td>
                    <td className="px-4 py-3">{signal.relatedProjectsCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
