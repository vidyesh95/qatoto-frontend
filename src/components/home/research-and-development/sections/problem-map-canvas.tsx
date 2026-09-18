// TRANSPORT: props-only — client island. Holds pin/card SELECTION state and decides which of the
// two canvases renders; clusters arrive as props from the server page, which read
// GET /discovery/problem-clusters. Fetches nothing, so it needs no QueryProvider.
//
// It used to import MOCK_PROBLEM_REPORTS directly — the one island on this surface that pulled a
// whole dataset into the client bundle. Category filtering moved to the query string (the chips
// are server-rendered Links), so what is left here is the one thing that genuinely belongs on the
// client: syncing a clicked pin with its card, and now picking a renderer for the pins.
"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";

import CivicPulseVectorMap from "@/components/home/research-and-development/sections/civic-pulse-vector-map";
import {
  PIN_ICON_SRC_BY_ICON_KEY,
  PIN_RING_CLASS,
  PIN_SIZE_CLASS,
} from "@/components/home/research-and-development/sections/problem-map-pins";
import ProblemClusterList from "@/components/home/research-and-development/sections/problem-report-list";
import {
  getMapCanvasModeSnapshot,
  getServerMapCanvasModeSnapshot,
  subscribeToMapCanvasMode,
} from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import { layOutMapPins } from "@/lib/rnd/map-pin-layout";
import { projectMicrodegreesToMapPercent, toOpportunityBand } from "@/lib/rnd/map-projection";

/**
 * ⚠️ **THE FIRST RENDER IS ALWAYS `static`, ON THE SERVER AND ON THE CLIENT.**
 *
 * WebGL2 support and `prefers-reduced-data` are browser facts the server cannot know, so reading
 * them during render would make the server HTML and the hydration render disagree and React would
 * throw away the subtree. `useSyncExternalStore` makes that exact rather than approximate: its
 * third argument is used for BOTH the SSR render and the hydration render, and the real value is
 * adopted on the render after.
 *
 * It is the mechanism `browser-preferences-context.tsx` already uses, for the identical reason.
 * The earlier draft of this did the same job with `useState` + an effect, which works but starts a
 * cascading render and is what `react(set-state-in-effect)` flags.
 *
 * The three modes and the reason `static` rather than `listOnly` is the no-WebGL2 fallback live in
 * `@/lib/rnd/civic-pulse-map`.
 */
function useResolvedMapCanvasMode() {
  return useSyncExternalStore(
    subscribeToMapCanvasMode,
    getMapCanvasModeSnapshot,
    getServerMapCanvasModeSnapshot,
  );
}

/**
 * Civic Pulse map canvas.
 *
 * TWO RENDERERS, ONE SELECTION STATE. This component owns `selectedClusterId` and hands it to
 * whichever canvas is active, so cross-highlighting between a pin and its card behaves identically
 * either way and the flag cannot change the surface's behaviour, only its ground.
 */
export default function ProblemMapCanvas({ clusters }: { clusters: ProblemCluster[] }) {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  /**
   * Set when the basemap cannot be shown — a dead tile host, or a browser that refuses the GL
   * context after the WebGL2 probe passed.
   *
   * ⚠️ **THE FALLBACK IS THE STATIC CANVAS, NOT A MESSAGE.** Flipping the flag on must never leave
   * a reader worse off than leaving it off, and the SVG's only shortcoming is that its projection
   * is approximate. Losing geographic precision beats losing the pins.
   */
  const [hasVectorMapFailed, setHasVectorMapFailed] = useState(false);
  const mapCanvasMode = useResolvedMapCanvasMode();

  const toggleSelectedCluster = (clusterId: string) => {
    setSelectedClusterId((previousSelectedClusterId) =>
      previousSelectedClusterId === clusterId ? null : clusterId,
    );
  };

  switch (mapCanvasMode) {
    case "vector":
      return hasVectorMapFailed ? (
        <StaticWorldMapCanvas
          clusters={clusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
        />
      ) : (
        <CivicPulseVectorMap
          clusters={clusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
          onUnavailable={() => setHasVectorMapFailed(true)}
        />
      );
    case "listOnly":
      return (
        <ProblemClusterList
          clusters={clusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
        />
      );
    case "static":
      return (
        <StaticWorldMapCanvas
          clusters={clusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
        />
      );
    default: {
      const exhaustiveCheck: never = mapCanvasMode;
      return exhaustiveCheck;
    }
  }
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
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="relative w-full self-start rounded-2xl bg-[#00696E]/5 p-2 sm:p-4">
        <Image
          src="/dummy/world_map.svg"
          width={2000}
          height={857}
          alt="World map of reported problems"
          className="h-auto w-full"
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
      <ProblemClusterList
        clusters={clusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={onSelectCluster}
      />
    </div>
  );
}
