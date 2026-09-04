// TRANSPORT: props-only — renders what it is handed; it fetches nothing and owns no state.

import type { ReactNode } from "react";

import {
  computeScatterChartScale,
  PLOT_WIDTH_UNITS,
  type ScatterChartScale,
} from "@/lib/charts/scatter-scale";
import type { ChartTableRow } from "@/components/charts/chart-frame";

// The frame half of the repo's SCATTER charting — the two-continuous-axis sibling of
// `chart-frame.tsx`. `scatter-series.tsx` draws the points; `scatter-scale.ts` does the
// arithmetic. Every rule `chart-frame.tsx` established is kept:
//
//   NO CHART LIBRARY. This draws gridlines and positioned circles. A dependency would buy
//   scales, tooltips and animation to do that.
//
//   THE `<svg>` IS `aria-hidden` AND THE FRAME RENDERS AN `sr-only` TABLE. A scatter read
//   aloud is a list of numbers, and the numbers are what the surface is for.
//
// ⚠️ THE SVG HOLDS THE GRIDLINES AND NOTHING ELSE. Its viewBox is
// `preserveAspectRatio="none"`, which is right for a line that should span the plot and wrong
// for anything that must keep its shape — a circle in there is stretched into an ellipse by
// whatever the container width happens to be. So the points, the quadrant wash and every label
// live in an HTML overlay positioned by percentage, tracking the same integer arithmetic. That
// is the same split `chart-frame.tsx` makes for text, applied to everything shape-bearing.
//
// WHAT THIS ADDS THAT THE BAR FRAME DOES NOT: QUADRANTS. Two thresholds cut the plot into
// four named regions, each tinted and each carrying its label INSIDE ITSELF.
//
// ⚠️ THE THRESHOLDS ARE IN DATA UNITS, never half the plot — a divider at the geometric
// middle marks a number that exists nowhere in the data and moves whenever the domain
// changes.
//
// ⚠️ A LABEL BELONGS TO A REGION, NOT TO A CORNER OF THE PLOT. The first version pinned all
// four labels to the plot's own corners, so "Neither" sat at the bottom-left of the whole
// chart whether or not the bottom-left QUADRANT reached that far. Each label is now placed
// inside the box its own region occupies, which is the only placement that stays correct
// when a threshold moves.

/**
 * All four names, none optional.
 *
 * A quadrant chart with an unnamed region asks the reader to work out what the empty corner
 * means, and the answer is never obvious — the whole point of cutting the plot in four is
 * that each piece says something. If a caller has no name for a region, it does not want
 * quadrants.
 */
export interface ScatterQuadrantLabels {
  /** The corner both axes agree on. Tinted strongest, and the only one given the accent. */
  readonly topRight: string;
  readonly topLeft: string;
  readonly bottomRight: string;
  readonly bottomLeft: string;
}

interface ScatterFrameProps {
  readonly rawMaxX: number;
  readonly rawMaxY: number;
  /** The largest magnitude any point carries. Fixes the radius scale. */
  readonly rawMaxMagnitude: number;
  /** An explicit ceiling, for an axis that has one. See `computeScatterChartScale`. */
  readonly xDomainMax?: number;
  readonly yDomainMax?: number;
  readonly xTickIntervalCount?: number;
  readonly yTickIntervalCount?: number;
  readonly xAxisLabel: string;
  readonly yAxisLabel: string;
  readonly formatX: (value: number) => string;
  readonly formatY: (value: number) => string;
  readonly plotHeightClassName?: string;
  /** The table's caption, and the chart's own accessible name. */
  readonly caption: string;
  readonly rowColumnLabel: string;
  readonly valueColumnLabels: readonly string[];
  readonly tableRows: readonly ChartTableRow[];
  /** Marks the corner a reader should look at first. Omit for a chart with no sweet spot. */
  readonly quadrantLabels?: ScatterQuadrantLabels;
  /** Where that corner STARTS, in data units. Required alongside `quadrantLabels`. */
  readonly xThreshold?: number;
  readonly yThreshold?: number;
  readonly emptyMessage?: string;
  readonly children: (scale: ScatterChartScale) => ReactNode;
}

const QUADRANT_LABEL_CLASS =
  "absolute max-w-full rounded bg-background/90 px-1.5 py-0.5 text-[10px] leading-tight";

/**
 * One region of the plot, as a box the label sits inside.
 *
 * The tints are deliberately unequal. Only the top-right corner is a recommendation — the
 * other three are context, and giving all four the same weight would say the chart has no
 * opinion when it does.
 */
