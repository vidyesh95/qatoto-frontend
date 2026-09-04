"use client";

// TRANSPORT: props-only — one positioned element per point, and nothing else. It is a client
// component ONLY because a point can be clicked; it fetches nothing and holds no state, and
// the selection lives with whoever renders the detail.

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
// incapable of that, at any container width. It is also what makes each point a real button
// with a real hit box, which an SVG circle in a stretched viewBox is not.
//
// A POINT WITH A NULL MAGNITUDE DRAWS NOTHING. Zero is a finding and absence is not — a
// commodity nobody has scored must never appear as a dot at the origin, because that pixel is
// indistinguishable from a commodity scored zero and only one of those is a fact.
//
// ⚠️ EVERY POINT IS CLAMPED TO STAY WHOLLY INSIDE THE PLOT, AND THAT IS ALSO A BUG FIX. A
// point at the domain MAXIMUM sits at `left: 100%`, and `translate(-50%, -50%)` then leaves
// half the circle outside — it painted over the caption above the chart and into the page
// margin beside it. `clamp()` mixes `%` and `px` and resolves against the containing block,
// so the centre can be held one radius in from each edge with no measurement, no effect, and
// byte-identical server and client output. It is what a chart library sells as a "plot
// margin". The displacement it costs is at most one radius, and only for a point already
// within a radius of an edge.
//
// ⚠️ A FLOORED POINT IS DRAWN AS A RING, NEVER AS A DOT. On a log axis, zero has no position
// — `scatter-scale.ts` pins it to the floor and reports it through `xIsFloored`/`yIsFloored`.
// A product with NO recorded exports drawn as a solid dot at the bottom of the axis claims a
// small export figure that nobody measured. The ring says "off the scale", and the tooltip
// says which axis.
//
// ⚠️ THERE IS NO COLLISION HANDLING HERE, DELIBERATELY. An earlier version fanned points
// sharing a coordinate onto a phyllotaxis spiral, because the caller was plotting against two
// nine-rung score ladders and two dozen products piled onto six pixels. The axes are now
// continuous money on a log scale, where 50 products occupy 50 distinct positions. Keeping the
// spiral would leave a branch that never runs, and unreachable code is unverified code.

/** How much bigger the selected point draws, in pixels of radius. */
const SELECTED_RADIUS_BONUS_PIXELS = 3;

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
  /** The point currently shown in the detail below, if any. */
  readonly selectedKey?: string | null;
  /** Omit for a chart nobody can click; the points then render as plain `div`s. */
  readonly onSelect?: (point: ScatterPoint) => void;
}

export function ScatterSeries({
  scale,
  points,
  colorClassName,
  formatPoint,
  selectedKey = null,
  onSelect,
}: ScatterSeriesProps) {
  return (
    <>
      {points.map((point) => {
        if (point.magnitude === null) return null;

        const isSelected = point.key === selectedKey;
        const isFloored = scale.xIsFloored(point.x) || scale.yIsFloored(point.y);
        const radiusPixels =
          scale.radiusPixels(point.magnitude) + (isSelected ? SELECTED_RADIUS_BONUS_PIXELS : 0);
        const diameterPixels = radiusPixels * 2;
        const clampedCentre = (percent: number): string =>
          `clamp(${String(radiusPixels)}px, ${String(percent)}%, calc(100% - ${String(radiusPixels)}px))`;

        const flooredNote = isFloored ? " · off the scale — nothing recorded on one axis" : "";
        const pointTitle = `${formatPoint(point)}${flooredNote}`;

        const positionStyle = {
          left: clampedCentre(scale.xPercent(point.x)),
          top: clampedCentre(scale.yPercent(point.y)),
          width: `${String(diameterPixels)}px`,
          height: `${String(diameterPixels)}px`,
          // Centring only. `left`/`top` place the CENTRE, and the clamp above keeps that
          // centre a full radius in from every edge, so the whole circle stays in the box.
          transform: "translate(-50%, -50%)",
        };

        // A ring for a floored point, a filled dot otherwise; the selected one gets a halo
        // rather than a different colour, so selection reads at any palette.
        const appearanceClassName = isFloored
          ? `border-2 border-[#00696E]/70 bg-transparent`
          : `${colorClassName} border border-white/60`;
        const selectionClassName = isSelected
          ? "z-10 ring-2 ring-[#00696E] ring-offset-1 ring-offset-background opacity-100"
          : "opacity-70";

        const className = `absolute rounded-full ${appearanceClassName} ${selectionClassName}`;

        if (onSelect === undefined) {
          return (
            <div key={point.key} title={pointTitle} style={positionStyle} className={className} />
          );
        }

        return (
          <button
            key={point.key}
            type="button"
            // `title` is the mouse affordance and `aria-label` the screen-reader one; the
            // frame's `sr-only` table carries the same figures in a form worth reading in a row.
            title={pointTitle}
            aria-label={pointTitle}
            aria-pressed={isSelected}
            onClick={() => {
              onSelect(point);
            }}
            style={positionStyle}
            className={`${className} cursor-pointer transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]`}
          />
        );
      })}
    </>
  );
}
