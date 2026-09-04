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
// chart whose bubbles are not round has destroyed the area encoding it exists to carry, and it
// reads as a different chart type entirely.
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

export function ScatterSeries({ scale, points, colorClassName, formatPoint }: ScatterSeriesProps) {
  return (
    <>
      {points.map((point) => {
        if (point.magnitude === null) return null;

        const radiusPixels = scale.radiusPixels(point.magnitude);
        const diameterPixels = radiusPixels * 2;

        return (
          <div
            key={point.key}
            // `title`, not a `<title>` child — this is an HTML element now.
            title={formatPoint(point)}
            style={{
              left: `${String(scale.xPercent(point.x))}%`,
              top: `${String(scale.yPercent(point.y))}%`,
              width: `${String(diameterPixels)}px`,
              height: `${String(diameterPixels)}px`,
            }}
            // Semi-transparent because a dense scatter overlaps, and an opaque point hides the
            // one behind it — with integer score components many commodities share exact
            // coordinates, and the stacking IS information about where the mass sits.
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/50 ${colorClassName} opacity-55`}
          />
        );
      })}
    </>
  );
}
