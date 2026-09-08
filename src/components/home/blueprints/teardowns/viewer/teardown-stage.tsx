// TRANSPORT: props-only — the stage: a CSS backdrop, the lazily loaded canvas, and the floating
// controls over it. It owns no state; the explorer above passes everything in.

"use client";

import type { ReactNode, RefObject } from "react";

import type { ExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import CameraPresetMenu from "@/components/home/blueprints/teardowns/viewer/camera-preset-menu";
import StressLegend from "@/components/home/blueprints/teardowns/viewer/stress-legend";
import ViewportToolRail from "@/components/home/blueprints/teardowns/viewer/viewport-tool-rail";
import ViewportZoomControl from "@/components/home/blueprints/teardowns/viewer/viewport-zoom-control";

export interface TeardownStageProps {
  readonly store: ExplosionStore;
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly isInteractive: boolean;
  readonly hasStressRatings: boolean;
  /** The canvas, a status pill or an error panel — whichever the load state calls for. */
  readonly children: ReactNode;
}

/**
 * THE BACKDROP IS CSS, NOT GEOMETRY. A vignette that brightens under the model and a faint square
 * grid, painted behind a transparent canvas. Drawing them in the scene cost draw calls, tied the
 * backdrop to the camera, and — because three's `Raycaster.params.Line.threshold` defaults to a
 * metre against a scene centimetres across — put a raycast target in front of every callout pin,
 * which silently hid all of them. A background image has none of those problems.
 */
const STAGE_BACKGROUND_STYLE = {
  backgroundImage: [
    "linear-gradient(to right, rgba(15, 23, 42, 0.05) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(15, 23, 42, 0.05) 1px, transparent 1px)",
    "radial-gradient(120% 90% at 50% 38%, #FFFFFF 0%, #F1F2F4 46%, #E1E4E8 100%)",
  ].join(", "),
  backgroundSize: "34px 34px, 34px 34px, 100% 100%",
} as const;

export default function TeardownStage({
  store,
  stageRef,
  isInteractive,
  hasStressRatings,
  children,
}: TeardownStageProps) {
  return (
    <div
      ref={stageRef}
      // `isolate` keeps the callout pins' stacking context local, so a pin can never float over
      // the site navbar. Fullscreen targets this element, so the controls travel with the canvas.
      className="relative isolate h-[min(68vh,720px)] min-h-80 w-full overflow-hidden rounded-xl border border-[#CAC4D0]/60"
      style={STAGE_BACKGROUND_STYLE}
    >
      {children}

      <ViewportToolRail
        store={store}
        isInteractive={isInteractive}
        hasStressRatings={hasStressRatings}
      />

      <StressLegend store={store} />

      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
        <CameraPresetMenu store={store} isInteractive={isInteractive} />
        <ViewportZoomControl store={store} isInteractive={isInteractive} stageRef={stageRef} />
      </div>
    </div>
  );
}
