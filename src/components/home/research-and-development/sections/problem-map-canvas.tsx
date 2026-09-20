// TRANSPORT: props-only — client island. Picks which of the two renderers draws the pins and
// reports the viewport upward. It fetches nothing: `problem-map-shell` owns the query, and this
// owns the canvas.
//
// ⚠️ **IT WAS `client-query` FOR ONE PART AND IS `props-only` AGAIN**, which is a demotion rather
// than a regression. Part 1 put the viewport-scoped read here because this was the only client
// component on the surface. The shell now wraps the map AND the panel, and the query has to sit
// above both of them — the panel renders the rows and the count, so a read owned by the canvas
// would have to be handed sideways to a sibling.
"use client";

import Image from "next/image";
import { useState } from "react";

import CivicPulseVectorMap, {
  type MapViewportReport,
} from "@/components/home/research-and-development/sections/civic-pulse-vector-map";
import {
  PIN_ICON_SRC_BY_ICON_KEY,
  PIN_RING_CLASS,
  PIN_SIZE_CLASS,
} from "@/components/home/research-and-development/sections/problem-map-pins";
import type { MapCanvasModeKind, MapViewMode } from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import { layOutMapPins } from "@/lib/rnd/map-pin-layout";
import { projectMicrodegreesToMapPercent, toOpportunityBand } from "@/lib/rnd/map-projection";
import type { MapCamera } from "@/lib/rnd/map-viewport";

type ProblemMapCanvasProps = {
  /** `listOnly` never reaches here — the shell renders no map region at all in that mode. */
  readonly mode: Exclude<MapCanvasModeKind, "listOnly">;
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
  readonly initialCamera: MapCamera | null;
  readonly onViewportChange: (viewport: MapViewportReport) => void;
  /**
   * Flat or tilted. Reaches the vector renderer only — the static SVG has one fixed overhead
   * projection and no camera to pitch, which is also why the shell hides the control in that mode.
   */
  readonly viewMode: MapViewMode;
};

/**
 * The map region. Fills whatever box the shell gives it, at every breakpoint.
 *
 * TWO RENDERERS, ONE SELECTION STATE, held by the shell above — so cross-highlighting between a pin
 * and its row behaves identically either way and the flag cannot change the surface's behaviour,
 * only its ground.
 *
 * ⚠️ **THE FALLBACK IS THE STATIC CANVAS, NOT A MESSAGE.** Flipping the flag on must never leave a
 * reader worse off than leaving it off, and the SVG's only shortcoming is that its projection is
 * approximate. Losing geographic precision beats losing the pins.
 */
