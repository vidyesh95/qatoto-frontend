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
//
// ⚠️ EACH AXIS IS LINEAR OR LOG₁₀, PER AXIS, AND THE LOG MODE IS NOT A PREFERENCE. The
// opportunity picker plots annual imports against annual exports — $14M to $20B, three and a
// half orders of magnitude. On a linear axis every product but the largest handful collapses
// onto the origin. On a log axis they spread out and stay distinguishable, which is the whole
// requirement: one dot per product, each one hoverable.
//
// A LOG AXIS CANNOT SHOW ZERO, and pretending otherwise is the trap. `log10(0)` is `-Infinity`;
// mapping it to "a bit below the smallest value" would draw a product with NO exports as a
// product with few. `xIsFloored` / `yIsFloored` report it instead, and the series marks those
// points differently. Zero is a finding.

import { chooseNiceDomainMax, PLOT_WIDTH_UNITS } from "@/lib/charts/bar-scale";

export { PLOT_WIDTH_UNITS };

/** Default drawing height. The rendered height comes from CSS; this fixes the aspect math. */
export const DEFAULT_SCATTER_HEIGHT_UNITS = 600;

/** How many gridlines a LINEAR axis draws by default, counting the baseline and the top. */
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
 * Only relevant to a caller that varies `magnitude`. The opportunity picker passes a constant
 * — uniform dots — because the one thing it could size by (the feasibility score) is exactly
 * the sum of the two coordinates today and would encode nothing the position does not.
 */
const MAXIMUM_POINT_RADIUS_PIXELS = 18;

export type AxisScaleKind = "linear" | "log";

/**
 * One axis's configuration.
 *
 * `rawMin` is read only in log mode, where a domain needs a floor as well as a ceiling. In
 * linear mode the floor is always zero, because a value axis that does not start at zero
 * exaggerates every difference on it.
 */
export interface ScatterAxisInput {
  readonly kind?: AxisScaleKind;
  readonly rawMax: number;
  /** Log mode only. Values at or below zero are excluded by the caller before this. */
  readonly rawMin?: number;
  /**
   * LINEAR MODE ONLY — an explicit ceiling, for an axis that HAS one.
   *
   * ⚠️ `chooseNiceDomainMax` exists to round a MEASURED maximum up to a readable tick, and it
   * is wrong for a bounded axis: a score component out of a budget of 35 rounds up to 50 on
   * the 1/2/2.5/5/10 ladder, inventing fifteen points of headroom the score cannot reach and
   * leaving 30% of the plot permanently empty. Pass the budget and the axis says what it means.
   */
  readonly domainMax?: number;
  /** Linear mode only. Pick one that divides the domain cleanly. */
  readonly tickIntervalCount?: number;
}

export interface ScatterChartScale {
  readonly plotWidthUnits: number;
  readonly plotHeightUnits: number;
  readonly xDomainMinValue: number;
  readonly xDomainMaxValue: number;
  readonly yDomainMinValue: number;
  readonly yDomainMaxValue: number;
  /** Ascending. The frame draws one gridline per entry. Decade boundaries in log mode. */
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
  /**
   * TRUE when the value could not be placed and was pinned to the axis floor.
   *
   * On a log axis that means zero or negative — an absence, not a small number. A renderer
   * MUST mark these differently; drawing one as an ordinary point states a magnitude nobody
   * measured.
   */
  xIsFloored(value: number): boolean;
  yIsFloored(value: number): boolean;
  /** Radius in PIXELS, scaled by AREA. See the note below. */
  radiusPixels(magnitude: number): number;
}

function buildLinearTicks(
  domainMaxValue: number,
  requestedIntervalCount: number,
): readonly number[] {
  // FEWER INTERVALS THAN REQUESTED WHEN THE DOMAIN IS TINY, the same guard `bar-scale.ts`
  // documents: four intervals over a domain of 1 rounds to `[0, 0, 1, 1, 1]` — five gridlines
  // stacked on three positions, and duplicate React keys downstream.
  const intervalCount = Math.min(requestedIntervalCount, Math.max(1, domainMaxValue));
  return Array.from({ length: intervalCount + 1 }, (_unused, tickIndex) =>
    Math.round((domainMaxValue * tickIndex) / intervalCount),
  );
}

/**
 * Decade boundaries across the domain — 10⁷, 10⁸, 10⁹ …
 *
 * A log axis ticked anywhere else is unreadable: the whole reason to use one is that each
 * gridline is ten times the last, and a reader who knows that can price a dot by eye.
 */
function buildLogTicks(domainMinValue: number, domainMaxValue: number): readonly number[] {
  const firstExponent = Math.round(Math.log10(domainMinValue));
  const lastExponent = Math.round(Math.log10(domainMaxValue));
  return Array.from(
    { length: Math.max(1, lastExponent - firstExponent) + 1 },
    (_unused, tickIndex) => 10 ** (firstExponent + tickIndex),
  );
}

interface AxisScale {
  readonly domainMinValue: number;
  readonly domainMaxValue: number;
  readonly ticks: readonly number[];
  /** 0 at the domain floor, 1 at its ceiling. Everything else is derived from this. */
  fraction(value: number): number;
  isFloored(value: number): boolean;
}

