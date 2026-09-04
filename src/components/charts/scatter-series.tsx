// TRANSPORT: props-only — one `<circle>` per point, and nothing else.

import type { ScatterChartScale } from "@/lib/charts/scatter-scale";

// The points. Everything that positions them lives in `scatter-scale.ts`; everything around
// them lives in `scatter-frame.tsx`. Mirrors `bar-series.tsx` rule for rule:
//
// A POINT WITH A NULL MAGNITUDE DRAWS NOTHING. Zero is a finding and absence is not — a
// commodity nobody has scored must never appear as a dot at the origin, because that pixel is
// indistinguishable from a commodity scored zero and only one of those is a fact.
//
// THE `<title>` IS THE ONLY MOUSE AFFORDANCE. There is no tooltip layer and no hover state: a
// native `<title>` costs nothing, and the exact numbers are in the frame's `sr-only` table.
//
// ⚠️ `vectorEffect="non-scaling-stroke"` ON THE OUTLINE. The viewBox is
// `preserveAspectRatio="none"`, so without it a stroke would be a different thickness on a wide
// screen than a narrow one — the same reason the frame's gridlines carry it. The CIRCLES
// themselves do stretch into ellipses with the container, which is accepted: their position is
// the reading, and their size is a rank rather than a measurement.

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
  /** A Tailwind fill utility over a `--chart-*` token, e.g. `fill-chart-2`. */
  readonly colorClassName: string;
  readonly formatPoint: (point: ScatterPoint) => string;
}

export function ScatterSeries({ scale, points, colorClassName, formatPoint }: ScatterSeriesProps) {
  return (
    <>
      {points.map((point) => {
        if (point.magnitude === null) return null;

        return (
          <circle
            key={point.key}
            cx={scale.xUnits(point.x)}
            cy={scale.yUnits(point.y)}
            r={scale.radiusUnits(point.magnitude)}
            // Semi-transparent because a dense scatter overlaps, and an opaque point hides the
            // one behind it — the overlap itself is information about where the mass sits.
            className={`${colorClassName} stroke-white/40 opacity-55`}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          >
            <title>{formatPoint(point)}</title>
          </circle>
        );
      })}
    </>
  );
}
