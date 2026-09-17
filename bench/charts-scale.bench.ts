// CHART LAYOUT, WHICH IS ARITHMETIC PER POINT AND PER GRIDLINE.
//
// `computeScatterChartScale` is cheap to build and then called once per axis per point by the
// series that renders it — the opportunity picker plots hundreds of commodities, each one asking
// for `xPercent`, `yPercent` and `radiusPixels`. So the benchmarks below separate the BUILD from
// the PROJECTION pass: only the second one grows with the dataset.
//
// Log and linear axes are separate benchmarks because the log path takes a `Math.log10` per call,
// and a regression in it would be invisible behind the linear numbers.

import type { Bench } from "tinybench";

import { chooseNiceDomainMax, computeBarChartScale } from "@/lib/charts/bar-scale";
import { computeScatterChartScale, type ScatterChartScale } from "@/lib/charts/scatter-scale";

/** Annual import/export pairs spanning three and a half orders of magnitude, as the picker sees. */
const POINTS = Array.from({ length: 400 }, (_unused, index) => ({
  // Every 37th product has no imports and every 53rd none exported: zero is a finding, and on a
  // log axis it takes the `isFloored` path rather than a logarithm.
  x: index % 37 === 0 ? 0 : 14_000_000 * (1 + (index % 1_400)),
  y: index % 53 === 0 ? 0 : 9_000_000 * (1 + (index % 2_200)),
  magnitude: 1 + (index % 97),
}));

const rawMaxX = Math.max(...POINTS.map((point) => point.x));
const rawMaxY = Math.max(...POINTS.map((point) => point.y));

const logScale = computeScatterChartScale({
  x: { kind: "log", rawMin: 14_000_000, rawMax: rawMaxX },
  y: { kind: "log", rawMin: 9_000_000, rawMax: rawMaxY },
  rawMaxMagnitude: 97,
});

/** The bounded case: a score out of a budget of 35, which must not be rounded up to 50. */
const linearScale = computeScatterChartScale({
  x: { rawMax: 35, domainMax: 35, tickIntervalCount: 5 },
  y: { rawMax: 35, domainMax: 35, tickIntervalCount: 5 },
  rawMaxMagnitude: 97,
});

/** Thirty days of a three-series studio chart. */
const barScale = computeBarChartScale({ bandCount: 30, seriesCount: 3, rawMaxValue: 4_271 });
const BAR_VALUES = Array.from({ length: 90 }, (_unused, index) => (index * 137) % 4_271);

const DOMAIN_MAXIMA = [0, 1, 7, 42, 4_271, 87_600, 2_300_000_000];

function project(scale: ScatterChartScale): void {
  for (const point of POINTS) {
    scale.xPercent(point.x);
    scale.yPercent(point.y);
    scale.xUnits(point.x);
    scale.yUnits(point.y);
    scale.xIsFloored(point.x);
    scale.yIsFloored(point.y);
    scale.radiusPixels(point.magnitude);
  }
}

export function registerChartScaleBenchmarks(bench: Bench): void {
  bench
    .add("chart scales — computeScatterChartScale build, log axes", () => {
      computeScatterChartScale({
        x: { kind: "log", rawMin: 14_000_000, rawMax: rawMaxX },
        y: { kind: "log", rawMin: 9_000_000, rawMax: rawMaxY },
        rawMaxMagnitude: 97,
      });
    })
    .add("chart scales — scatter projection, 400 points, log axes", () => {
      project(logScale);
    })
    .add("chart scales — scatter projection, 400 points, linear axes", () => {
      project(linearScale);
    })
    .add("chart scales — bar layout pass, 30 bands x 3 series", () => {
      for (const [index, value] of BAR_VALUES.entries()) {
        const bandIndex = Math.trunc(index / 3);
        barScale.bandLeftUnits(bandIndex);
        barScale.barLeftUnits(bandIndex, index % 3);
        barScale.heightUnits(value);
      }
    })
    .add("chart scales — chooseNiceDomainMax over the 1/2/2.5/5/10 ladder", () => {
      for (const rawMax of DOMAIN_MAXIMA) {
        chooseNiceDomainMax(rawMax);
      }
    });
}
