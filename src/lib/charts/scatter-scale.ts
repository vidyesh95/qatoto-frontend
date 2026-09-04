// TRANSPORT: props-only — pure geometry, no React, no network.
//
// The layout half of the repo's SCATTER charting, the two-continuous-axis sibling of
// `bar-scale.ts`. `scatter-frame.tsx` renders what this computes and `scatter-series.tsx`
// draws into it; neither owns any arithmetic.
//
// WHY A SECOND SCALE MODULE RATHER THAN A FLAG ON THE FIRST. `bar-scale.ts` is BAND-based: its
// x axis is a list of categories and its whole vocabulary — `bandLeftUnits`, `barWidthUnits`,
// the category gap — is about dividing a width into slots. A scatter has two continuous axes
// and no bands at all, so the two share one thing (`chooseNiceDomainMax`) and nothing else.
//
// IT HANDS OUT COORDINATES IN TWO SHAPES, AND THAT IS DELIBERATE:
//
//   `xUnits` / `yUnits`        integer viewBox units, for the SVG gridlines
//   `xPercent` / `yPercent`    percentages, for the HTML overlay the POINTS live in
//
// Both are derived from the same integer arithmetic, so a point and a gridline at the same
// value land on the same pixel. The percentages exist because a point drawn as an SVG
// `<circle>` inside a `preserveAspectRatio="none"` viewBox is stretched into an ellipse by
// whatever the container width happens to be — a 1900x320 box against a 1000x600 viewBox
// flattens it 3.6:1, which is a bubble chart whose bubbles encode nothing. HTML circles at a
// pixel radius cannot be stretched. `chart-frame.tsx` makes the same split for text.

import { chooseNiceDomainMax, PLOT_WIDTH_UNITS } from "@/lib/charts/bar-scale";

export { PLOT_WIDTH_UNITS };

/** Default drawing height. The rendered height comes from CSS; this fixes the aspect math. */
export const DEFAULT_SCATTER_HEIGHT_UNITS = 600;

/** How many gridlines each axis draws by default, counting the baseline and the top. */
const DEFAULT_AXIS_TICK_INTERVAL_COUNT = 4;

/**
 * The pixel radius the smallest magnitude still renders at.
 *
 * A point of zero radius is invisible, and an invisible point is indistinguishable from a
 * commodity that was excluded — which is the one distinction this surface exists to keep.
 */
const MINIMUM_POINT_RADIUS_PIXELS = 4;

/**
 * The radius the largest magnitude renders at.
 *
 * ⚠️ THE CEILING IS THE GRID SPACING, NOT AESTHETICS. The opportunity scatter draws one circle
 * per score cell on a nine-by-nine ladder grid, and the tightest spacing is vertical at a
 * narrow viewport: a 384px plot over nine rows is ~43px between neighbouring rows. At 18px the
 * largest circle is 36px across and still clears its neighbour; much beyond that and the
 * biggest cells merge into a blob, which destroys the count encoding.
 *
 * It was briefly 11px, when the series fanned colliding points onto a spiral and a large
 * circle swallowed its own cluster. That fan-out is gone (see `scatter-series.tsx`), and with
 * counts spanning 1 to 507 the area range needs the room back.
 */
const MAXIMUM_POINT_RADIUS_PIXELS = 18;

export interface ScatterChartScale {
  readonly plotWidthUnits: number;
  readonly plotHeightUnits: number;
  readonly xDomainMaxValue: number;
  readonly yDomainMaxValue: number;
  /** Ascending, `[0 … domainMax]`. The frame draws one gridline per entry. */
  readonly xTicks: readonly number[];
  readonly yTicks: readonly number[];
  /** Horizontal position in viewBox units, for the SVG gridlines. */
  xUnits(value: number): number;
  /** Vertical position in viewBox units from the plot's TOP (SVG y grows downward). */
  yUnits(value: number): number;
  /** Horizontal position as a percentage of the plot, for the HTML overlay. */
  xPercent(value: number): number;
  /** Vertical position as a percentage from the TOP, for the HTML overlay. */
  yPercent(value: number): number;
  /** Radius in PIXELS, scaled by AREA. See the note below. */
  radiusPixels(magnitude: number): number;
}

