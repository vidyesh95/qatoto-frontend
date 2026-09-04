// TRANSPORT: props-only — presentational. Fetches nothing and computes no score.

import { ScatterFrame } from "@/components/charts/scatter-frame";
import { ScatterSeries, type ScatterPoint } from "@/components/charts/scatter-series";
import { formatIsoInstant } from "@/lib/rnd/format";
import type { LocalizationAssessmentGridCell } from "@/lib/rnd/import-intelligence.schemas";

/**
 * Where the whole scored population sits, against the two components that decide whether an
 * opportunity is worth a year of somebody's life.
 *
 * ⚠️ THE AXES ARE SCORE COMPONENTS, NOT MONEY, AND THAT IS THE WHOLE DESIGN. Plotting the
 * import bill directly spans five orders of magnitude — $1M to $141B — so every point but a
 * handful would pile onto the origin unless the axis were log-scaled, and a log axis on a "how
 * big is the prize" chart misleads far more than it reveals. The two components are bounded
 * integers (0–35 and 0–25) that already encode those magnitudes on a ladder somebody can read.
 *
 * ⚠️ ONE CIRCLE IS ONE SCORE CELL, NOT ONE COMMODITY, AND THAT IS A FIX. This plotted the top
 * 24 of the ranking, which are by construction the top-right corner of the score space — a
 * chart drawing its own answer while hiding the question, with three of its four quadrants
 * permanently empty and 70% of the plot dead. Because both axes are nine-rung ladders, the
 * COMPLETE distribution of all 5,469 scored commodities is at most 81 cells, and the backend
 * returns it in one unpaginated read. Every quadrant now holds what it actually holds.
 *
 * THE QUADRANT IS THE READING. Top-right is a large import bill against proven domestic export
 * capability: the country is paying foreigners for something somebody here demonstrably already
 * makes. That is the one corner worth starting in, and the frame tints it strongest.
 */

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
 * which is a claim the data supports. A divider at half the plot marks a number that exists
 * nowhere in the data and moves whenever the domain changes.
 */
const IMPORT_DEPENDENCE_SWEET_SPOT = 21;
const EXPORT_CAPABILITY_SWEET_SPOT = 14;

interface QuadrantTotals {
  readonly boughtAndMadeHere: number;
  readonly madeHereBarelyImported: number;
  readonly boughtNobodyMakesIt: number;
  readonly neither: number;
}

/**
 * How many commodities sit in each region.
 *
 * ⚠️ THIS IS NOT THE CLIENT-SIDE FILTERING THE ARCHITECTURE RULES FORBID. That rule is about
 * narrowing a fetched PAGE and presenting the remainder as a result. These cells are the
 * complete population — the backend's own `sum(commodityCount)` equals the leaderboard's
 * `pagination.total` — so summing them is arithmetic over everything, not a sample. The
 * thresholds are frontend ladder constants the backend has no reason to know.
 */
function countByQuadrant(cells: readonly LocalizationAssessmentGridCell[]): QuadrantTotals {
  const totals = {
    boughtAndMadeHere: 0,
    madeHereBarelyImported: 0,
    boughtNobodyMakesIt: 0,
    neither: 0,
  };

  for (const cell of cells) {
    const isBoughtHeavily = cell.importDependencyPoints >= IMPORT_DEPENDENCE_SWEET_SPOT;
    const isMadeHere = cell.exportCapabilityPoints >= EXPORT_CAPABILITY_SWEET_SPOT;

    if (isBoughtHeavily && isMadeHere) totals.boughtAndMadeHere += cell.commodityCount;
    else if (isMadeHere) totals.madeHereBarelyImported += cell.commodityCount;
    else if (isBoughtHeavily) totals.boughtNobodyMakesIt += cell.commodityCount;
    else totals.neither += cell.commodityCount;
  }

  return totals;
}

const commodityCountFormat = new Intl.NumberFormat("en-US");

function formatCommodityCount(commodityCount: number): string {
  return `${commodityCountFormat.format(commodityCount)} commodit${commodityCount === 1 ? "y" : "ies"}`;
}