function buildAxisScale(input: ScatterAxisInput): AxisScale {
  if (input.kind === "log") {
    // Snapped OUT to whole decades on both ends, so the axis labels are round numbers and
    // the extreme points are not glued to the frame.
    const safeRawMin = Math.max(1, input.rawMin ?? 1);
    const safeRawMax = Math.max(safeRawMin * 10, input.rawMax);
    const domainMinValue = 10 ** Math.floor(Math.log10(safeRawMin));
    const domainMaxValue = 10 ** Math.ceil(Math.log10(safeRawMax));
    const logMin = Math.log10(domainMinValue);
    const logSpan = Math.log10(domainMaxValue) - logMin;

    return {
      domainMinValue,
      domainMaxValue,
      ticks: buildLogTicks(domainMinValue, domainMaxValue),
      fraction: (value) => {
        // A non-positive value has no logarithm. It is pinned to the floor and reported by
        // `isFloored` so the caller can draw it as the absence it is.
        if (!Number.isFinite(value) || value <= 0) return 0;
        const clamped = Math.min(Math.max(value, domainMinValue), domainMaxValue);
        return (Math.log10(clamped) - logMin) / logSpan;
      },
      isFloored: (value) => !Number.isFinite(value) || value <= 0,
    };
  }

  const domainMaxValue = input.domainMax ?? chooseNiceDomainMax(input.rawMax);
  return {
    domainMinValue: 0,
    domainMaxValue,
    ticks: buildLinearTicks(
      domainMaxValue,
      input.tickIntervalCount ?? DEFAULT_AXIS_TICK_INTERVAL_COUNT,
    ),
    fraction: (value) =>
      Number.isFinite(value) ? Math.min(Math.max(value, 0), domainMaxValue) / domainMaxValue : 0,
    // A linear axis includes zero, so nothing is ever pinned to a floor it does not belong on.
    isFloored: () => false,
  };
}

export function computeScatterChartScale(input: {
  readonly x: ScatterAxisInput;
  readonly y: ScatterAxisInput;
  readonly rawMaxMagnitude: number;
  /**
   * Draw every point at this radius and ignore `magnitude` entirely.
   *
   * ⚠️ FOR A CHART WHERE SIZE MEANS NOTHING, AND SAYING SO EXPLICITLY IS THE POINT. The
   * opportunity picker has nothing honest to encode in area — its feasibility score is exactly
   * the sum of its two coordinates today — so it draws DOTS. Reaching the same result by
   * passing a magnitude far below `rawMaxMagnitude` would work and would look like an
   * accident; this cannot be misread, and a reviewer sees at a glance that no area encoding
   * was dropped by mistake.
   */
  readonly uniformRadiusPixels?: number;
  readonly plotHeightUnits?: number;
}): ScatterChartScale {
  const plotHeightUnits = Math.trunc(input.plotHeightUnits ?? DEFAULT_SCATTER_HEIGHT_UNITS);
  const xAxis = buildAxisScale(input.x);
  const yAxis = buildAxisScale(input.y);
  const magnitudeMax = Math.max(1, input.rawMaxMagnitude);

  return {
    plotWidthUnits: PLOT_WIDTH_UNITS,
    plotHeightUnits,
    xDomainMinValue: xAxis.domainMinValue,
    xDomainMaxValue: xAxis.domainMaxValue,
    yDomainMinValue: yAxis.domainMinValue,
    yDomainMaxValue: yAxis.domainMaxValue,
    xTicks: xAxis.ticks,
    yTicks: yAxis.ticks,

    xUnits: (value) => Math.round(xAxis.fraction(value) * PLOT_WIDTH_UNITS),

    // SVG's y grows downward and a value axis grows upward, so this is the flip. Doing it here
    // rather than in the series means no caller can forget it.
    yUnits: (value) => plotHeightUnits - Math.round(yAxis.fraction(value) * plotHeightUnits),

    // Tenths of a percent, kept integral for the reason the module header gives about hydration:
    // a float here would place a point a sub-pixel apart between the server and client renders.
    xPercent: (value) => Math.round(xAxis.fraction(value) * 1000) / 10,
    yPercent: (value) => 100 - Math.round(yAxis.fraction(value) * 1000) / 10,

    // Wrapped rather than passed by reference: an unbound method handed out as a value is a
    // `this` hazard the linter is right to flag, even where the implementation is a closure.
    xIsFloored: (value) => xAxis.isFloored(value),
    yIsFloored: (value) => yAxis.isFloored(value),

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
      if (input.uniformRadiusPixels !== undefined) return input.uniformRadiusPixels;
      if (!Number.isFinite(magnitude) || magnitude <= 0) return MINIMUM_POINT_RADIUS_PIXELS;
      const areaShare = Math.min(1, magnitude / magnitudeMax);
      const radiusSpan = MAXIMUM_POINT_RADIUS_PIXELS - MINIMUM_POINT_RADIUS_PIXELS;
      return Math.round(MINIMUM_POINT_RADIUS_PIXELS + Math.sqrt(areaShare) * radiusSpan);
    },
  };
}
