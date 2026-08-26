// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props from a server parent that read GET /discovery/demand-signals.
import { formatIsoInstant } from "@/lib/rnd/format";
import type { DemandSignal } from "@/lib/rnd/discovery.schemas";
import type { TrendDirection } from "@/lib/rnd/shared.schemas";

const TREND_INDICATORS: Record<TrendDirection, { glyph: string; colorClassName: string }> = {
  up: { glyph: "▲", colorClassName: "text-green-600" },
  down: { glyph: "▼", colorClassName: "text-red-600" },
  flat: { glyph: "—", colorClassName: "text-muted-foreground" },
};

// Knowledge-hub demand intelligence: a rising-categories chip row above the ranked
// leaderboard. Plain numbers and arrow glyphs only — real charting is a later phase.
//
// The rows arrive already ranked and already filtered by the server (§13: heavy work
// belongs on the server), so this sorts nothing. `rank` is server-assigned and the
// render order is the response order.
export default function TrendingDemandSignals({ signals }: { signals: DemandSignal[] }) {
  const risingSignals = signals.filter((signal) => signal.trendDirection === "up");
  // Every row of one snapshot shares an `asOf`; read it off the first.
  const snapshotComputedAt = signals[0]?.asOf ?? null;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Rising categories</h2>
        <div className="flex flex-wrap gap-2">
          {risingSignals.map((signal) => (
            <span
              key={`${signal.category.slug}-${signal.region.slug}`}
              className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
            >
              ▲ {signal.category.displayLabel} — {signal.region.displayLabel}
            </span>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium tracking-wide xl:text-lg">Demand leaderboard</h2>
          {/* These are nightly snapshot numbers. Showing them without an "as of"
              would imply they are live, which they are not. */}
          {snapshotComputedAt !== null && (
            <p className="text-xs text-muted-foreground">
              As of {formatIsoInstant(snapshotComputedAt)}
            </p>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Region</th>
                <th className="px-4 py-3 font-medium">Demand score</th>
                <th className="px-4 py-3 font-medium">Trend</th>
                <th className="px-4 py-3 font-medium">Reporters</th>
                <th className="px-4 py-3 font-medium">Related projects</th>
                {/* THE STORE'S EVIDENCE, and the one column here that is not R&D talking to
                    itself. It does NOT feed the demand score — the rank is computed without
                    it — so it sits at the end as corroboration a reader can weigh, not as a
                    component of the number to its left. */}
                <th className="px-4 py-3 font-medium">Units sold</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => {
                const trendIndicator = TREND_INDICATORS[signal.trendDirection];

                return (
                  <tr
                    key={`${signal.category.slug}-${signal.region.slug}`}
                    className="border-t border-[#CAC4D0]/60"
                  >
                    <td className="px-4 py-3 font-medium">#{signal.rank}</td>
                    <td className="px-4 py-3">{signal.category.displayLabel}</td>
                    <td className="px-4 py-3">{signal.region.displayLabel}</td>
                    <td className="px-4 py-3 font-semibold">{signal.demandScorePoints}</td>
                    <td className={`px-4 py-3 ${trendIndicator.colorClassName}`}>
                      {trendIndicator.glyph}
                    </td>
                    {/* Distinct PEOPLE, not submissions — the gap between the two is
                        the sybil signal, so the header says "Reporters". */}
                    <td className="px-4 py-3">{signal.distinctReporterCount}</td>
                    <td className="px-4 py-3">{signal.relatedProjectCount}</td>
                    <td className="px-4 py-3">
                      {signal.soldUnitCount}
                      {signal.productReviewCount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {signal.productReviewCount} review
                          {signal.productReviewCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
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
