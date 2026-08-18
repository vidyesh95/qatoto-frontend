// TRANSPORT: props-only — pure geometry, no React, no network.
//
// The layout half of the repo's charting. `chart-frame.tsx` renders what this computes and
// `bar-series.tsx` draws into it; neither owns any arithmetic.
//
// EVERYTHING IS INTEGER USER UNITS, not float percent, for the reason `src/lib/rnd/branch-tree-layout.ts`
// states about the branch map: integer arithmetic renders identically on every platform, where a
// float would place a bar edge a sub-pixel apart between the server render and the client one and
// produce a hydration mismatch. Every coordinate this module hands out has already been rounded,
// exactly once, here — a caller that rounds again is rounding a rounded number.
//
// RECHARTS' LAYOUT CONVENTIONS ARE THE REFERENCE, not its code. A band axis with a category gap
// expressed as a share of the band, a value axis rounded up to a "nice" tick, four gridlines, and
// the plot as a rect inset from the drawing area — that is the vocabulary this file implements in
// about a hundred lines, because every chart on this surface is rects.

/** The drawing width every chart shares. Arbitrary, and arbitrary is the point: it is a viewBox. */
export const PLOT_WIDTH_UNITS = 1000;

/** Default drawing height. The rendered height comes from CSS; this only fixes the aspect math. */
export const DEFAULT_PLOT_HEIGHT_UNITS = 300;

/**
 * The gap between two bands, in per-mille of one band's width.
 *
 * Recharts' `barCategoryGap` default is `"10%"` and this is that number, kept as an integer so the
 * gap divides without a float. It is a gap BETWEEN bands, so half of it sits on each side.
 */
const CATEGORY_GAP_PERMILLE = 100;

/** How many gridlines the value axis draws, counting the baseline and the top. */
const VALUE_TICK_INTERVAL_COUNT = 4;

/**
 * The shortest bar a non-zero value is allowed to render as.
 *
 * A day with four seconds of watching against a domain of ten hours rounds to zero height, and a
 * bar of zero height is indistinguishable from a day with nothing at all — which is the one
 * distinction this whole surface exists to keep (zero is a finding, absence is not). Two units is
 * roughly one device pixel at the sizes we render, so it reads as "a sliver", never as a quantity.
 */
const MINIMUM_VISIBLE_BAR_UNITS = 2;

export interface BarChartScale {
  readonly bandCount: number;
  readonly seriesCount: number;
  readonly plotWidthUnits: number;
  readonly plotHeightUnits: number;
  /** The top of the value axis — always >= the largest value handed in, never below it. */
  readonly domainMaxValue: number;
  /** Ascending, `[0 … domainMaxValue]`. The frame draws one gridline per entry. */
  readonly valueTicks: readonly number[];
  readonly barWidthUnits: number;
  /** Left edge of a band, in user units. */
  bandLeftUnits(bandIndex: number): number;
  /** Left edge of one series' bar inside a band. */
  barLeftUnits(bandIndex: number, seriesIndex: number): number;
  /** Bar height for a value. `0` for a zero value; never below `MINIMUM_VISIBLE_BAR_UNITS` above it. */
  heightUnits(value: number): number;
}

/**
 * The smallest round number at or above `rawMaxValue`, from the 1 / 2 / 2.5 / 5 / 10 ladder.
 *
 * An axis topped at the exact maximum puts the tallest bar flush against the ceiling and gives the
 * intermediate gridlines meaningless labels (`4,271` / `8,542`). Rounding up is what makes the
 * ticks readable, and the ladder is the one every plotting library converged on.
 *
 * Returns `1` for a max of zero or below: an empty chart still needs a domain to divide by, and a
 * domain of zero would render every bar full height.
 */
export function chooseNiceDomainMax(rawMaxValue: number): number {
  if (!Number.isFinite(rawMaxValue) || rawMaxValue <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(rawMaxValue));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = Math.ceil(step * magnitude);
    if (candidate >= rawMaxValue) return candidate;
  }
  return Math.ceil(rawMaxValue);
}

export function computeBarChartScale(input: {
  readonly bandCount: number;
  readonly seriesCount: number;
  readonly rawMaxValue: number;
  readonly plotHeightUnits?: number;
}): BarChartScale {
  const bandCount = Math.max(1, Math.trunc(input.bandCount));
  const seriesCount = Math.max(1, Math.trunc(input.seriesCount));
  const plotHeightUnits = Math.trunc(input.plotHeightUnits ?? DEFAULT_PLOT_HEIGHT_UNITS);
  const domainMaxValue = chooseNiceDomainMax(input.rawMaxValue);

  // The band edge is derived from the index rather than accumulated from a band width, so the
  // rounding error stays below one unit everywhere instead of compounding across thirty bands.
  const bandLeftUnits = (bandIndex: number): number =>
    Math.round((bandIndex * PLOT_WIDTH_UNITS) / bandCount);

  const nominalBandWidthUnits = Math.round(PLOT_WIDTH_UNITS / bandCount);
  const categoryGapUnits = Math.round((nominalBandWidthUnits * CATEGORY_GAP_PERMILLE) / 1000);
  const groupWidthUnits = Math.max(1, nominalBandWidthUnits - categoryGapUnits);
  const barWidthUnits = Math.max(1, Math.floor(groupWidthUnits / seriesCount));

  // FEWER INTERVALS THAN THE DEFAULT WHEN THE DOMAIN IS TINY. Four intervals over a domain of 1
  // rounds to `[0, 0, 1, 1, 1]` — an axis that reads "0 0 1 1 1", five gridlines stacked on three
  // positions, and duplicate React keys downstream. Capping the interval count at the domain keeps
  // every tick a distinct integer, which is what makes the sequence strictly increasing.
  const tickIntervalCount = Math.min(VALUE_TICK_INTERVAL_COUNT, Math.max(1, domainMaxValue));
  const valueTicks = Array.from({ length: tickIntervalCount + 1 }, (_unused, tickIndex) =>
    Math.round((domainMaxValue * tickIndex) / tickIntervalCount),
  );

  return {
    bandCount,
    seriesCount,
    plotWidthUnits: PLOT_WIDTH_UNITS,
    plotHeightUnits,
    domainMaxValue,
    valueTicks,
    barWidthUnits,
    bandLeftUnits,
    barLeftUnits: (bandIndex, seriesIndex) =>
      bandLeftUnits(bandIndex) + Math.round(categoryGapUnits / 2) + seriesIndex * barWidthUnits,
    heightUnits: (value) => {
      if (!Number.isFinite(value) || value <= 0) return 0;
      const exactUnits = Math.round((value * plotHeightUnits) / domainMaxValue);
      return Math.min(plotHeightUnits, Math.max(MINIMUM_VISIBLE_BAR_UNITS, exactUnits));
    },
  };
}