export default function OpportunityScatter({
  cells,
}: {
  cells: readonly LocalizationAssessmentGridCell[];
}) {
  const points: ScatterPoint[] = cells.map((cell) => ({
    // The coordinate IS the identity — the backend groups by it, so it is unique by
    // construction and no synthetic id is needed.
    key: `${String(cell.importDependencyPoints)}:${String(cell.exportCapabilityPoints)}`,
    label: formatCommodityCount(cell.commodityCount),
    x: cell.importDependencyPoints,
    y: cell.exportCapabilityPoints,
    magnitude: cell.commodityCount,
  }));

  const quadrants = countByQuadrant(cells);
  const scoredCommodityCount = cells.reduce((running, cell) => running + cell.commodityCount, 0);
  const largestCellCount = cells.reduce(
    (running, cell) => Math.max(running, cell.commodityCount),
    1,
  );
  const asOf = cells[0]?.asOf;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-serif text-xl">Where the opportunity sits</h2>
        <p className="text-sm text-muted-foreground">
          Every scored commodity, not just the top of the list. Both axes are scoring ladders with
          nine steps each, so the whole population fits in {cells.length} cells — one circle per
          cell, sized by how many commodities land there. The dashed lines cut it into the four
          regions named below.
          {asOf === undefined ? null : <> Computed {formatIsoInstant(asOf)}.</>}
        </p>
        <p className="text-sm text-muted-foreground">
          {/* Measured across all 5,469 rows: the other three components are zero on every one
              of them. Saying so is the difference between a reader trusting the diagonal and a
              reader mistaking it for a law. */}
          Only two of the five score components have data yet — no domestic substitutes have been
          contributed, and supplier capacity and lead time follow from those. So a commodity&rsquo;s
          feasibility score is currently the exact sum of its two coordinates, which is why the
          ranked list runs along the diagonal. The other three start counting the moment somebody
          adds a substitute.
        </p>
      </div>

      <ScatterFrame
        rawMaxX={IMPORT_DEPENDENCE_BUDGET}
        rawMaxY={EXPORT_CAPABILITY_BUDGET}
        rawMaxMagnitude={largestCellCount}
        xDomainMax={IMPORT_DEPENDENCE_BUDGET}
        yDomainMax={EXPORT_CAPABILITY_BUDGET}
        xTickIntervalCount={IMPORT_DEPENDENCE_TICK_INTERVALS}
        yTickIntervalCount={EXPORT_CAPABILITY_TICK_INTERVALS}
        xAxisLabel="import dependence (0–35)"
        yAxisLabel="existing export capability (0–25)"
        formatX={(value) => String(value)}
        formatY={(value) => String(value)}
        plotHeightClassName="h-96"
        caption={`${formatCommodityCount(scoredCommodityCount)} across ${String(cells.length)} score cells, by import dependence and existing export capability.`}
        rowColumnLabel="Score cell"
        valueColumnLabels={["Import dependence", "Export capability", "Commodities", "Region"]}
        tableRows={cells.map((cell) => {
          const isBoughtHeavily = cell.importDependencyPoints >= IMPORT_DEPENDENCE_SWEET_SPOT;
          const isMadeHere = cell.exportCapabilityPoints >= EXPORT_CAPABILITY_SWEET_SPOT;
          return {
            key: `${String(cell.importDependencyPoints)}:${String(cell.exportCapabilityPoints)}`,
            label: `${String(cell.importDependencyPoints)} / ${String(cell.exportCapabilityPoints)}`,
            cells: [
              `${String(cell.importDependencyPoints)} of 35`,
              `${String(cell.exportCapabilityPoints)} of 25`,
              commodityCountFormat.format(cell.commodityCount),
              isBoughtHeavily && isMadeHere
                ? "Bought heavily, and already made here"
                : isMadeHere
                  ? "Already made here, barely imported"
                  : isBoughtHeavily
                    ? "Bought heavily, nobody here makes it"
                    : "Neither",
            ],
          };
        })}
        xThreshold={IMPORT_DEPENDENCE_SWEET_SPOT}
        yThreshold={EXPORT_CAPABILITY_SWEET_SPOT}
        quadrantLabels={{
          topRight: `Bought heavily, and already made here · ${commodityCountFormat.format(quadrants.boughtAndMadeHere)}`,
          topLeft: `Already made here, barely imported · ${commodityCountFormat.format(quadrants.madeHereBarelyImported)}`,
          bottomRight: `Bought heavily, nobody here makes it · ${commodityCountFormat.format(quadrants.boughtNobodyMakesIt)}`,
          bottomLeft: `Neither · ${commodityCountFormat.format(quadrants.neither)}`,
        }}
        emptyMessage="Nothing has been scored for this country yet."
      >
        {(scale) => (
          <ScatterSeries
            scale={scale}
            points={points}
            colorClassName="bg-chart-2"
            formatPoint={(point) =>
              `${point.label} · import dependence ${String(point.x)}/35 · export capability ${String(point.y)}/25`
            }
          />
        )}
      </ScatterFrame>
    </section>
  );
}
