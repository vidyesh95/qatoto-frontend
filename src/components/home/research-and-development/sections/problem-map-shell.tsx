// TRANSPORT: client-query — "use client" island. Reads GET /discovery/problem-clusters through
// `useProblemClustersQuery`, scoped to the map's own viewport, and is seeded with the server page's
// first read so the pins are on screen before that query resolves. Needs QueryProvider, which
// (home)/layout.tsx mounts.
//
// ⚠️ **THE READ LIVES HERE AND NOT IN THE CANVAS BECAUSE TWO SIBLINGS CONSUME IT.** The map draws
// the pins and the panel draws the rows and the count, so an owner lower down would have to hand
// its results sideways.
"use client";

import { useState, useSyncExternalStore } from "react";

import type { MapViewportReport } from "@/components/home/research-and-development/sections/civic-pulse-vector-map";
import ProblemMapBottomSheet from "@/components/home/research-and-development/sections/problem-map-bottom-sheet";
import ProblemMapCanvas from "@/components/home/research-and-development/sections/problem-map-canvas";
import ProblemMapPanel, {
  type ProblemMapFilterOption,
  toProblemMapListState,
} from "@/components/home/research-and-development/sections/problem-map-panel";
import { useProblemClustersQuery } from "@/hooks/rnd/discovery";
import {
  DEFAULT_MAP_VIEW_MODE,
  getMapCanvasModeSnapshot,
  getServerMapCanvasModeSnapshot,
  MAP_VIEW_MODE_LABELS,
  type MapViewMode,
  subscribeToMapCanvasMode,
} from "@/lib/rnd/civic-pulse-map";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";
import type { PaginationMeta } from "@/lib/http";
import type { ProblemCluster, ProblemClusterSort } from "@/lib/rnd/discovery.schemas";
import { OPPORTUNITY_BAND_PIN_SIZE_CLASS, type OpportunityBand } from "@/lib/rnd/map-projection";
import { PIN_RING_CLASS } from "@/components/home/research-and-development/sections/problem-map-pins";
import {
  type MapCamera,
  toMapCameraSearchParams,
  type ViewportBoundsMicrodegrees,
} from "@/lib/rnd/map-viewport";

/** `md`, the breakpoint at which the sheet becomes a docked panel. */
const MEDIUM_VIEWPORT_QUERY = "(min-width: 768px)";
/** `lg`, where there is room for the panel to be 360px instead of 320px and never collapse. */
const LARGE_VIEWPORT_QUERY = "(min-width: 1024px)";

function subscribeToViewportQuery(mediaQuery: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(mediaQuery);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  };
}

/**
 * Which container the panel renders into.
 *
 * ⚠️ **ONE CONTAINER, NOT TWO COPIES HIDDEN BY CSS.** Rendering the panel at both breakpoints and
 * hiding one would put every row, every `Open this cluster →` link and every chip into the
 * accessibility tree twice, and a screen reader does not honour `hidden` the way a sighted reader
 * honours `display: none` — it honours it, but Playwright's strict mode does not, and neither does
 * a duplicated tab order.
 *
 * ⚠️ **THE SERVER SNAPSHOT IS THE PANEL, NOT THE SHEET.** A media query is a browser fact the
 * server cannot know, so — exactly as `getServerMapCanvasModeSnapshot` does for WebGL2 — one answer
 * has to be picked for the server render and the hydration render both. The panel is the right one
 * to pick because its CONTENT is identical either way; only the box around it differs, so a phone
 * adopts the sheet on the render after hydration without anything being re-fetched or re-ordered.
 */
function useIsAtLeastViewport(mediaQuery: string) {
  return useSyncExternalStore(
    subscribeToViewportQuery(mediaQuery),
    () =>
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(mediaQuery).matches
        : true,
    () => true,
  );
}

function useResolvedMapCanvasMode() {
  return useSyncExternalStore(
    subscribeToMapCanvasMode,
    getMapCanvasModeSnapshot,
    getServerMapCanvasModeSnapshot,
  );
}

