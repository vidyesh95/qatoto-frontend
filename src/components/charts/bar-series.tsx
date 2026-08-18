// TRANSPORT: props-only — one `<rect>` per value, and nothing else.

import type { BarChartScale } from "@/lib/charts/bar-scale";

// The bars. Everything that positions them lives in `bar-scale.ts`; everything around them lives
// in `chart-frame.tsx`. This file exists so a grouped chart is two of these with different
// `seriesIndex` values rather than a `series[]` prop and a loop with an index in it.
//
// A `null` VALUE DRAWS NO RECT. Zero is a finding and absence is not — a viewer with no rows gets
// `null` from the backend and must never see a bar, not even a zero-height one, because the two
// are the same pixel and only one of them is a fact about them. The `sr-only` table the frame
// renders is where the difference is stated in words.
//
// NO ROUNDED CORNERS, deliberately. The frame's viewBox is `preserveAspectRatio="none"`, so an
// `rx` would render as an ellipse whose eccentricity changes with the container width.

interface BarSeriesProps {
  readonly scale: BarChartScale;
  /** Which slot inside the band this series occupies. `0` for a single-series chart. */
  readonly seriesIndex: number;
  readonly values: readonly (number | null)[];
  /** A Tailwind fill utility over a `--chart-*` token, e.g. `fill-chart-2`. */
  readonly colorClassName: string;
  /** Names this series in the hover title, e.g. "Watched". */
  readonly seriesLabel: string;
  /** Band labels, aligned by index with `values`, for the hover title. */
  readonly bandLabels: readonly string[];
  readonly formatValue: (value: number) => string;
}

export function BarSeries({
  scale,
  seriesIndex,
  values,
  colorClassName,
  seriesLabel,
  bandLabels,
  formatValue,
}: BarSeriesProps) {
  return (
    <>
      {values.map((value, bandIndex) => {
        if (value === null) return null;

        const heightUnits = scale.heightUnits(value);
        if (heightUnits === 0) return null;

        return (
          <rect
            key={bandLabels[bandIndex] ?? String(bandIndex)}
            x={scale.barLeftUnits(bandIndex, seriesIndex)}
            y={scale.plotHeightUnits - heightUnits}
            width={scale.barWidthUnits}
            height={heightUnits}
            className={colorClassName}
          >
            {/* The mouse affordance, and the only one. There is no tooltip layer and no hover
                state: a native `<title>` costs nothing, and the exact numbers are in the table. */}
            <title>{`${bandLabels[bandIndex] ?? ""} · ${seriesLabel}: ${formatValue(value)}`}</title>
          </rect>
        );
      })}
    </>
  );
}
