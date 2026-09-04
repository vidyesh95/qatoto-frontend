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
          Each circle is one commodity; its size is the feasibility score.
          {asOf === undefined ? null : <> Computed {formatIsoInstant(asOf)}.</>}
        </p>
      </div>

      <ScatterFrame
        rawMaxX={35}
        rawMaxY={25}
        rawMaxMagnitude={100}
        xAxisLabel="import dependence (0–35)"
        yAxisLabel="existing export capability (0–25)"
        formatX={(value) => String(value)}
        formatY={(value) => String(value)}
        plotHeightClassName="h-80"
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
            colorClassName="fill-chart-2"
            formatPoint={(point) =>
              `${point.label} · import dependence ${String(point.x)}/35 · export capability ${String(point.y)}/25 · score ${String(point.magnitude ?? 0)}/100`
            }
          />
        )}
      </ScatterFrame>
    </section>
  );
}