/**
 * The no-pins array, hoisted so it keeps ONE identity for the life of the module.
 *
 * ⚠️ **A FRESH `[]` HERE IS NOT FREE.** `civic-pulse-vector-map`'s marker effect lists `clusters`
 * as a dependency and both creates and destroys markers in it, so an array that is a new object on
 * every render re-runs that effect on every render — which destroys every marker it just made and
 * schedules the next render while doing it.
 */
const NO_CLUSTERS: ProblemCluster[] = [];

/** Both camera modes, in the order the control stacks them. */
const MAP_VIEW_MODES: readonly MapViewMode[] = ["flat", "tilted"];

/** The legend's four bands, in the order a reader ranks them. */
const LEGEND_BANDS: readonly { readonly band: OpportunityBand; readonly label: string }[] = [
  { band: "high", label: "High" },
  { band: "medium", label: "Medium" },
  { band: "low", label: "Low" },
  { band: "unscored", label: "Not scored yet" },
];

/**
 * Writes the camera into the address bar.
 *
 * ⚠️ **`history.replaceState`, NEVER `router.replace`.** Both leave the history stack alone, which
 * is the property the design brief asked for — one entry per drag would make the back button replay
 * a pan instead of leaving the surface. But `router.replace` to the same route also runs an RSC
 * round-trip, so the server component would re-read the whole cluster list on every gesture while
 * the island was already fetching the same thing on the client.
 *
 * ⚠️ **IT IS NOT CALLED FOR THE MAP'S OWN INITIAL REPORT.** A reader who has not touched the map
 * has not chosen a view, and writing one on arrival would pin a camera into every link they copy
 * before they ever looked at it.
 */
