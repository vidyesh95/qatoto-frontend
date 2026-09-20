// TRANSPORT: client-query — "use client" island. Reads GET /discovery/problem-clusters through
// `useProblemClustersQuery`, scoped to the map's own viewport, and is seeded with the server
// page's first read so the pins are on screen before that query resolves. Needs QueryProvider,
// which (home)/layout.tsx mounts.
//
// ⚠️ **THIS BANNER SAID `props-only` UNTIL THE VIEWPORT LANDED**, and moving it was part of the
// same change rather than a tidy-up afterwards. `docs/R_AND_D_STRUCTURE.md` §19's transport map is
// derived from these lines, so a file that fetches while claiming `props-only` does not make the
// map slightly stale — it makes it a lie.
//
// It also still owns pin/card SELECTION, which is what it has always been for.
"use client";

import Image from "next/image";
import { type ReactNode, useState, useSyncExternalStore } from "react";

import CivicPulseVectorMap, {
  type MapViewportReport,
} from "@/components/home/research-and-development/sections/civic-pulse-vector-map";
import {
  PIN_ICON_SRC_BY_ICON_KEY,
  PIN_RING_CLASS,
  PIN_SIZE_CLASS,
} from "@/components/home/research-and-development/sections/problem-map-pins";
import ProblemClusterList from "@/components/home/research-and-development/sections/problem-report-list";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { useProblemClustersQuery } from "@/hooks/rnd/discovery";
import type { PaginationMeta } from "@/lib/http";
import {
  getMapCanvasModeSnapshot,
  getServerMapCanvasModeSnapshot,
  subscribeToMapCanvasMode,
} from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import { layOutMapPins } from "@/lib/rnd/map-pin-layout";
import { projectMicrodegreesToMapPercent, toOpportunityBand } from "@/lib/rnd/map-projection";
import {
  type MapCamera,
  toMapCameraSearchParams,
  type ViewportBoundsMicrodegrees,
} from "@/lib/rnd/map-viewport";

/**
 * The no-pins array, hoisted so it keeps ONE identity for the life of the module.
 *
 * ⚠️ **A FRESH `[]` HERE IS NOT FREE.** `civic-pulse-vector-map`'s marker effect lists `clusters`
 * as a dependency and both creates and destroys markers in it, so an array that is a new object on
 * every render re-runs that effect on every render — which destroys every marker it just made and
 * schedules the next render while doing it. The pins disappear and the surface never settles.
 */
const NO_CLUSTERS: ProblemCluster[] = [];

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
 * What the list beside the map is showing.
 *
 * ⚠️ **THREE EMPTINESSES, NOT ONE**, and telling them apart is most of the point of this union.
 * "Nothing has been clustered yet" recruits a reporter, "nothing matches these filters" asks for a
 * filter to be cleared, and "nothing in this view" asks for a zoom — and giving a reader the wrong
 * one of those tells them to fix something that is not broken. A `hasMatches` boolean beside an
 * `isFiltered` boolean is exactly the bag of flags CLAUDE.md Pattern 1 rules out, because it can
 * hold two of these at once.
 */
type ProblemMapListState =
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "loading" }
  | { readonly status: "emptyColdStart" }
  | { readonly status: "emptyFiltered" }
  | { readonly status: "emptyViewport" }
  | {
      readonly status: "ready";
      readonly clusters: ProblemCluster[];
      /**
       * The SERVER's count, from `pagination.total` — not `clusters.length`.
       *
       * ⚠️ The endpoint is offset-paginated with a capped `limit`, so at a wide zoom the page is a
       * prefix of the answer. Printing the row count as "in view" would be a number the reader can
       * disprove by zooming in and watching it go up.
       */
      readonly totalCount: number;
    };

function toProblemMapListState(input: {
  readonly isError: boolean;
  readonly rows: ProblemCluster[] | undefined;
  readonly pagination: PaginationMeta | null | undefined;
  readonly hasAnyCluster: boolean;
  readonly hasAnyClusterMatchingFilters: boolean;
  readonly viewportBounds: ViewportBoundsMicrodegrees | null;
}): ProblemMapListState {
  if (input.isError) return { status: "error", message: "Couldn't load the problem map." };
  if (input.rows === undefined) return { status: "loading" };

  if (input.rows.length > 0) {
    return {
      status: "ready",
      clusters: input.rows,
      totalCount: input.pagination === null ? input.rows.length : (input.pagination?.total ?? 0),
    };
  }

  // Nothing anywhere beats every other reading of zero.
  if (!input.hasAnyCluster) return { status: "emptyColdStart" };

  /**
   * ⚠️ **"DOES THIS FILTER MATCH ANYTHING ANYWHERE" IS A FACT, NOT A GUESS ABOUT THE BOX.**
   *
   * The first version of this asked how WIDE the viewport was and called a wide one "the whole
   * world", on the theory that a reader looking at the planet has nothing left to zoom out to.
   * Measured, that was simply wrong: the default camera renders a 629x269 canvas showing 180 deg
   * of longitude and 68 deg of latitude, so it never came close to any sane threshold — and a
   * filter matching nothing anywhere told the reader to zoom out, which would have done nothing
   * for them however far they took it.
   *
   * The server page already reads the same filters UNBOUNDED, so whether the filter matches
   * anything is something we are holding rather than something to infer from geometry. Zoom is
   * only ever the answer when matches exist and are simply somewhere else.
   */
  if (!input.hasAnyClusterMatchingFilters) return { status: "emptyFiltered" };
  if (input.viewportBounds !== null) return { status: "emptyViewport" };

  // Unreachable: with no viewport this query IS the unbounded one, so it cannot return zero rows
  // while that same read reported matches. Named rather than thrown so the union stays total.
  return { status: "emptyFiltered" };
}

