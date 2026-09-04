// TRANSPORT: props-only — renders what it is handed; it fetches nothing and owns no state.

import type { ReactNode } from "react";

import {
  computeScatterChartScale,
  PLOT_WIDTH_UNITS,
  type ScatterAxisInput,
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
// ⚠️ THE SVG HOLDS THE GRIDLINES AND THE GUIDES AND NOTHING ELSE. Its viewBox is
// `preserveAspectRatio="none"`, which is right for a line that should span the plot and wrong
// for anything that must keep its shape — a circle in there is stretched into an ellipse by
// whatever the container width happens to be. So the points live in an HTML overlay positioned
// by percentage, tracking the same integer arithmetic. That is the same split
// `chart-frame.tsx` makes for text, applied to everything shape-bearing.
//
// ⚠️ NOTHING IS EVER DRAWN OVER THE PLOT AREA EXCEPT DATA. An earlier version put four
// quadrant names inside the plot; they sat exactly where the points gathered and hid them,
// and layering them under the data instead made them unreadable precisely where they were
// needed. Both are the wrong trade. Guides are thin lines with NO text on them, and every
// name lives in the legend BELOW the plot, keyed by the guide's own dash pattern. The plot
// area then contains dots and gridlines, and a dot is never something else's background.

/**
 * A line that means something, drawn across the plot.
 *
 * `vertical` and `horizontal` are a threshold on one axis. `parity` is the `y = x` line and
 * is only meaningful when BOTH AXES CARRY THE SAME UNIT — the caller asserts that by asking
 * for it; the frame cannot check it. On the opportunity picker both axes are dollars, so the
 * line reads "buys as much as it sells" and a point below it is a net importer.
 */
export interface ScatterReferenceGuide {
  readonly key: string;
  readonly kind: "vertical" | "horizontal" | "parity";
  /** In data units. Ignored for `parity`, which has no single value. */
  readonly value?: number;
  /** Shown in the legend under the plot, never on the line. */
  readonly label: string;
  /** Marks the guide a reader should notice first. One at most. */
  readonly isPrimary?: boolean;
}

interface ScatterFrameProps {
  readonly x: ScatterAxisInput;
  readonly y: ScatterAxisInput;
  /** The largest magnitude any point carries. Fixes the radius scale. */
  readonly rawMaxMagnitude: number;
  /** Draw every point this size and ignore magnitude. See `computeScatterChartScale`. */
  readonly uniformRadiusPixels?: number;
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
  readonly referenceGuides?: readonly ScatterReferenceGuide[];
  readonly emptyMessage?: string;
  readonly children: (scale: ScatterChartScale) => ReactNode;
}

const PRIMARY_GUIDE_CLASS = "stroke-[#00696E]/70";
const SECONDARY_GUIDE_CLASS = "stroke-border";

/** Distinct per kind, so the legend swatch identifies the line without a label on it. */
const GUIDE_DASH_BY_KIND = {
  parity: "6 3",
  vertical: "2 3",
  horizontal: "2 3",
} as const;

export function ScatterFrame({
  x,
  y,
  rawMaxMagnitude,
  uniformRadiusPixels,
  xAxisLabel,
  yAxisLabel,
  formatX,
  formatY,
  plotHeightClassName = "h-96",
  caption,
  rowColumnLabel,
  valueColumnLabels,
  tableRows,
  referenceGuides = [],
  emptyMessage = "Nothing to plot yet.",
  children,
}: ScatterFrameProps) {
  if (tableRows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const scale = computeScatterChartScale({ x, y, rawMaxMagnitude, uniformRadiusPixels });

  // Top-down, because that is the order the axis reads on screen. The ticks themselves are
  // ascending — the frame reverses a copy rather than asking the scale for a second ordering.
  const descendingYTicks = scale.yTicks.toReversed();

  // The `y = x` segment, clipped to whatever both domains actually cover. Computed here rather
  // than drawn corner-to-corner: the two axes rarely span the same decades, and a box diagonal
  // would be a line whose every point satisfies something other than `y = x`.
  const parityLowValue = Math.max(scale.xDomainMinValue, scale.yDomainMinValue);
  const parityHighValue = Math.min(scale.xDomainMaxValue, scale.yDomainMaxValue);
  const hasParitySegment = parityLowValue < parityHighValue;

  return (
    <figure className="space-y-2">
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <div className="flex flex-col justify-between py-0 text-right text-[10px] leading-none text-muted-foreground">
          {descendingYTicks.map((tickValue, tickIndex) => (
            // Keyed on the POSITION, not the value: a value key collides the moment two ticks
            // round together.
            <span key={`y-tick-${String(tickIndex)}`}>{formatY(tickValue)}</span>
          ))}
        </div>

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
                  className="stroke-border/50"
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
                  className="stroke-border/50"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {/* THE GUIDES, drawn here so they share the gridlines' arithmetic and their
                non-scaling stroke exactly. A guide one pixel off its own threshold would put
                points on the wrong side of a line the legend counts them against. */}
            {referenceGuides.map((guide) => {
              const strokeClassName =
                guide.isPrimary === true ? PRIMARY_GUIDE_CLASS : SECONDARY_GUIDE_CLASS;
              const commonProps = {
                className: strokeClassName,
                strokeWidth: 1,
                strokeDasharray: GUIDE_DASH_BY_KIND[guide.kind],
                vectorEffect: "non-scaling-stroke" as const,
              };

              if (guide.kind === "parity") {
                if (!hasParitySegment) return null;
                return (
                  <line
                    key={guide.key}
                    x1={scale.xUnits(parityLowValue)}
                    y1={scale.yUnits(parityLowValue)}
                    x2={scale.xUnits(parityHighValue)}
                    y2={scale.yUnits(parityHighValue)}
                    {...commonProps}
                  />
                );
              }

              if (guide.value === undefined) return null;

              if (guide.kind === "vertical") {
                const guideX = scale.xUnits(guide.value);
                return (
                  <line
                    key={guide.key}
                    x1={guideX}
                    x2={guideX}
                    y1={0}
                    y2={scale.plotHeightUnits}
                    {...commonProps}
                  />
                );
              }

              const guideY = scale.yUnits(guide.value);
              return (
                <line
                  key={guide.key}
                  x1={0}
                  x2={PLOT_WIDTH_UNITS}
                  y1={guideY}
                  y2={guideY}
                  {...commonProps}
                />
              );
            })}
          </svg>

          {/* THE OVERLAY. Points only — positioned by percentage against the same integer
              arithmetic the gridlines use, so a point and a gridline at the same value land on
              the same pixel, and nothing here can be deformed by the container's shape. */}
          <div className="absolute inset-0">{children(scale)}</div>
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

      {referenceGuides.length === 0 ? null : (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {referenceGuides.map((guide) => (
            <li key={`legend-${guide.key}`} className="flex items-center gap-1.5">
              <svg aria-hidden width={18} height={8} className="shrink-0">
                <line
                  x1={0}
                  x2={18}
                  y1={4}
                  y2={4}
                  className={guide.isPrimary === true ? PRIMARY_GUIDE_CLASS : SECONDARY_GUIDE_CLASS}
                  strokeWidth={1}
                  strokeDasharray={GUIDE_DASH_BY_KIND[guide.kind]}
                />
              </svg>
              <span className={guide.isPrimary === true ? "text-foreground" : undefined}>
                {guide.label}
              </span>
            </li>
          ))}
        </ul>
      )}

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