function writeViewToAddressBar(patch: Record<string, string | undefined>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

type ProblemMapShellProps = {
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
  /** Whether the CURRENT filters match anything at all, viewport ignored. */
  readonly hasAnyClusterMatchingFilters: boolean;
  readonly categoryOptions: readonly ProblemMapFilterOption[];
  readonly regionOptions: readonly ProblemMapFilterOption[];
  readonly selectedCategorySlug: string | undefined;
  readonly selectedRegionSlug: string | undefined;
  readonly selectedSort: ProblemClusterSort;
  readonly clustersPageLimit: number;
  readonly initialCamera: MapCamera | null;
  readonly initialSelectedClusterId: string | null;
  readonly canCreateCategory: boolean;
  /** The server's own `searchParams`, the base every filter href is patched onto. */
  readonly serverSearchParams: RawSearchParams;
};

/**
 * The problem map as one instrument: a map that fills the surface, with the list docked into it.
 *
 * ⚠️ **THE PANEL IS NEVER OPTIONAL, AT ANY BREAKPOINT.** It is the keyboard and screen-reader path
 * to the map — every pin has a row and every row reaches the same record — which is why the tablet
 * tab collapses it to 44px rather than removing it and why the mobile sheet has no closed state.
 */
export default function ProblemMapShell({
  initialClusters,
  initialPagination,
  hasAnyCluster,
  hasAnyClusterMatchingFilters,
  categoryOptions,
  regionOptions,
  selectedCategorySlug,
  selectedRegionSlug,
  selectedSort,
  clustersPageLimit,
  initialCamera,
  initialSelectedClusterId,
  canCreateCategory,
  serverSearchParams,
}: ProblemMapShellProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    initialSelectedClusterId,
  );
  const [reportedViewportBounds, setReportedViewportBounds] =
    useState<ViewportBoundsMicrodegrees | null>(null);
  /**
   * The camera the map has actually settled on, which is what filter hrefs are built from.
   *
   * ⚠️ **THIS IS WHAT CLOSES PART 1'S KNOWN GAP.** The chips used to be built by the server from
   * its own `searchParams`, which after one client-side pan described a view the reader had left —
   * so clicking a category threw their position away. Held here, the href always carries where the
   * map is now.
   */
  const [liveCamera, setLiveCamera] = useState<MapCamera | null>(initialCamera);
  /** Tablet only. A glance preference, so `useState` — not the URL, and not the one storage key. */
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  /**
   * Flat or tilted, and `useState` for exactly the reason the panel collapse above is.
   *
   * It is a way of looking at the map rather than a property of what is being looked at, so it is
   * not in the URL — a shared "look at this cluster" link should carry the cluster and the camera,
   * not the sender's taste in perspective — and it is not in storage, because
   * `browser-preferences.ts` owns the one key this app is allowed and this does not earn a field
   * in it. If it should survive a reload it folds into that blob and nowhere else.
   */
  const [viewMode, setViewMode] = useState<MapViewMode>(DEFAULT_MAP_VIEW_MODE);
  const mapCanvasMode = useResolvedMapCanvasMode();
  const isAtLeastMedium = useIsAtLeastViewport(MEDIUM_VIEWPORT_QUERY);
  const isAtLeastLarge = useIsAtLeastViewport(LARGE_VIEWPORT_QUERY);

  /**
   * ⚠️ **THE VIEWPORT IS DROPPED WHENEVER THE VECTOR CANVAS IS NOT WHAT IS ON SCREEN.** The static
   * SVG cannot pan, so a box reported before a tile outage would leave the reader looking at a
   * world map whose list is scoped to a city they can no longer navigate away from.
   */
  const activeViewportBounds = mapCanvasMode === "vector" ? reportedViewportBounds : null;

  const clustersQuery = useProblemClustersQuery({
    category: selectedCategorySlug,
    region: selectedRegionSlug,
    sort: selectedSort,
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

  const renderedClusters = listState.status === "ready" ? listState.clusters : NO_CLUSTERS;

  function toggleSelectedCluster(clusterId: string) {
    setSelectedClusterId((previousSelectedClusterId) => {
      const nextSelectedClusterId = previousSelectedClusterId === clusterId ? null : clusterId;
      writeViewToAddressBar({ cluster: nextSelectedClusterId ?? undefined });
      return nextSelectedClusterId;
    });
  }

  function handleViewportChange(viewport: MapViewportReport) {
    setReportedViewportBounds(viewport.bounds);
    setLiveCamera(viewport.camera);
    if (!viewport.isInitial) writeViewToAddressBar(toMapCameraSearchParams(viewport.camera));
  }

  /**
   * A filter href, built from where the map is NOW rather than from where the request came in.
   *
   * The camera is merged into the base rather than into the patch, so a patch may still override
   * it — and `buildFilterHref` drops any key whose value is `undefined`, which is what writes a
   * default back out of the URL.
   */
  function buildFilterHrefFromLiveView(patch: RawSearchParams): string {
    const base: RawSearchParams =
      liveCamera === null
        ? serverSearchParams
        : { ...serverSearchParams, ...toMapCameraSearchParams(liveCamera) };
    return buildFilterHref(base, patch);
  }

  // The panel's contents are identical either way; only the box differs. It is told which box it is
  // in for the one thing that genuinely changes — the report trigger goes full width in the sheet.
  const isSheetContainer = !isAtLeastMedium;

  const panel = (
    <ProblemMapPanel
      listState={listState}
      selectedClusterId={selectedClusterId}
      onSelectCluster={toggleSelectedCluster}
      categoryOptions={categoryOptions}
      regionOptions={regionOptions}
      selectedCategorySlug={selectedCategorySlug}
      selectedRegionSlug={selectedRegionSlug}
      selectedSort={selectedSort}
      hasViewport={activeViewportBounds !== null}
      canCreateCategory={canCreateCategory}
      isSheet={isSheetContainer}
      buildFilterHrefFromLiveView={buildFilterHrefFromLiveView}
    />
  );

  /**
   * ⚠️ **`listOnly` DRAWS NO MAP AT ALL, SO IT GETS NO MAP REGION.** `prefers-reduced-data` is a
   * request not to fetch a 2000x857 SVG or a tile pyramid, and wrapping the panel in an empty
   * full-height box would spend the viewport on nothing.
   */
  if (mapCanvasMode === "listOnly") {
    return <div className="h-full">{panel}</div>;
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* ⚠️ **THE CANVAS IS FULL-BLEED AND THE PANEL FLOATS OVER IT, SO ITS BOX NEVER CHANGES
          WHEN A DETENT OR THE COLLAPSE TAB MOVES.** An earlier cut passed a resize token down for
          that case; there is no such case. What genuinely resizes it is the window and the shell
          around it, and `civic-pulse-vector-map` observes its own container for both. */}
      <ProblemMapCanvas
        mode={mapCanvasMode}
        clusters={renderedClusters}
        selectedClusterId={selectedClusterId}
        onSelectCluster={toggleSelectedCluster}
        initialCamera={initialCamera}
        onViewportChange={handleViewportChange}
        viewMode={viewMode}
      />

      {/* ⚠️ **VECTOR ONLY.** The static SVG is one fixed overhead projection with no camera, so a
          tilt control there would be a button that does nothing. Hidden rather than disabled: a
          dead control is worse than an absent one (`docs/Design.md` §6). */}
      {mapCanvasMode === "vector" && (
        <MapViewModeControl viewMode={viewMode} onViewModeChange={setViewMode} />
      )}

      {/* The legend: one line, not a box. Each glyph is at its real pin diameter, so the size
          channel is legible rather than asserted, and the WORD carries the meaning — the band is
          never signalled by colour alone (`docs/Design.md` §6). */}
      {/* ⚠️ **OFFSET PAST THE PANEL, NOT AT `left-0`.** The brief draws the legend bottom-left, which
          is where the docked panel also is — measured, the two overlapped and the four labels sat
          behind it. The offsets clear the panel at each of its two widths (320px at `md`, 360px at
          `lg`, both inset 16px). When the tablet panel is collapsed to its tab the legend simply
          starts further right than it needs to, which costs nothing. */}
      <p className="pointer-events-none absolute bottom-3 left-4 z-10 hidden items-center gap-3 text-xs text-muted-foreground md:left-88 md:flex lg:left-98">
        {LEGEND_BANDS.map((legendBand) => (
          <span key={legendBand.band} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block rounded-full bg-white ring-2 ${OPPORTUNITY_BAND_PIN_SIZE_CLASS[legendBand.band]} ${PIN_RING_CLASS[legendBand.band]}`}
            />
            {legendBand.label}
          </span>
        ))}
      </p>

      {isAtLeastMedium ? (
        <DockedPanel
          isCollapsed={isPanelCollapsed && !isAtLeastLarge}
          canCollapse={!isAtLeastLarge}
          onToggleCollapsed={() => setIsPanelCollapsed((previous) => !previous)}
        >
          {panel}
        </DockedPanel>
      ) : (
        <ProblemMapBottomSheet>{panel}</ProblemMapBottomSheet>
      )}
    </div>
  );
}

/**
 * Flat or tilted, in the one corner the surface has left.
 *
 * ⚠️ **IT IS NOT A BASEMAP SWITCHER AND MUST NOT GROW INTO ONE.** Both modes are the same
 * `liberty` style over the same keyless OpenFreeMap tiles; only the camera pitch differs. Satellite
 * is absent deliberately and on licence grounds, not for want of a button — see `todo.md` §19.
 *
 * ⚠️ **`aria-current`, NOT `aria-pressed`, AND THAT IS NOT A STYLE CHOICE.** Two things pushed it
 * here. Semantically, `aria-pressed` marks an INDEPENDENT toggle; picking one of two mutually
 * exclusive views is a selection among a set, which is exactly what `FilterChipRow` already marks
 * with `aria-current` on this same surface. Practically, `button[aria-pressed]` is what a CLUSTER
 * PIN is on this map — `tests/specs/rnd-backend.spec.ts` counts that selector to prove single
 * select — so a pressed button in the chrome silently became a third pin as far as the assertion
 * was concerned. Measured: it broke "selecting a pin marks it pressed and reveals the cluster
 * link" the moment it shipped.
 */
function MapViewModeControl({
  viewMode,
  onViewModeChange,
}: {
  readonly viewMode: MapViewMode;
  readonly onViewModeChange: (viewMode: MapViewMode) => void;
}) {
  return (
    <fieldset
      /**
       * ⚠️ **TOP-RIGHT AT EVERY BREAKPOINT, AND THE OTHER THREE CORNERS WERE ALL TRIED FIRST.**
       * The panel owns top-left; the legend owns bottom-left and MEASURED 48px tall at `md`, where
       * it wraps and runs rightward under anything sharing that edge; the ODbL attribution owns the
       * bottom-right inline. Under `md` the sheet covers everything below its peek detent and MOVES
       * between three of them, so no fixed bottom offset clears it.
       *
       * Directly under MapLibre's own zoom buttons (68px tall) is the one place free at all three
       * breakpoints, and it is where a map's view controls conventionally live anyway.
       *
       * ⚠️ **A ROW, NOT A STACK.** Stacked it was 58px and overlapped the sheet's tallest detent by
       * 3px; a row is ~30px and clears everything with room.
       */
      className="absolute top-20 right-3 z-10 flex flex-row overflow-hidden rounded-lg border border-outline-variant/60 bg-card shadow-lg"
      aria-label="Map view"
    >
      {/* A `fieldset`, not a `div role="group"`: the lint rule prefers the semantic element, and a
          fieldset is what a set of mutually exclusive controls already is. `legend` is omitted in
          favour of the label above, because a visible legend inside a 60px control is noise. */}
      {MAP_VIEW_MODES.map((mode) => {
        const isSelected = mode === viewMode;
        return (
          <button
            key={mode}
            type="button"
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onViewModeChange(mode)}
            className={`cursor-pointer px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isSelected
                ? "bg-primary-imprint text-primary-imprint-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            {MAP_VIEW_MODE_LABELS[mode]}
          </button>
        );
      })}
    </fieldset>
  );
}