interface QuadrantRegion {
  readonly key: string;
  readonly text: string;
  /** Inset percentages, so the box IS the region rather than approximating it. */
  readonly style: { left: string; top: string; right: string; bottom: string };
  /** Where the label sits within that box — its outward corner, away from the crossing. */
  readonly labelPositionClassName: string;
  readonly tintClassName: string;
  readonly textClassName: string;
}

export function ScatterFrame({
  rawMaxX,
  rawMaxY,
  rawMaxMagnitude,
  xDomainMax,
  yDomainMax,
  xTickIntervalCount,
  yTickIntervalCount,
  xAxisLabel,
  yAxisLabel,
  formatX,
  formatY,
  plotHeightClassName = "h-96",
  caption,
  rowColumnLabel,
  valueColumnLabels,
  tableRows,
  quadrantLabels,
  xThreshold,
  yThreshold,
  emptyMessage = "Nothing to plot yet.",
  children,
}: ScatterFrameProps) {
  if (tableRows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const scale = computeScatterChartScale({
    rawMaxX,
    rawMaxY,
    rawMaxMagnitude,
    xDomainMax,
    yDomainMax,
    xTickIntervalCount,
    yTickIntervalCount,
  });

  // Top-down, because that is the order the axis reads on screen. The ticks themselves are
  // ascending — the frame reverses a copy rather than asking the scale for a second ordering.
  const descendingYTicks = scale.yTicks.toReversed();

  // The quadrants are drawn only when BOTH thresholds are given: a region needs two edges,
  // and guessing the missing one is how it ends up back at the middle of the plot.
  const hasQuadrants =
    quadrantLabels !== undefined && xThreshold !== undefined && yThreshold !== undefined;
  // The crossing point, as percentages. `yPercent` already counts from the TOP.
  const crossingLeftPercent = hasQuadrants ? scale.xPercent(xThreshold) : 0;
  const crossingTopPercent = hasQuadrants ? scale.yPercent(yThreshold) : 0;
  const leftColumn = `${String(crossingLeftPercent)}%`;
  const rightColumn = `${String(100 - crossingLeftPercent)}%`;
  const topRow = `${String(crossingTopPercent)}%`;
  const bottomRow = `${String(100 - crossingTopPercent)}%`;

  const quadrantRegions: readonly QuadrantRegion[] =
    quadrantLabels === undefined
      ? []
      : [
          {
            key: "topRight",
            text: quadrantLabels.topRight,
            style: { left: leftColumn, top: "0", right: "0", bottom: bottomRow },
            labelPositionClassName: "top-1 right-1 text-right",
            // The one corner worth starting in, so it is the one that reads first.
            tintClassName: "bg-[#00696E]/[0.09]",
            textClassName: "font-medium text-[#00696E]",
          },
          {
            key: "topLeft",
            text: quadrantLabels.topLeft,
            style: { left: "0", top: "0", right: rightColumn, bottom: bottomRow },
            labelPositionClassName: "top-1 left-1",
            tintClassName: "bg-transparent",
            textClassName: "text-muted-foreground",
          },
          {
            key: "bottomRight",
            text: quadrantLabels.bottomRight,
            style: { left: leftColumn, top: topRow, right: "0", bottom: "0" },
            labelPositionClassName: "bottom-1 right-1 text-right",
            tintClassName: "bg-[#00696E]/[0.03]",
            textClassName: "text-muted-foreground",
          },
          {
            key: "bottomLeft",
            text: quadrantLabels.bottomLeft,
            style: { left: "0", top: topRow, right: rightColumn, bottom: "0" },
            labelPositionClassName: "bottom-1 left-1",
            tintClassName: "bg-transparent",
            textClassName: "text-muted-foreground",
          },
        ];

  return (
    <figure className="space-y-2">
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <div className="flex flex-col justify-between py-0 text-right text-[10px] leading-none text-muted-foreground">
          {descendingYTicks.map((tickValue, tickIndex) => (
            // Keyed on the POSITION, not the value: the ladder is positional, and a value key
            // collides the moment two ticks round together.
            <span key={`y-tick-${String(tickIndex)}`}>{formatY(tickValue)}</span>
          ))}
        </div>

        {/* `overflow-hidden` is a BACKSTOP, not the containment. `scatter-series.tsx` clamps
            every point a full radius inside this box, so nothing should reach the edge — but
            a future change to the fan spacing or a new overlay element must not be able to
            paint over the caption and the page margin again, which is what happened once.
            ⚠️ NOT the same rule as `chart-frame.tsx`, which sets `overflow-visible` on
            purpose so a bar's value label can sit above its bar. Different frame. */}
        <div className={`relative overflow-hidden ${plotHeightClassName}`}>
          <svg
            aria-hidden
            viewBox={`0 0 ${PLOT_WIDTH_UNITS} ${scale.plotHeightUnits}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            {scale.yTicks.map((tickValue, tickIndex) => {
              const tickY = scale.yUnits(tickValue);
              return (
                <line
                  key={`y-gridline-${String(tickIndex)}`}
                  x1={0}
                  x2={PLOT_WIDTH_UNITS}
                  y1={tickY}
                  y2={tickY}
                  className={tickValue === 0 ? "stroke-border" : "stroke-border/50"}
                  strokeWidth={1}
                  // The viewBox is stretched to the container width, so without this the
                  // gridlines would be a different thickness on a wide screen than a narrow one.
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {scale.xTicks.map((tickValue, tickIndex) => {
              const tickX = scale.xUnits(tickValue);
              return (
                <line
                  key={`x-gridline-${String(tickIndex)}`}
                  x1={tickX}
                  x2={tickX}
                  y1={0}
                  y2={scale.plotHeightUnits}
                  className={tickValue === 0 ? "stroke-border" : "stroke-border/50"}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* THE TWO DIVIDERS. Drawn here rather than in the overlay so they share the
                gridlines' arithmetic and their non-scaling stroke exactly — a divider one
                pixel off its own threshold would put points on the wrong side of the region
                whose count includes them. Dashed, because they are a chosen cut-off rather
                than a measured axis. */}
            {hasQuadrants ? (
              <>
                <line
                  x1={scale.xUnits(xThreshold)}
                  x2={scale.xUnits(xThreshold)}
                  y1={0}
                  y2={scale.plotHeightUnits}
                  className="stroke-[#00696E]/40"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={0}
                  x2={PLOT_WIDTH_UNITS}
                  y1={scale.yUnits(yThreshold)}
                  y2={scale.yUnits(yThreshold)}
                  className="stroke-[#00696E]/40"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>

          {/* THE OVERLAY. Regions, labels and points, all positioned by percentage against the
              same integer arithmetic the gridlines use — so a point and a gridline at the same
              value land on the same pixel, and nothing here can be deformed by the container's
              shape. */}
          <div className="absolute inset-0">
            {/* TINTS UNDER, POINTS OVER, LABELS ON TOP — three layers, and the order is the
                one thing here worth arguing about. The labels and the points WILL collide,
                because the densest region is also the one whose name matters most. A label
                painted under the data was unreadable exactly where it was needed; a label on
                top hides at most a couple of circles out of dozens, and every one of them is
                still in the `sr-only` table with its exact count. `pointer-events-none` keeps
                the circles' `title` tooltips reachable through it. */}
            {quadrantRegions.map((region) => (
              <div
                key={`${region.key}-tint`}
                aria-hidden
                style={region.style}
                className={`absolute ${region.tintClassName}`}
              />
            ))}

            {children(scale)}

            {quadrantRegions.map((region) => (
              <div
                key={`${region.key}-label`}
                style={region.style}
                className="pointer-events-none absolute"
              >
                <span
                  className={`${QUADRANT_LABEL_CLASS} ${region.labelPositionClassName} ${region.textClassName}`}
                >
                  {region.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div aria-hidden />

        <div className="relative mt-1 h-4 text-[10px] leading-none text-muted-foreground">
          {scale.xTicks.map((tickValue, tickIndex) => (
            <span
              key={`x-label-${String(tickIndex)}`}
              style={{ left: `${String(scale.xPercent(tickValue))}%` }}
              className="absolute -translate-x-1/2 whitespace-nowrap"
            >
              {formatX(tickValue)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Horizontal: <span className="text-foreground">{xAxisLabel}</span>
        </span>
        <span>
          Vertical: <span className="text-foreground">{yAxisLabel}</span>
        </span>
      </div>

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{rowColumnLabel}</th>
            {valueColumnLabels.map((columnLabel) => (
              <th key={columnLabel} scope="col">
                {columnLabel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, cellIndex) => (
                <td key={`${row.key}-${valueColumnLabels[cellIndex] ?? String(cellIndex)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