function formatClusterCountLabel(totalCount: number, hasViewport: boolean): string {
  const clusterNoun = totalCount === 1 ? "cluster" : "clusters";
  return hasViewport ? `${totalCount} ${clusterNoun} in view` : `${totalCount} ${clusterNoun}`;
}

/**
 * Writes the camera into the address bar.
 *
 * ⚠️ **`history.replaceState`, NEVER `router.replace`.** Both leave the history stack alone, which
 * is the property the design brief asked for — one entry per drag would make the back button
 * replay a pan instead of leaving the surface. But `router.replace` to the same route also runs an
 * RSC round-trip, so the server component would re-read the whole cluster list on every gesture
 * while the island was already fetching the same thing on the client. This changes the URL and
 * nothing else, which is all that is wanted.
 *
 * ⚠️ **IT IS NOT CALLED FOR THE MAP'S OWN INITIAL REPORT.** A reader who has not touched the map
 * has not chosen a view, and writing one on arrival would pin a camera into every link they copy
 * before they ever looked at it.
 */
function writeMapCameraToAddressBar(camera: MapCamera) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(toMapCameraSearchParams(camera))) {
    url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

type ProblemMapCanvasProps = {
  /** The server page's own first read, used until the first viewport-scoped read lands. */
  readonly initialClusters: ProblemCluster[];
  readonly initialPagination: PaginationMeta | null;
  /**
   * Whether ANY cluster exists, filters ignored.
   *
   * ⚠️ **IT COMES FROM ITS OWN `limit: 1` READ AND CANNOT BE DERIVED HERE.** Every read this island
   * makes is filtered, viewport-scoped or both, so a zero result is ambiguous by construction —
   * cold start and "you are looking at an empty ocean" are the identical response.
   */
  readonly hasAnyCluster: boolean;
  /**
   * Whether the CURRENT filters match anything at all, viewport ignored — the server page's own
   * unbounded read. It is what separates "this filter matches nothing" from "matches exist, but
   * not where you are looking", which no property of the bounding box can answer.
   */
  readonly hasAnyClusterMatchingFilters: boolean;
  readonly selectedCategorySlug: string | undefined;
  readonly selectedRegionSlug: string | undefined;
  /** Drops `?category` and `?region` while keeping the camera. Built by the server page. */
  readonly clearFiltersHref: string;
  /** Page size, mirrored from the server page so both reads ask for the same thing. */
  readonly clustersPageLimit: number;
  /** The camera a shared link carried, or `null`. */
  readonly initialCamera: MapCamera | null;
};

/**
 * Civic Pulse map canvas.
 *
 * TWO RENDERERS, ONE SELECTION STATE. This component owns `selectedClusterId` and hands it to
 * whichever canvas is active, so cross-highlighting between a pin and its card behaves identically
 * either way and the flag cannot change the surface's behaviour, only its ground.
 *
 * ⚠️ **AND ONE FETCH, WHICH ONLY ONE OF THE THREE MODES SCOPES.** A bounding box is meaningful
 * only where there is something to pan: the static SVG has one fixed extent and the reduced-data
 * mode draws no canvas at all, so both send no viewport and read the unbounded page. Sending a
 * box from a canvas that cannot move would pin the list to whatever the first render happened to
 * cover, with no control anywhere on the page to change it.
 */
export default function ProblemMapCanvas({
  initialClusters,
  initialPagination,
  hasAnyCluster,
  hasAnyClusterMatchingFilters,
  selectedCategorySlug,
  selectedRegionSlug,
  clearFiltersHref,
  clustersPageLimit,
  initialCamera,
}: ProblemMapCanvasProps) {
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
  const [reportedViewportBounds, setReportedViewportBounds] =
    useState<ViewportBoundsMicrodegrees | null>(null);
  const mapCanvasMode = useResolvedMapCanvasMode();

  const isVectorCanvasLive = mapCanvasMode === "vector" && !hasVectorMapFailed;
  /**
   * ⚠️ **THE VIEWPORT IS DROPPED THE MOMENT THE VECTOR CANVAS IS NOT THE ONE ON SCREEN.** A tile
   * outage hands the surface to the static SVG, which cannot pan; keeping the last reported box
   * would leave the reader looking at a world map whose list is scoped to a city they can no
   * longer navigate away from.
   */
  const activeViewportBounds = isVectorCanvasLive ? reportedViewportBounds : null;

  const clustersQuery = useProblemClustersQuery({
    category: selectedCategorySlug,
    region: selectedRegionSlug,
    sort: "opportunity",
    limit: clustersPageLimit,
    viewportBounds: activeViewportBounds,
    initialRows: initialClusters,
    initialPagination,
  });

  const listState = toProblemMapListState({
    isError: clustersQuery.isError,
    rows: clustersQuery.data?.rows,
    pagination: clustersQuery.data?.pagination,
    hasAnyCluster,
    hasAnyClusterMatchingFilters,
    viewportBounds: activeViewportBounds,
  });

  const toggleSelectedCluster = (clusterId: string) => {
    setSelectedClusterId((previousSelectedClusterId) =>
      previousSelectedClusterId === clusterId ? null : clusterId,
    );
  };

  const handleViewportChange = (viewport: MapViewportReport) => {
    setReportedViewportBounds(viewport.bounds);
    if (!viewport.isInitial) writeMapCameraToAddressBar(viewport.camera);
  };

  /**
   * The pins the canvas draws.
   *
   * An error or an emptiness draws NO pins but still draws the map: the brief's rule is that a
   * failed read renders the basemap with nothing on it rather than a grey box, and — more
   * importantly — that an empty viewport leaves the map on screen, because the map is the only
   * control that can get the reader out of it.
   */
  const renderedClusters = listState.status === "ready" ? listState.clusters : NO_CLUSTERS;

  function renderListSlot(): ReactNode {
    switch (listState.status) {
      case "error":
        return <RndErrorPanel message={listState.message} />;
      case "loading":
        return <p className="text-sm text-muted-foreground">Loading clusters…</p>;
      case "emptyColdStart":
        return <RndStatusPanel message="No problems have been clustered yet." />;
      case "emptyFiltered":
        return (
          <RndStatusPanel
            message="No clusters match these filters."
            action={
              <a href={clearFiltersHref} className="text-xs font-medium text-[#00696E]">
                Clear filters
              </a>
            }
          />
        );
      case "emptyViewport":
        return <RndStatusPanel message="No clusters in this view. Zoom out to see more." />;
      case "ready":
        return (
          <div className="space-y-3">
            <ClusterCountReadout
              totalCount={listState.totalCount}
              shownCount={listState.clusters.length}
              hasViewport={activeViewportBounds !== null}
            />
            <ProblemClusterList
              clusters={listState.clusters}
              selectedClusterId={selectedClusterId}
              onSelectCluster={toggleSelectedCluster}
            />
          </div>
        );
      default: {
        const exhaustiveCheck: never = listState;
        return exhaustiveCheck;
      }
    }
  }

  switch (mapCanvasMode) {
    case "vector":
      return hasVectorMapFailed ? (
        <StaticWorldMapCanvas
          clusters={renderedClusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
          listSlot={renderListSlot()}
        />
      ) : (
        <CivicPulseVectorMap
          clusters={renderedClusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
          listSlot={renderListSlot()}
          initialCamera={initialCamera}
          onViewportChange={handleViewportChange}
          onUnavailable={() => setHasVectorMapFailed(true)}
        />
      );
    case "listOnly":
      return renderListSlot();
    case "static":
      return (
        <StaticWorldMapCanvas
          clusters={renderedClusters}
          selectedClusterId={selectedClusterId}
          onSelectCluster={toggleSelectedCluster}
          listSlot={renderListSlot()}
        />
      );
    default: {
      const exhaustiveCheck: never = mapCanvasMode;
      return exhaustiveCheck;
    }
  }
}

/**
 * How many clusters the reader is being shown, and — when the page is a prefix — that it is one.
 *
 * ⚠️ **NOTHING HERE MAY ROUND OR SOFTEN THE TWO NUMBERS.** A capped page silently presented as the
 * whole answer is the defect `problem-map-page.tsx` already records against this surface's own
 * history, one layer down: a count over one fetched page reports a fraction of the matches as the
 * total.
 */
function ClusterCountReadout({
  totalCount,
  shownCount,
  hasViewport,
}: {
  readonly totalCount: number;
  readonly shownCount: number;
  readonly hasViewport: boolean;
}) {
  const isPagePrefix = shownCount < totalCount;

  return (
    <p className="text-xs text-muted-foreground">
      {formatClusterCountLabel(totalCount, hasViewport)}
      {isPagePrefix && (
        <>
          {" · "}
          {hasViewport
            ? `Showing the top ${shownCount}. Zoom in to see the rest.`
            : `Showing the top ${shownCount}.`}
        </>
      )}
    </p>
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
 */
function StaticWorldMapCanvas({
  clusters,
  selectedClusterId,
  onSelectCluster,
  listSlot,
}: {
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
  readonly listSlot: ReactNode;
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
      {listSlot}
    </div>
  );
}