/**
 * The desktop and tablet container: a panel that floats over the canvas, docked left.
 *
 * ⚠️ **IT FLOATS, SO IT MAY TAKE `shadow-lg`, AND IT IS OPAQUE.** `docs/Design.md` §4 permits a
 * shadow only for an element that leaves the document flow, and this one genuinely does. Blur or
 * translucency over the tiles is the decorative glassmorphism §6 bans by name.
 *
 * ⚠️ **COLLAPSED IS 44px OF TAB, NOT ZERO.** From `lg` there is room for the panel always, so it
 * cannot collapse at all; between `md` and `lg` horizontal room is the constraint and a reader who
 * wants the whole map can have it — but never at the cost of losing the list, which is the map's
 * only keyboard path.
 */
function DockedPanel({
  isCollapsed,
  canCollapse,
  onToggleCollapsed,
  children,
}: {
  readonly isCollapsed: boolean;
  readonly canCollapse: boolean;
  readonly onToggleCollapsed: () => void;
  readonly children: React.ReactNode;
}) {
  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={false}
        aria-controls="problem-map-docked-panel"
        className="absolute top-4 left-4 z-10 flex w-11 cursor-pointer flex-col items-center gap-2 rounded-2xl border border-outline-variant/60 bg-card py-3 text-xs font-medium shadow-lg"
      >
        <span aria-hidden="true">›</span>
        <span style={{ writingMode: "vertical-rl" }}>Clusters</span>
      </button>
    );
  }

  return (
    <div
      id="problem-map-docked-panel"
      className="absolute top-4 bottom-4 left-4 z-10 flex w-80 flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-card shadow-lg lg:w-90"
    >
      {canCollapse && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={true}
          aria-controls="problem-map-docked-panel"
          className="shrink-0 cursor-pointer self-end px-3 pt-2 text-xs font-medium text-muted-foreground"
        >
          Hide
        </button>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
