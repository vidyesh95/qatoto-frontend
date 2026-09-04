// TRANSPORT: props-only — presentational. Fetches nothing and computes no score.

import { ScatterFrame } from "@/components/charts/scatter-frame";
import { ScatterSeries, type ScatterPoint } from "@/components/charts/scatter-series";
import { formatIsoInstant } from "@/lib/rnd/format";
import { formatTradeValueCompact } from "@/lib/rnd/import-format";
import type { LocalizationAssessment } from "@/lib/rnd/import-intelligence.schemas";

/**
 * Where the localization opportunities sit, plotted against the two components that decide
 * whether one is worth a year of somebody's life.
 *
 * ⚠️ THE AXES ARE SCORE COMPONENTS, NOT MONEY, AND THAT IS THE WHOLE DESIGN. Plotting the
 * import bill directly spans five orders of magnitude — $1M to $141B — so every point but a
 * handful would pile onto the origin unless the axis were log-scaled, and a log axis on a "how
 * big is the prize" chart misleads far more than it reveals. The two components are bounded
 * integers (0–35 and 0–25) that already encode those magnitudes on a ladder somebody can read.
 *
 * THE QUADRANT IS THE READING. Top-right is a large import bill against proven domestic export
 * capability: the country is paying foreigners for something somebody here demonstrably already
 * makes. That is the one corner worth starting in, and the frame washes it so it reads before
 * any label does.
 *
 * The bubble is the total score, scaled BY AREA — `scatter-scale.ts` explains why that
 * correction is not optional.
 */
const MAX_PLOTTED_POINTS = 60;

/**
 * The component budgets, which ARE the axis ceilings.
 *
 * ⚠️ PASSED EXPLICITLY so the axis is not rounded up. `chooseNiceDomainMax` walks a
 * 1/2/2.5/5/10 ladder and turns 35 into 50 — fifteen points of headroom the score cannot
 * reach, 30% of the plot permanently empty, and an axis that contradicts the "0-35" caption
 * beneath it. That is a correct default for a measured maximum and wrong for a bounded one.
 */
const IMPORT_DEPENDENCE_BUDGET = 35;
const EXPORT_CAPABILITY_BUDGET = 25;

/** Seven and five intervals divide those cleanly, so every tick lands on a multiple of five. */
const IMPORT_DEPENDENCE_TICK_INTERVALS = 7;
const EXPORT_CAPABILITY_TICK_INTERVALS = 5;

/**
 * Where the sweet-spot corner starts, in SCORE POINTS.
 *
 * ⚠️ THESE ARE LADDER RUNGS FROM `localization-feasibility-score.ts`, not the middle of the
 * plot. 21 points is the $100M import rung — the measured p90 of India's HS6 lines — and 14 is
 * the $50M export rung. So the shaded corner reads "imports over $100M AND exports over $50M",
 * which is a claim the data supports. A wash at half the plot marks a number that exists
 * nowhere in the data and moves whenever the domain changes.
 */
const IMPORT_DEPENDENCE_SWEET_SPOT = 21;
const EXPORT_CAPABILITY_SWEET_SPOT = 14;

export default function OpportunityScatter({
  assessments,
}: {
  assessments: readonly LocalizationAssessment[];
}) {
  // The top of the ranking only. Sixty circles is already dense; five thousand would be a
  // solid block of ink that says nothing, and the ranked list below carries the tail.
  const plotted = assessments.slice(0, MAX_PLOTTED_POINTS);

  const points: ScatterPoint[] = plotted.map((assessment) => ({
    key: assessment.id,
    label: assessment.commodityLabel,
    x: assessment.importDependencyPoints,
    y: assessment.exportCapabilityPoints,
    magnitude: assessment.feasibilityScorePoints,
  }));

  const asOf = plotted[0]?.asOf;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Where the opportunity sits</h2>
        <p className="text-sm text-muted-foreground">
          Each circle is one commodity; its size is the feasibility score. Both axes are scoring
          ladders with nine steps each, so commodities often land on the same point — those are
          fanned into a cluster around it rather than stacked out of sight.
          {asOf === undefined ? null : <> Computed {formatIsoInstant(asOf)}.</>}
        </p>
      </div>

      <ScatterFrame
        rawMaxX={IMPORT_DEPENDENCE_BUDGET}
        rawMaxY={EXPORT_CAPABILITY_BUDGET}
        rawMaxMagnitude={100}
        xDomainMax={IMPORT_DEPENDENCE_BUDGET}
        yDomainMax={EXPORT_CAPABILITY_BUDGET}
        xTickIntervalCount={IMPORT_DEPENDENCE_TICK_INTERVALS}
        yTickIntervalCount={EXPORT_CAPABILITY_TICK_INTERVALS}
        xAxisLabel="import dependence (0–35)"
        yAxisLabel="existing export capability (0–25)"
        formatX={(value) => String(value)}
        formatY={(value) => String(value)}
        plotHeightClassName="h-96"
        caption={`The top ${String(plotted.length)} localization opportunities, by import dependence and existing export capability.`}
        rowColumnLabel="Commodity"
        valueColumnLabels={[
          "Import dependence",
          "Export capability",
          "Feasibility score",
          "Annual imports",
        ]}
        tableRows={plotted.map((assessment) => ({
          key: assessment.id,
          label: `${assessment.commodityLabel} (HS ${assessment.hsCode})`,
          cells: [
            `${String(assessment.importDependencyPoints)} of 35`,
            `${String(assessment.exportCapabilityPoints)} of 25`,
            `${String(assessment.feasibilityScorePoints)} of 100`,
            formatTradeValueCompact(assessment.observedImportValueInCents, assessment.currency),
          ],
        }))}
        xThreshold={IMPORT_DEPENDENCE_SWEET_SPOT}
        yThreshold={EXPORT_CAPABILITY_SWEET_SPOT}
        quadrantLabels={{
          topRight: "Bought heavily, and already made here",
          topLeft: "Already made here, barely imported",
          bottomRight: "Bought heavily, nobody here makes it",
          bottomLeft: "Neither",
        }}
        emptyMessage="Nothing has been scored for this country yet."
      >
        {(scale) => (
          <ScatterSeries
            scale={scale}
            points={points}
            colorClassName="bg-chart-2"
            formatPoint={(point) =>
              `${point.label} · import dependence ${String(point.x)}/35 · export capability ${String(point.y)}/25 · score ${String(point.magnitude ?? 0)}/100`
            }
          />
        )}
      </ScatterFrame>
    </section>
  );
}
