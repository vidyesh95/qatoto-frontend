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
// ⚠️ EVERY POINT IS CLAMPED TO STAY WHOLLY INSIDE THE PLOT, AND THAT IS ALSO A BUG FIX. Two
// things pushed points out of the box and onto the surrounding page:
//
//   1. A point at the domain MAXIMUM sits at `left: 100%`, and `translate(-50%, -50%)` then
//      leaves half the circle outside. That was true before any fan-out existed.
//   2. The fan-out below adds up to `13 × √index` px on top of that — a cluster of five
//      reaches 26px, plus the radius, so ~35px of circle landed past the boundary and
//      painted over the caption above the chart.
//
// `clamp()` mixes `%` and `px` and resolves against the containing block, so the centre can
// be held one radius in from each edge with no measurement, no effect, and byte-identical
// server and client output. It is what a chart library sells as a "plot margin".
//
// The displacement it costs is at most ONE RADIUS, and only for a point already within a
// radius of an edge. The reading survives that: the fan had already moved the point, the
// ladder had already discarded far more precision than 11px of plot (see `PlacedPoint`
// below), and the frame's `sr-only` table carries the exact figures either way.

/**
 * How far apart fanned-out neighbours sit, in pixels.
 *
 * Tuned against `MAXIMUM_POINT_RADIUS_PIXELS` in `scatter-scale.ts`: a little over one
 * diameter, so two neighbours overlap enough to read as one cluster and not so much that
 * either centre is hidden.
 */
const CLUSTER_SPACING_PIXELS = 13;

/**
 * The golden angle, in radians.
 *
 * Phyllotaxis — the arrangement a sunflower head uses. Successive points at this angle with a
 * radius of `spacing × √index` pack evenly with no ring seams and no parameters to tune per
 * cluster size, which is what makes it work identically for a cell holding two points and one
 * holding twenty.
 */
const GOLDEN_ANGLE_RADIANS = Math.PI * (3 - Math.sqrt(5));

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
 * Where one point sits after collided neighbours have been fanned apart.
 *
 * ⚠️ WHY THIS EXISTS AT ALL, AND WHY IT IS NOT DISHONEST. Both axes on the localization
 * scatter are LADDER OUTPUTS: import dependence can only be one of nine values (0, 2, 5, 10,
 * 15, 21, 26, 31, 35) and export capability likewise. That is a 9×9 grid by construction, so
 * the top of any ranking piles onto a handful of cells — 24 commodities rendered as 6 visible
 * circles, which is a chart that has stopped reporting.
 *
 * The ladder ALREADY discarded the precision this displaces. A commodity at 31 points is
 * somewhere in a wide band of import values that all round to the same rung, so nudging it a
 * few pixels adds no error the score has not already introduced. What it must not do is imply
 * a reading the axis cannot support — so the offsets are in PIXELS rather than data units,
 * they are small, and the caller labels the chart as fanned.
 *
 * ⚠️ DETERMINISTIC, NOT JITTERED. Position comes from the point's index within its cell, in
 * the order the caller supplied. Random jitter would move points on every render and, on a
 * server-rendered surface, differ between the server and client passes — a hydration mismatch
 * and a chart that will not sit still.
 */
interface PlacedPoint {
  readonly point: ScatterPoint;
  readonly offsetXPixels: number;
  readonly offsetYPixels: number;
  /** How many points share this exact coordinate, including this one. */
  readonly clusterSize: number;
  /** 1-based position within that cluster, so a tooltip can say "3 of 8". */
  readonly clusterIndex: number;
}

function placePoints(
  points: readonly ScatterPoint[],
  scale: ScatterChartScale,
): readonly PlacedPoint[] {
  // Group by the RENDERED coordinate rather than the raw value: two points a hundredth of a
  // point apart land on the same pixel and need separating just the same.
  const cellMembers = new Map<string, ScatterPoint[]>();
  for (const point of points) {
    if (point.magnitude === null) continue;
    const cellKey = `${String(scale.xPercent(point.x))}:${String(scale.yPercent(point.y))}`;
    const members = cellMembers.get(cellKey);
    if (members === undefined) {
      cellMembers.set(cellKey, [point]);
    } else {
      members.push(point);
    }
  }

  const placed: PlacedPoint[] = [];
  for (const members of cellMembers.values()) {
    for (const [memberIndex, point] of members.entries()) {
      // The first point of a cell keeps the TRUE coordinate. A lone point is never moved, and
      // in a cluster the centre one still marks where the cell actually is.
      const spiralRadius = memberIndex === 0 ? 0 : CLUSTER_SPACING_PIXELS * Math.sqrt(memberIndex);
      const spiralAngle = memberIndex * GOLDEN_ANGLE_RADIANS;
      placed.push({
        point,
        // Rounded to whole pixels, exactly once, here — the same rule `scatter-scale.ts`
        // states about hydration.
        offsetXPixels: Math.round(spiralRadius * Math.cos(spiralAngle)),
        offsetYPixels: Math.round(spiralRadius * Math.sin(spiralAngle)),
        clusterSize: members.length,
        clusterIndex: memberIndex + 1,
      });
    }
  }
  return placed;
}

export function ScatterSeries({ scale, points, colorClassName, formatPoint }: ScatterSeriesProps) {
  return (
    <>
      {placePoints(points, scale).map((placement) => {
        const { point } = placement;
        // Narrowed already by `placePoints`, which drops null magnitudes; repeated so the
        // type holds without an assertion.
        if (point.magnitude === null) return null;

        const radiusPixels = scale.radiusPixels(point.magnitude);
        const diameterPixels = radiusPixels * 2;
        // The fan offset lives INSIDE the clamp, not in `transform` — a transform is applied
        // after layout and nothing can bound it, which is how points ended up on the page.
        const clampedCentre = (percent: number, offsetPixels: number): string =>
          `clamp(${String(radiusPixels)}px, calc(${String(percent)}% + ${String(offsetPixels)}px), calc(100% - ${String(radiusPixels)}px))`;
        const clusterNote =
          placement.clusterSize > 1
            ? ` · ${String(placement.clusterIndex)} of ${String(placement.clusterSize)} at this exact score`
            : "";

        return (
          <div
            key={point.key}
            // `title`, not a `<title>` child — this is an HTML element now.
            title={`${formatPoint(point)}${clusterNote}`}
            style={{
              left: clampedCentre(scale.xPercent(point.x), placement.offsetXPixels),
              top: clampedCentre(scale.yPercent(point.y), placement.offsetYPixels),
              width: `${String(diameterPixels)}px`,
              height: `${String(diameterPixels)}px`,
              // Centring only. `left`/`top` place the CENTRE, and the clamp above keeps that
              // centre a full radius in from every edge, so the whole circle stays in the box.
              transform: "translate(-50%, -50%)",
            }}
            // Semi-transparent so a fanned cluster still reads as one group and the overlap
            // shows where the mass sits.
            className={`absolute rounded-full border border-white/60 ${colorClassName} opacity-70`}
          />
        );
      })}
    </>
  );
}
