// TRANSPORT: props-only — renders what it is handed; it fetches nothing and owns no state.

import type { ReactNode } from "react";

import { computeBarChartScale, PLOT_WIDTH_UNITS, type BarChartScale } from "@/lib/charts/bar-scale";

// The frame half of the repo's charting: margins, plot rect, value axis, gridlines, band labels
// and the accessible table. `bar-series.tsx` draws the rects; `bar-scale.ts` does the arithmetic.
//
// NO CHART LIBRARY, AND THIS FILE IS THE ARGUMENT. Every chart on this surface is bars — a 30-day
// series, a 24-bucket histogram — so what a charting dependency would actually buy is ~100KB
// gzipped of scales, tooltips, animation and `cloneElement` plumbing, to draw rects.
//
// ONLY THE RECTS AND GRIDLINES ARE SVG. Every piece of text is HTML, positioned over the plot,
// which is the same split `research-branch-map.tsx` makes (SVG paths, HTML nodes) and it is here
// for a concrete reason: this chart renders inside a `w-95` account dropdown, and `<text>` in a
// `preserveAspectRatio="none"` viewBox is stretched horizontally by whatever the container width
// happens to be. HTML labels stay at their real size and real font at every width.
//
// THE `<svg>` IS `aria-hidden` AND THE FRAME RENDERS AN `sr-only` TABLE. A bar chart read aloud is
// a list of numbers, and the numbers are what this surface is for — so they are marked up as a
// table with real headers rather than smuggled into an `aria-label`.

/** One category on the band axis — a day, an hour, a month. */
export interface ChartBand {
  readonly key: string;
  readonly label: string;
}

/** One row of the accessible table: a band, and one already-formatted cell per column. */
export interface ChartTableRow {
  readonly key: string;
  readonly label: string;
  readonly cells: readonly string[];
}

/** A swatch in the legend, for a chart with more than one series. */
export interface ChartLegendEntry {
  readonly label: string;
  /** A Tailwind background utility over a `--chart-*` token, e.g. `bg-chart-2`. */
  readonly swatchClassName: string;
}

interface ChartFrameProps {
  readonly bands: readonly ChartBand[];
  /** How many series draw into this frame. Fixes the bar width; it is not a styling hint. */
  readonly seriesCount: number;
  /** The largest value any series will draw. The axis is rounded up from it, never below it. */
  readonly rawMaxValue: number;
  /** Formats a value-axis tick. Charts pass the same formatter they use for their own values. */
  readonly formatValue: (value: number) => string;
  /**
   * Label every Nth band. 30 daily bars in a 380px dropdown have room for about six labels, and
   * an unreadable label is worse than none — the exact values are in the table below.
   */
  readonly labelEvery: number;
  /** Height of the plot, as a Tailwind class so the caller controls it per surface. */
  readonly plotHeightClassName?: string;
  /** The table's caption, and the chart's own accessible name. */
  readonly caption: string;
  /** Header for the band column of the table, e.g. "Day" or "Hour (UTC)". */
  readonly bandColumnLabel: string;
  readonly valueColumnLabels: readonly string[];
  readonly tableRows: readonly ChartTableRow[];
  readonly legend?: readonly ChartLegendEntry[];
  /** Shown instead of the plot when there is nothing to draw. */
  readonly emptyMessage?: string;
  readonly children: (scale: BarChartScale) => ReactNode;
}

export function ChartFrame({
  bands,
  seriesCount,
  rawMaxValue,
  formatValue,
  labelEvery,
  plotHeightClassName = "h-40",
  caption,
  bandColumnLabel,
  valueColumnLabels,
  tableRows,
  legend,
  emptyMessage = "Nothing recorded yet.",
  children,
}: ChartFrameProps) {
  if (bands.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const scale = computeBarChartScale({
    bandCount: bands.length,
    seriesCount,
    rawMaxValue,
  });

  // Top-down, because that is the order the axis reads on screen. The value ticks themselves are
  // ascending — the frame reverses a copy rather than asking `bar-scale.ts` for a second ordering.
  const descendingValueTicks = scale.valueTicks.toReversed();

  return (
    <figure className="space-y-2">
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <div className="flex flex-col justify-between py-0 text-right text-[10px] leading-none text-muted-foreground">
          {descendingValueTicks.map((tickValue) => (
            <span key={tickValue}>{formatValue(tickValue)}</span>
          ))}
        </div>

        <div className={plotHeightClassName}>
          <svg
            aria-hidden
            viewBox={`0 0 ${PLOT_WIDTH_UNITS} ${scale.plotHeightUnits}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
          >
            {scale.valueTicks.map((tickValue) => {
              // Computed here rather than through `scale.heightUnits`, which floors a non-zero
              // value to a visible sliver — correct for a bar, wrong for a gridline.
              const tickHeightUnits = Math.round(
                (tickValue * scale.plotHeightUnits) / scale.domainMaxValue,
              );
              const tickY = scale.plotHeightUnits - tickHeightUnits;
              return (
                <line
                  key={tickValue}
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
            {children(scale)}
          </svg>
        </div>

        <div aria-hidden />

        <div className="relative mt-1 h-4 text-[10px] leading-none text-muted-foreground">
          {bands.map((band, bandIndex) => {
            if (bandIndex % labelEvery !== 0) return null;
            // The drawing width is 1000 units, so a band's centre in units IS its position in
            // per-mille — divided by ten to become the percentage offset the label sits at.
            const centrePermille = Math.round(
              (scale.bandLeftUnits(bandIndex) + scale.bandLeftUnits(bandIndex + 1)) / 2,
            );
            return (
              <span
                key={band.key}
                style={{ left: `${centrePermille / 10}%` }}
                className="absolute -translate-x-1/2 whitespace-nowrap"
              >
                {band.label}
              </span>
            );
          })}
        </div>
      </div>

      {legend && legend.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-xs ${entry.swatchClassName}`} aria-hidden />
              {entry.label}
            </li>
          ))}
        </ul>
      )}

      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{bandColumnLabel}</th>
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
