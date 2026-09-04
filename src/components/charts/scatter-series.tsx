// TRANSPORT: props-only — one positioned element per point, and nothing else.

import type { ScatterChartScale } from "@/lib/charts/scatter-scale";

// The points. Everything that positions them lives in `scatter-scale.ts`; everything around
// them lives in `scatter-frame.tsx`.
//
// ⚠️ THEY ARE HTML, NOT SVG, AND THAT IS THE FIX FOR A REAL BUG. The first version drew
// `<circle>` inside the frame's `preserveAspectRatio="none"` viewBox, and a comment here
// claimed the resulting distortion was acceptable "because position is the reading and size is
// a rank". It was not: at 1900x320 against a 1000x600 viewBox the x axis scales 1.90 and the y
// axis 0.53, so a `r=40` circle rendered 152px wide by 43px tall — a 3.6:1 ellipse. A bubble
// chart whose bubbles are not round has destroyed the area encoding it exists to carry.
//
// An HTML element with equal width and height and a full border-radius is geometrically
// incapable of that, at any container width. `chart-frame.tsx` already splits SVG (geometry)
// from HTML (anything that must keep its shape) for text; a point belongs on the HTML side of
// exactly the same line.
//
// A POINT WITH A NULL MAGNITUDE DRAWS NOTHING. Zero is a finding and absence is not — a
// commodity nobody has scored must never appear as a dot at the origin, because that pixel is
// indistinguishable from a commodity scored zero and only one of those is a fact.
//
// THE `title` ATTRIBUTE IS THE ONLY MOUSE AFFORDANCE. There is no tooltip layer and no hover
// state: it costs nothing, and the exact numbers are in the frame's `sr-only` table.
//
// ⚠️ EVERY POINT IS CLAMPED TO STAY WHOLLY INSIDE THE PLOT, AND THAT IS ALSO A BUG FIX. A
// point at the domain MAXIMUM sits at `left: 100%`, and `translate(-50%, -50%)` then leaves
// half the circle outside — it painted over the caption above the chart and into the page
// margin beside it. `clamp()` mixes `%` and `px` and resolves against the containing block,
// so the centre can be held one radius in from each edge with no measurement, no effect, and
// byte-identical server and client output. It is what a chart library sells as a "plot
// margin".
//
// The displacement it costs is at most ONE RADIUS, and only for a point already within a
// radius of an edge. The `sr-only` table carries the exact figures either way.
//
// ⚠️ THERE IS NO COLLISION HANDLING HERE, DELIBERATELY. An earlier version fanned points
// sharing a coordinate onto a phyllotaxis spiral, because the caller was plotting one circle
// per COMMODITY against two nine-rung score ladders and two dozen of them piled onto six
// pixels. The caller now plots one circle per score CELL, so a shared coordinate is not
// possible — the nine rungs map to nine distinct percentages on each axis. Keeping the spiral
// would leave a branch that never runs, and unreachable code is unverified code. If a
// per-item scatter comes back, so does the fan-out; git has it.

export interface ScatterPoint {
  readonly key: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  /** Sets the radius, by AREA. `null` draws nothing — see the module header. */
  readonly magnitude: number | null;
}

interface ScatterSeriesProps {
  readonly scale: ScatterChartScale;
  readonly points: readonly ScatterPoint[];
  /** A Tailwind background utility over a `--chart-*` token, e.g. `bg-chart-2`. */
  readonly colorClassName: string;
  readonly formatPoint: (point: ScatterPoint) => string;
}

/**
 * Biggest first, so the smallest circles are painted LAST and sit on top.
 *
 * ⚠️ NOT COSMETIC. Neighbouring coordinates can be closer than a large circle's radius — on
 * the localization scatter the bottom two export-capability rungs are one point apart out of
 * twenty-five, about 15px of a 384px plot — so a cell holding 370 commodities will cover the
 * centre of the cell holding 53 beside it. In source order the big one lands on top and the
 * small one disappears entirely; in this order the small one is always visible against the
 * large one behind it. The standard bubble-chart rule, and the one a hand-rolled chart skips.
 *
 * `toSorted`, because the caller's array is `readonly` and reordering theirs would be a side
 * effect. `null` magnitudes sort to the end and are dropped in the map below.
 */
function largestFirst(points: readonly ScatterPoint[]): readonly ScatterPoint[] {
  return points.toSorted((left, right) => (right.magnitude ?? -1) - (left.magnitude ?? -1));
}

export function ScatterSeries({ scale, points, colorClassName, formatPoint }: ScatterSeriesProps) {
  return (
    <>
      {largestFirst(points).map((point) => {
        if (point.magnitude === null) return null;

        const radiusPixels = scale.radiusPixels(point.magnitude);
        const diameterPixels = radiusPixels * 2;
        const clampedCentre = (percent: number): string =>
          `clamp(${String(radiusPixels)}px, ${String(percent)}%, calc(100% - ${String(radiusPixels)}px))`;

        return (
          <div
            key={point.key}
            // `title`, not a `<title>` child — this is an HTML element now.
            title={formatPoint(point)}
            style={{
              left: clampedCentre(scale.xPercent(point.x)),
              top: clampedCentre(scale.yPercent(point.y)),
              width: `${String(diameterPixels)}px`,
              height: `${String(diameterPixels)}px`,
              // Centring only. `left`/`top` place the CENTRE, and the clamp above keeps that
              // centre a full radius in from every edge, so the whole circle stays in the box.
              transform: "translate(-50%, -50%)",
            }}
            // Semi-transparent so a circle overlapping its neighbour still shows both.
            className={`absolute rounded-full border border-white/60 ${colorClassName} opacity-70`}
          />
        );
      })}
    </>
  );
}