export default function ProblemMapCanvas({
  mode,
  clusters,
  selectedClusterId,
  onSelectCluster,
  initialCamera,
  onViewportChange,
  viewMode,
}: ProblemMapCanvasProps) {
  /**
   * Set when the basemap cannot be shown — a dead tile host, or a browser that refuses the GL
   * context after the WebGL2 probe passed. Held here rather than in the shell because it is a fact
   * about the renderer, and nothing above the canvas behaves differently for it.
   */
  const [hasVectorMapFailed, setHasVectorMapFailed] = useState(false);

  if (mode === "vector" && !hasVectorMapFailed) {
    return (
      <CivicPulseVectorMap
        clusters={clusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={onSelectCluster}
        initialCamera={initialCamera}
        onViewportChange={onViewportChange}
        viewMode={viewMode}
        onUnavailable={() => setHasVectorMapFailed(true)}
      />
    );
  }

  return (
    <StaticWorldMapCanvas
      clusters={clusters}
      selectedClusterId={selectedClusterId}
      onSelectCluster={onSelectCluster}
    />
  );
}

/**
 * The original canvas: pins absolutely positioned over a static world-map image — no map library —
 * by projecting each cluster's centroid microdegrees (`@/lib/rnd/map-projection`).
 *
 * There is no `mapPosition` on the wire and there must not be: a CSS offset into one specific SVG
 * is meaningless to the native clients, so the server sends coordinates and each client projects
 * them for its own canvas.
 *
 * ⚠️ **ITS PROJECTION IS APPROXIMATE AND CANNOT BE MADE EXACT**, which is why the vector canvas
 * exists. `map-projection.ts` says of its two latitude constants that they are "calibrated
 * estimates from the aspect ratio, not exact" — the SVG carries no `viewBox` and declares no
 * projection, so there is no ground truth to calibrate against. This renderer is kept as the
 * no-WebGL and flag-off path, not as the preferred one.
 *
 * ⚠️ **IT REPORTS NO VIEWPORT AND MUST NOT BE MADE TO.** Its extent is the whole world, fixed, with
 * no pan and no zoom, so the only honest box it could send is the one the unbounded read already
 * covers.
 *
 * ⚠️ **THE IMAGE IS `contain`, NOT `cover`.** In a full-height region the box no longer matches the
 * SVG's 2000x857, and cropping a world map moves every pin off the country it belongs to — the
 * projection is already approximate and this would compound it silently. Letterboxing is the
 * honest failure.
 */
function StaticWorldMapCanvas({
  clusters,
  selectedClusterId,
  onSelectCluster,
}: {
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
}) {
  // PROJECT EVERY PIN FIRST, THEN LAY THEM OUT TOGETHER. Projection is per-cluster and could
  // stay inline in the map below; de-overlapping cannot, because whether a pin needs to move is
  // a fact about the OTHER pins. Two clusters in neighbouring suburbs project onto the same
  // pixel — 35km is 0.3% of this canvas — and the one drawn second used to cover the first
  // completely, swallowing every click aimed at it. `layOutMapPins` fans such a group out around
  // its shared centre and leaves every non-colliding pin exactly where it projected.
  //
  // THE VECTOR CANVAS DOES NOT CALL THIS, and that is not an oversight: the overlap it solves is
  // an artefact of ONE FIXED SCALE. On a map that zooms, two pins a kilometre apart separate by
  // zooming in, and displacing them from their real coordinates would make the pin lie about
  // where the cluster is — the exact defect the vector canvas was built to remove.
  //
  // Not wrapped in `useMemo`: the React Compiler is on (`next.config.ts`), so it memoises this
  // for us, and a hand-rolled memo here would be a second cache to keep correct.
  const laidOutPins = layOutMapPins(
    clusters.map((cluster) => ({
      id: cluster.id,
      position: projectMicrodegreesToMapPercent({
        latitudeMicrodegrees: cluster.centroidLatitudeMicrodegrees,
        longitudeMicrodegrees: cluster.centroidLongitudeMicrodegrees,
      }),
    })),
  );

  return (
    <div className="absolute inset-0 bg-primary-imprint/5">
      {/* The pins are positioned in percentages of THIS element, so it has to be exactly the
          rendered image's box rather than the region's — hence the aspect-ratio wrapper centred in
          the region rather than a bare `object-contain` image filling it. */}
      <div className="absolute top-1/2 left-1/2 aspect-2000/857 max-h-full w-full -translate-x-1/2 -translate-y-1/2">
        <Image
          src="/dummy/world_map.svg"
          width={2000}
          height={857}
          alt="World map of reported problems"
          className="h-full w-full object-contain"
        />
        {clusters.map((cluster, clusterIndex) => {
          const isSelected = cluster.id === selectedClusterId;
          const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);
          // `layOutMapPins` returns its results in input order, so this index lines up.
          const pinPosition = laidOutPins[clusterIndex].position;

          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => onSelectCluster(cluster.id)}
              aria-label={`${cluster.title} — ${cluster.locationLabel ?? "location not resolved"}`}
              aria-pressed={isSelected}
              style={{ left: `${pinPosition.leftPercent}%`, top: `${pinPosition.topPercent}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer overflow-hidden rounded-full bg-white ring-2 ${PIN_SIZE_CLASS[opportunityBand]} ${PIN_RING_CLASS[opportunityBand]} ${
                isSelected ? "z-10 ring-[3px] ring-offset-2" : ""
              }`}
            >
              <Image
                src={PIN_ICON_SRC_BY_ICON_KEY[cluster.category.pinIconKey]}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
