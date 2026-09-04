// TRANSPORT: props-only — pure geometry, no React, no network.
//
// The layout half of the repo's SCATTER charting, the two-continuous-axis sibling of
// `bar-scale.ts`. `scatter-frame.tsx` renders what this computes and `scatter-series.tsx`
// draws into it; neither owns any arithmetic.
//
// WHY A SECOND SCALE MODULE RATHER THAN A FLAG ON THE FIRST. `bar-scale.ts` is BAND-based: its
// x axis is a list of categories and its whole vocabulary — `bandLeftUnits`, `barWidthUnits`,
// the category gap — is about dividing a width into slots. A scatter has two continuous axes
// and no bands at all, so the two share one thing (`chooseNiceDomainMax`) and nothing else. A
// union of the two would be a struct where half the fields are meaningless in either mode.
//
// EVERYTHING IS INTEGER USER UNITS, for the reason `bar-scale.ts` states: integer arithmetic
// renders identically on every platform, where a float would place a point a sub-pixel apart
// between the server render and the client one and produce a hydration mismatch. Every
// coordinate handed out has already been rounded, exactly once, here.

import { chooseNiceDomainMax, PLOT_WIDTH_UNITS } from "@/lib/charts/bar-scale";

export { PLOT_WIDTH_UNITS };

/** Default drawing height. The rendered height comes from CSS; this fixes the aspect math. */
export const DEFAULT_SCATTER_HEIGHT_UNITS = 600;

/** How many gridlines each axis draws, counting the baseline and the top. */
const AXIS_TICK_INTERVAL_COUNT = 4;

/**
 * The radius a point with the smallest magnitude still renders at.
 *
 * A point of zero radius is invisible, and an invisible point is indistinguishable from a
 * commodity that was excluded — which is the one distinction this surface exists to keep. Ten
 * units is a few device pixels at the sizes we render, so it reads as "a dot", never as a
 * quantity.
 */
const MINIMUM_POINT_RADIUS_UNITS = 10;

/** The radius the largest magnitude renders at. Bounded so a big bubble cannot swallow a quadrant. */
const MAXIMUM_POINT_RADIUS_UNITS = 46;

export interface ScatterChartScale {
  readonly plotWidthUnits: number;
  readonly plotHeightUnits: number;
  /** Top of the x axis — always >= the largest x handed in, never below it. */
  readonly xDomainMaxValue: number;
  readonly yDomainMaxValue: number;
  /** Ascending, `[0 … domainMax]`. The frame draws one gridline per entry. */
  readonly xTicks: readonly number[];
  readonly yTicks: readonly number[];
  /** Horizontal position of an x value, in user units from the plot's left edge. */
  xUnits(value: number): number;
  /** Vertical position of a y value, in user units from the plot's TOP (SVG y grows downward). */
  yUnits(value: number): number;
  /** Radius for a magnitude, scaled by AREA. See the note on `radiusUnits` below. */
  radiusUnits(magnitude: number): number;
}

function buildTicks(domainMaxValue: number): readonly number[] {
  // FEWER INTERVALS THAN THE DEFAULT WHEN THE DOMAIN IS TINY, the same guard `bar-scale.ts`
  // documents: four intervals over a domain of 1 rounds to `[0, 0, 1, 1, 1]` — five gridlines
  // stacked on three positions, and duplicate React keys downstream.
  const intervalCount = Math.min(AXIS_TICK_INTERVAL_COUNT, Math.max(1, domainMaxValue));
  return Array.from({ length: intervalCount + 1 }, (_unused, tickIndex) =>
    Math.round((domainMaxValue * tickIndex) / intervalCount),
  );
}

export function computeScatterChartScale(input: {
  readonly rawMaxX: number;
  readonly rawMaxY: number;
  readonly rawMaxMagnitude: number;
  readonly plotHeightUnits?: number;
}): ScatterChartScale {
  const plotHeightUnits = Math.trunc(input.plotHeightUnits ?? DEFAULT_SCATTER_HEIGHT_UNITS);
  const xDomainMaxValue = chooseNiceDomainMax(input.rawMaxX);
  const yDomainMaxValue = chooseNiceDomainMax(input.rawMaxY);
  const magnitudeMax = Math.max(1, input.rawMaxMagnitude);

  return {
    plotWidthUnits: PLOT_WIDTH_UNITS,
    plotHeightUnits,
    xDomainMaxValue,
    yDomainMaxValue,
    xTicks: buildTicks(xDomainMaxValue),
    yTicks: buildTicks(yDomainMaxValue),

    xUnits: (value) => {
      if (!Number.isFinite(value)) return 0;
      const clamped = Math.min(Math.max(value, 0), xDomainMaxValue);
      return Math.round((clamped * PLOT_WIDTH_UNITS) / xDomainMaxValue);
    },

    // SVG's y grows downward and a value axis grows upward, so this is the flip. Doing it here
    // rather than in the series means no caller can forget it.
    yUnits: (value) => {
      if (!Number.isFinite(value)) return plotHeightUnits;
      const clamped = Math.min(Math.max(value, 0), yDomainMaxValue);
      return plotHeightUnits - Math.round((clamped * plotHeightUnits) / yDomainMaxValue);
    },

    /**
     * ⚠️ SCALED BY AREA, NOT BY DIAMETER, and this is the whole reason bubble charts have a bad
     * name. Mapping a magnitude linearly onto the radius makes a value twice as large draw a
     * circle with FOUR times the ink, and a reader perceives area. So the radius is
     * proportional to the square root of the magnitude, which makes perceived size linear in
     * the number — the correction Bertin's rules and every serious plotting library apply, and
     * the one a hand-rolled chart is most likely to skip.
     *
     * The result is rounded once, here, and floored at a visible minimum so a real but tiny
     * point never vanishes into "excluded".
     */
    radiusUnits: (magnitude) => {
      if (!Number.isFinite(magnitude) || magnitude <= 0) return MINIMUM_POINT_RADIUS_UNITS;
      const areaShare = Math.min(1, magnitude / magnitudeMax);
      const radiusSpan = MAXIMUM_POINT_RADIUS_UNITS - MINIMUM_POINT_RADIUS_UNITS;
      return Math.round(MINIMUM_POINT_RADIUS_UNITS + Math.sqrt(areaShare) * radiusSpan);
    },
  };
}
