// TRANSPORT: props-only — renders what it is handed; it fetches nothing and owns no state.

import type { ReactNode } from "react";

import {
  computeScatterChartScale,
  PLOT_WIDTH_UNITS,
  type ScatterChartScale,
} from "@/lib/charts/scatter-scale";
import type { ChartTableRow } from "@/components/charts/chart-frame";

// The frame half of the repo's SCATTER charting — the two-continuous-axis sibling of
// `chart-frame.tsx`. `scatter-series.tsx` draws the circles; `scatter-scale.ts` does the
// arithmetic. Every rule `chart-frame.tsx` established is kept:
//
//   NO CHART LIBRARY. This draws circles and gridlines. A dependency would buy scales,
//   tooltips and animation to do that.
//
//   ONLY THE CIRCLES AND GRIDLINES ARE SVG; every piece of text is HTML positioned over the
//   plot, because `<text>` in a `preserveAspectRatio="none"` viewBox is stretched horizontally
//   by whatever the container width happens to be.
//
//   THE `<svg>` IS `aria-hidden` AND THE FRAME RENDERS AN `sr-only` TABLE. A scatter read
//   aloud is a list of numbers, and the numbers are what the surface is for.
//
// WHAT THIS ADDS THAT THE BAR FRAME DOES NOT: quadrant shading. A scatter whose whole reading
// is "top-right is the interesting corner" needs that corner marked, or every reader has to be
// told in prose what the chart is for.

export interface ScatterQuadrantLabels {
  /** Shown in the top-right corner — the corner both axes agree on. */
  readonly topRight: string;
  readonly topLeft?: string;
  readonly bottomRight?: string;
  readonly bottomLeft?: string;
}

interface ScatterFrameProps {
  readonly rawMaxX: number;
  readonly rawMaxY: number;
  /** The largest magnitude any point carries. Fixes the radius scale. */
  readonly rawMaxMagnitude: number;
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
  readonly emptyMessage?: string;
  readonly children: (scale: ScatterChartScale) => ReactNode;
}

export function ScatterFrame({
  rawMaxX,
  rawMaxY,
  rawMaxMagnitude,
  xAxisLabel,
  yAxisLabel,
  formatX,
  formatY,
  plotHeightClassName = "h-72",
  caption,
  rowColumnLabel,
  valueColumnLabels,
  tableRows,
  quadrantLabels,
  emptyMessage = "Nothing to plot yet.",
  children,
}: ScatterFrameProps) {
  if (tableRows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const scale = computeScatterChartScale({ rawMaxX, rawMaxY, rawMaxMagnitude });

  // Top-down, because that is the order the axis reads on screen. The ticks themselves are
  // ascending — the frame reverses a copy rather than asking the scale for a second ordering.
  const descendingYTicks = scale.yTicks.toReversed();

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

        <div className={`relative ${plotHeightClassName}`}>
          <svg
            aria-hidden
            viewBox={`0 0 ${PLOT_WIDTH_UNITS} ${scale.plotHeightUnits}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            {/* The sweet-spot corner, washed so it reads before any label does. Drawn first so
                every gridline and point sits above it. */}
            {quadrantLabels === undefined ? null : (
              <rect
                x={PLOT_WIDTH_UNITS / 2}
                y={0}
                width={PLOT_WIDTH_UNITS / 2}
                height={scale.plotHeightUnits / 2}
                className="fill-[#00696E]/5"
              />
            )}

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

            {children(scale)}
          </svg>

          {/* HTML, not `<text>` — see the module header. Absolutely positioned over the plot. */}
          {quadrantLabels === undefined ? null : (
            <>
              <span className="pointer-events-none absolute top-1 right-2 max-w-[45%] text-right text-[10px] leading-tight font-medium text-[#00696E]">
                {quadrantLabels.topRight}
              </span>
              {quadrantLabels.topLeft === undefined ? null : (
                <span className="pointer-events-none absolute top-1 left-2 max-w-[45%] text-[10px] leading-tight text-muted-foreground">
                  {quadrantLabels.topLeft}
                </span>
              )}
              {quadrantLabels.bottomLeft === undefined ? null : (
                <span className="pointer-events-none absolute bottom-1 left-2 max-w-[45%] text-[10px] leading-tight text-muted-foreground">
                  {quadrantLabels.bottomLeft}
                </span>
              )}
              {quadrantLabels.bottomRight === undefined ? null : (
                <span className="pointer-events-none absolute right-2 bottom-1 max-w-[45%] text-right text-[10px] leading-tight text-muted-foreground">
                  {quadrantLabels.bottomRight}
                </span>
              )}
            </>
          )}
        </div>

        <div aria-hidden />

        <div className="relative mt-1 h-4 text-[10px] leading-none text-muted-foreground">
          {scale.xTicks.map((tickValue, tickIndex) => (
            <span
              key={`x-label-${String(tickIndex)}`}
              // The drawing width is 1000 units, so a tick's position in units IS its position
              // in per-mille — divided by ten to become the percentage offset.
              style={{ left: `${scale.xUnits(tickValue) / 10}%` }}
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