function buildTicks(domainMaxValue: number, requestedIntervalCount: number): readonly number[] {
  // FEWER INTERVALS THAN REQUESTED WHEN THE DOMAIN IS TINY, the same guard `bar-scale.ts`
  // documents: four intervals over a domain of 1 rounds to `[0, 0, 1, 1, 1]` — five gridlines
  // stacked on three positions, and duplicate React keys downstream.
  const intervalCount = Math.min(requestedIntervalCount, Math.max(1, domainMaxValue));
  return Array.from({ length: intervalCount + 1 }, (_unused, tickIndex) =>
    Math.round((domainMaxValue * tickIndex) / intervalCount),
  );
}

export function computeScatterChartScale(input: {
  readonly rawMaxX: number;
  readonly rawMaxY: number;
  readonly rawMaxMagnitude: number;
  /**
   * An explicit ceiling, for an axis that HAS one.
   *
   * ⚠️ `chooseNiceDomainMax` exists to round a MEASURED maximum up to a readable tick, and it
   * is wrong for a bounded axis: a score component out of a budget of 35 rounds up to 50 on
   * the 1/2/2.5/5/10 ladder, inventing fifteen points of headroom the score cannot reach and
   * leaving 30% of the plot permanently empty. Pass the budget and the axis says what it means.
   */
  readonly xDomainMax?: number;
  readonly yDomainMax?: number;
  /** Pick one that divides the domain cleanly — 7 over 35 and 5 over 25 both land on fives. */
  readonly xTickIntervalCount?: number;
  readonly yTickIntervalCount?: number;
  readonly plotHeightUnits?: number;
}): ScatterChartScale {
  const plotHeightUnits = Math.trunc(input.plotHeightUnits ?? DEFAULT_SCATTER_HEIGHT_UNITS);
  const xDomainMaxValue = input.xDomainMax ?? chooseNiceDomainMax(input.rawMaxX);
  const yDomainMaxValue = input.yDomainMax ?? chooseNiceDomainMax(input.rawMaxY);
  const magnitudeMax = Math.max(1, input.rawMaxMagnitude);

  const clampX = (value: number): number =>
    Number.isFinite(value) ? Math.min(Math.max(value, 0), xDomainMaxValue) : 0;
  const clampY = (value: number): number =>
    Number.isFinite(value) ? Math.min(Math.max(value, 0), yDomainMaxValue) : 0;

  return {
    plotWidthUnits: PLOT_WIDTH_UNITS,
    plotHeightUnits,
    xDomainMaxValue,
    yDomainMaxValue,
    xTicks: buildTicks(
      xDomainMaxValue,
      input.xTickIntervalCount ?? DEFAULT_AXIS_TICK_INTERVAL_COUNT,
    ),
    yTicks: buildTicks(
      yDomainMaxValue,
      input.yTickIntervalCount ?? DEFAULT_AXIS_TICK_INTERVAL_COUNT,
    ),

    xUnits: (value) => Math.round((clampX(value) * PLOT_WIDTH_UNITS) / xDomainMaxValue),

    // SVG's y grows downward and a value axis grows upward, so this is the flip. Doing it here
    // rather than in the series means no caller can forget it.
    yUnits: (value) =>
      plotHeightUnits - Math.round((clampY(value) * plotHeightUnits) / yDomainMaxValue),

    // Tenths of a percent, kept integral for the reason the module header gives about hydration:
    // a float here would place a point a sub-pixel apart between the server and client renders.
    xPercent: (value) => Math.round((clampX(value) * 1000) / xDomainMaxValue) / 10,
    yPercent: (value) => 100 - Math.round((clampY(value) * 1000) / yDomainMaxValue) / 10,

    /**
     * ⚠️ SCALED BY AREA, NOT BY DIAMETER, and this is the whole reason bubble charts have a bad
     * name. Mapping a magnitude linearly onto the radius makes a value twice as large draw a
     * circle with FOUR times the ink, and a reader perceives area. So the radius is
     * proportional to the square root of the magnitude, which makes perceived size linear in
     * the number — the correction every serious plotting library applies, and the one a
     * hand-rolled chart is most likely to skip.
     *
     * IN PIXELS, not user units: the point is drawn as HTML precisely so the container's width
     * cannot deform it, and a radius in viewBox units would reintroduce exactly that.
     */
    radiusPixels: (magnitude) => {
      if (!Number.isFinite(magnitude) || magnitude <= 0) return MINIMUM_POINT_RADIUS_PIXELS;
      const areaShare = Math.min(1, magnitude / magnitudeMax);
      const radiusSpan = MAXIMUM_POINT_RADIUS_PIXELS - MINIMUM_POINT_RADIUS_PIXELS;
      return Math.round(MINIMUM_POINT_RADIUS_PIXELS + Math.sqrt(areaShare) * radiusSpan);
    },
  };
}
