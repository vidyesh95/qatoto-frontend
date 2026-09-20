// TRANSPORT: props-only — clusters, selection and the rendered list arrive as props from
// `problem-map-canvas`. Fetches no Qatoto endpoint; the only network reads are OpenFreeMap's
// style, fonts and vector tiles, none of which carry a key. It REPORTS its viewport upward and
// the parent does the fetching, so the canvas still owns no transport of its own.
"use client";

import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  PIN_ICON_SRC_BY_ICON_KEY,
  PIN_RING_CLASS,
  PIN_SIZE_CLASS,
} from "@/components/home/research-and-development/sections/problem-map-pins";
import {
  isDarkThemeActive,
  MAP_VIEW_PITCH_DEGREES,
  type MapViewMode,
  resolveMapStyleUrl,
} from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import { toOpportunityBand } from "@/lib/rnd/map-projection";
import {
  type MapCamera,
  toViewportBoundsMicrodegrees,
  type ViewportBoundsMicrodegrees,
} from "@/lib/rnd/map-viewport";

/**
 * The Civic Pulse vector basemap — the same cluster pins the static canvas draws, over real
 * OpenStreetMap geography instead of `public/dummy/world_map.svg`.
 *
 * **WHY THE SWAP IS WORTH A DEPENDENCY.** `map-projection.ts` says of its own two latitude
 * constants that they are "calibrated estimates from the aspect ratio, not exact … if a pin sits
 * visibly off its country the fix is one visual pass". That is a permanent, unfixable-in-principle
 * error bar on every pin: the SVG carries no `viewBox` and declares no projection, so there is
 * nothing to calibrate *against*. A vector basemap has a real projection, so a centroid lands
 * where the centroid is.
 *
 * **MAPLIBRE IS LOADED WITH `await import()` INSIDE AN EFFECT AND MUST STAY THAT WAY.** It is the
 * second-largest dependency in this repo after `three`, and it follows exactly the rule the
 * teardown 3D engine follows (CLAUDE.md, Blueprints §3D viewer): both stacks "load through
 * `await import()` inside an effect and never share a page's chunk graph". A static import here
 * would put a megabyte of GPU map renderer into the `(home)` shell for every reader of every
 * route in it.
 *
 * **EVERY PIN IS A REAL `<button aria-pressed>`, PORTALLED INTO A MARKER CONTAINER.**
 * ⚠️ This is load-bearing and not a style preference. `tests/specs/rnd-backend.spec.ts` asserts
 * on `button[aria-pressed]` for pin rendering, single-select and cross-highlighting. The obvious
 * alternative — a GeoJSON source with a `symbol` layer — draws pins *into the WebGL canvas*, where
 * they have no DOM node, take no keyboard focus, carry no accessible name and match no selector.
 * MapLibre's own `MarkerOptions` documents that markers with a custom `element` keep their
 * "focusability and keyboard behavior application-owned", which is the seam this uses.
 *
 * **THE PIN ART IS THE STATIC CANVAS'S PIN ART.** The icon, size and ring records come from
 * `problem-map-pins.ts`, which both renderers import, so the two cannot drift into showing the
 * same cluster two different ways.
 */

/** What the map is showing, handed upward so the parent can fetch for it. */
export interface MapViewportReport {
  readonly bounds: ViewportBoundsMicrodegrees;
  readonly camera: MapCamera;
  /**
   * True for the one report the map makes on its own as soon as it exists, rather than after a
   * reader moved it. The parent uses it to fetch without writing a camera nobody chose into the
   * address bar.
   */
  readonly isInitial: boolean;
}

type CivicPulseVectorMapProps = {
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly onSelectCluster: (clusterId: string) => void;
  /**
   * Where to open. `null` means nobody named a camera, so the map fits to the clusters instead.
   *
   * ⚠️ **READ ONCE, AT MOUNT.** It is held in a `useRef` initialiser precisely so a later change
   * cannot move a map the reader is currently panning.
   */
  readonly initialCamera: MapCamera | null;
  /** Debounced on `moveend`, plus one `isInitial` report as soon as the map exists. */
  readonly onViewportChange: (viewport: MapViewportReport) => void;
  /**
   * Flat or tilted. NOT a basemap — same style, same tiles, same licence; only the camera moves.
   * The `building-3d` layer `liberty` already ships is what appears once there is pitch to see it
   * from, and only from z14, where the vector data actually carries building geometry.
   */
  readonly viewMode: MapViewMode;
  /**
   * Called when the basemap cannot be shown, so the parent can fall back to the static canvas.
   *
   * ⚠️ **THE FALLBACK IS A WORKING MAP, NOT A MESSAGE.** An earlier draft painted an
   * "unavailable" panel over the dead canvas, which left a reader with the flag on strictly worse
   * off than a reader with it off: the pins were gone. Handing the surface back to the SVG means a
   * tile outage costs geographic precision and nothing else.
   */
  readonly onUnavailable: () => void;
};

/**
 * What the canvas is doing right now.
 *
 * A discriminated union rather than `isLoading` + `hasFailed` (CLAUDE.md Pattern 1): "tiles are
 * still loading" and "the tile host is unreachable" are states that must not be constructible at
 * the same time, and the overlay renders from an exhaustive `switch`.
 */
type VectorMapStatus = { readonly kind: "loading" } | { readonly kind: "ready" };

/**
 * How many tile errors in a row mean the host is down rather than one tile being slow.
 *
 * A single `error` event is ordinary — a tile 404s at the edge of coverage on every map ever
 * made. Three consecutive ones is a provider outage, which is the risk OpenFreeMap's lack of an
 * SLA buys us (`docs/MAP_TILE_FALLBACK.md` §1: an unhardened frontend "renders a completely blank
 * gray canvas").
 */
const CONSECUTIVE_TILE_ERRORS_BEFORE_GIVING_UP = 3;

/** Whole world, roughly centred, before any cluster has been fitted to. */
const INITIAL_MAP_CENTER: [number, number] = [10, 20];
const INITIAL_MAP_ZOOM = 1.3;

/**
 * How long after the last camera movement the viewport is reported.
 *
 * `moveend` already fires once per gesture rather than per frame, but a flick fires it again when
 * the inertia settles and a pinch fires it per discrete zoom. This collapses a burst into the one
 * request that describes where the reader actually stopped.
 */
const VIEWPORT_REPORT_DEBOUNCE_MS = 300;

export default function CivicPulseVectorMap({
  clusters,
  selectedClusterId,
  onSelectCluster,
  initialCamera,
  onViewportChange,
  viewMode,
  onUnavailable,
}: CivicPulseVectorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  /**
   * The camera the URL asked for, frozen at mount.
   *
   * `useRef(value)` keeps its FIRST argument forever, which is exactly the semantics wanted here
   * and is why this is not a prop read inside the effect: the map is created once, and a later
   * prop change must not be able to recentre a map somebody is dragging.
   */
  const initialCameraRef = useRef(initialCamera);
  /**
   * The pitch the map is BORN with, frozen at mount for the same reason `initialCamera` is: the
   * map-creation effect must never re-run, and a prop it reads directly would be a dependency.
   * Later changes are applied by the `easeTo` effect below instead.
   */
  const initialViewModeRef = useRef(viewMode);
  /**
   * ⚠️ **THE `fitBounds` LATCH. WITHOUT IT THIS SURFACE REFETCHES FOREVER.**
   *
   * The marker effect below re-runs on every `clusters` change, and it used to end in a
   * `fitBounds`. Once `moveend` drives the fetch, that closes a loop with no exit: pan → refetch →
   * a new `clusters` array → the effect re-runs → `fitBounds` moves the camera → `moveend` →
   * refetch, and it never settles because `fitBounds` is itself a camera move.
   *
   * So the fit is a once-per-map-instance action rather than a per-render one, and it is skipped
   * outright when the URL already carries a camera — a reader who followed a shared link chose
   * that view, and fitting to the pins would throw it away.
   */
  const hasFittedToClustersRef = useRef(false);
  /**
   * The latest `onViewportChange` and `onUnavailable`, so the map-creation effect can call them
   * without taking either as a dependency.
   *
   * ⚠️ **THE MAP IS CREATED ONCE. A CALLBACK PROP MUST NOT BE ABLE TO CHANGE THAT, AND THIS IS
   * MEASURED RATHER THAN DEFENSIVE.** The effect used to list `onUnavailable`, which the parent
   * passes as an inline arrow. That held for as long as the parent barely re-rendered — but once
   * it owned a React Query subscription it re-rendered on every fetch, handing down a fresh
   * closure each time, and the effect tore the map down and built a new one. `createMap` ends in
   * `setReadyMapToken`, so each rebuild scheduled the render that caused the next: measured as
   * "Maximum update depth exceeded" ×129, a map whose `load` never fired, and every marker
   * destroyed microseconds after it was attached — which took `button[aria-pressed]` off the
   * page, and with it both the accessible path to the pins and the selector the E2E spec asserts.
   *
   * Refs rather than `useCallback` in the parent: a stable identity there would be a promise this
   * component depends on and cannot check, and the next person to add a prop would have no way to
   * know they had broken it.
   */
  const onViewportChangeRef = useRef(onViewportChange);
  const onUnavailableRef = useRef(onUnavailable);
  // `import type` is ERASED AT COMPILE TIME, so naming MapLibre's own types here costs nothing at
  // runtime — the package still arrives only through the `await import()` below. An earlier draft
  // hand-rolled structural types (`{ remove: () => void }`) to avoid an import that was never a
  // problem, and paid for it in `as` casts on every call, which CLAUDE.md Pattern 2 rules out.
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const [status, setStatus] = useState<VectorMapStatus>({ kind: "loading" });
  /** Set once the map exists, which is the signal the marker effect waits on. */
  const [readyMapToken, setReadyMapToken] = useState(0);
  const [markerContainersByClusterId, setMarkerContainersByClusterId] = useState<
    ReadonlyMap<string, HTMLDivElement>
  >(() => new Map());

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
    onUnavailableRef.current = onUnavailable;
  }, [onViewportChange, onUnavailable]);

  // --- Create the map exactly once -------------------------------------------------------
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    let isEffectStillMounted = true;
    let consecutiveTileErrorCount = 0;
    let viewportReportTimer: ReturnType<typeof setTimeout> | undefined;

    async function createMap(container: HTMLDivElement) {
      // Both the module and its stylesheet are fetched here, so neither reaches a reader who
      // never opens this surface.
      const [maplibreModule] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl.css"),
      ]);
      if (!isEffectStillMounted) return;

      // ⚠️ TURBOPACK BREAKS MAPLIBRE'S TILE WORKER, AND WITHOUT THIS LINE THE MAP IS A BACKDROP
      // WITH NO MAP ON IT. MapLibre parses every vector tile in a Web Worker whose URL it derives
      // from its own `import.meta.url`, bailing to an empty string when that is not http(s):
      //
      //     let e = import.meta.url;
      //     if (!/^https?:/.test(e)) return ``;
      //
      // Under Turbopack that value is `file:///ROOT/src/...`, so MapLibre calls
      // `new Worker("", { type: "module" })`, the worker dies on construction, and NOTHING
      // SURFACES — no throw, no error event, no console message. The style, sprites and Natural
      // Earth raster still load on the main thread, so the canvas renders a convincing
      // shaded-relief backdrop while every `.pbf` is silently never fetched. Measured before the
      // fix: 0 `.pbf` requests, `load` never fired.
      //
      // ⚠️ **AND IT MUST POINT AT `public/`, NOT AT TURBOPACK'S OWN EMITTED COPY.** Turbopack emits
      // the worker as a raw asset WITHOUT rewriting the imports inside it, so its
      // `/_next/static/media/maplibre-gl-worker.<hash>.mjs` still says
      // `import … from "./maplibre-gl-shared.mjs"` while the sibling is emitted under a different
      // content hash — measured 404 on the unhashed path, 200 on the hashed one. Both files have
      // to sit together under their ORIGINAL names, which `scripts/sync-maplibre-worker.mjs`
      // guarantees by re-copying them on every `dev` and every `build`.
      maplibreModule.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const requestedCamera = initialCameraRef.current;

      const map = new maplibreModule.Map({
        container,
        style: resolveMapStyleUrl(isDarkThemeActive()),
        // A shared link opens where it was shared from. Set at construction rather than by a
        // `jumpTo` afterwards, so the first painted frame is already the right one and there is no
        // visible slide from the world view to the requested one.
        center:
          requestedCamera === null
            ? INITIAL_MAP_CENTER
            : [requestedCamera.longitudeDegrees, requestedCamera.latitudeDegrees],
        zoom: requestedCamera === null ? INITIAL_MAP_ZOOM : requestedCamera.zoom,
        // Set at construction rather than eased afterwards, so a reader who arrives in 3D does not
        // watch the map tilt itself on first paint.
        pitch: MAP_VIEW_PITCH_DEGREES[initialViewModeRef.current],
        // Keyboard pan/zoom on the canvas itself, so the map is operable without a pointer.
        keyboard: true,
        // Without this, a two-finger scroll over a full-width map eats the page scroll on
        // touch and a trackpad scroll zooms instead of scrolling past. MapLibre renders its
        // own "use ctrl + scroll to zoom" hint.
        cooperativeGestures: true,
        // The ODbL credit is not optional and is not ours to compose: it arrives on the planet
        // TileJSON and MapLibre renders it from there.
        attributionControl: { compact: true },
      });

      mapInstanceRef.current = map;
      map.addControl(new maplibreModule.NavigationControl({ showCompass: false }), "top-right");

      // ⚠️ **MARKERS ATTACH AS SOON AS THE MAP OBJECT EXISTS, NOT ON `load`.** A `Marker` needs
      // only the map's transform to place itself, so gating the pins on `load` made every pin
      // depend on a third-party tile host finishing its work. That is how the worker bug above
      // presented: `load` never fired, and the surface rendered a map with NO PINS AT ALL — worse
      // than the SVG it replaced. The pins are our data and must not wait on anyone else's.
      setReadyMapToken((previousToken) => previousToken + 1);

      function reportViewport(isInitial: boolean) {
        if (!isEffectStillMounted) return;
        const bounds = map.getBounds();
        const center = map.getCenter();
        onViewportChangeRef.current({
          bounds: toViewportBoundsMicrodegrees({
            westDegrees: bounds.getWest(),
            southDegrees: bounds.getSouth(),
            eastDegrees: bounds.getEast(),
            northDegrees: bounds.getNorth(),
          }),
          camera: {
            latitudeDegrees: center.lat,
            longitudeDegrees: center.lng,
            zoom: map.getZoom(),
          },
          isInitial,
        });
      }

      // ⚠️ **REPORT ONCE IMMEDIATELY, FOR THE SAME REASON THE MARKERS ATTACH IMMEDIATELY.** A map
      // that is never touched fires no `moveend`, so without this the first viewport-scoped read
      // would wait for a reader to drag something and the panel would keep showing the unbounded
      // server page in the meantime. A `Marker` needs only the map's transform to place itself and
      // so does `getBounds()`, so neither has any business waiting on a third-party tile host.
      reportViewport(true);

      map.on("moveend", () => {
        if (!isEffectStillMounted) return;
        clearTimeout(viewportReportTimer);
        viewportReportTimer = setTimeout(() => reportViewport(false), VIEWPORT_REPORT_DEBOUNCE_MS);
      });

      // `load` now only clears the "Loading map…" caption. Nothing depends on it.
      map.on("load", () => {
        if (!isEffectStillMounted) return;
        setStatus({ kind: "ready" });
      });

      map.on("error", () => {
        if (!isEffectStillMounted) return;
        consecutiveTileErrorCount += 1;
        if (consecutiveTileErrorCount >= CONSECUTIVE_TILE_ERRORS_BEFORE_GIVING_UP) {
          onUnavailableRef.current();
        }
      });

      // ⚠️ **RESET ONLY ON A TILE THAT ACTUALLY ARRIVED** (`event.tile` is set), never on any
      // `sourcedata`. The first draft reset the streak on every `sourcedata` event, which fires
      // repeatedly while a source loads its metadata — so a source that could never serve a single
      // tile kept clearing its own error count and the failure was unreachable by construction.
      // The streak exists to tell one 404 at the edge of coverage apart from a dead host, and only
      // a delivered tile proves the host is alive.
      map.on("data", (dataEvent) => {
        if (dataEvent.dataType === "source" && "tile" in dataEvent && dataEvent.tile) {
          consecutiveTileErrorCount = 0;
        }
      });
    }

    if (mapContainer) {
      void createMap(mapContainer).catch(() => {
        if (!isEffectStillMounted) return;
        onUnavailableRef.current();
      });
    }

    return () => {
      isEffectStillMounted = false;
      clearTimeout(viewportReportTimer);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // Empty on purpose — see the ref block above. Every value this effect needs is either read
    // once at mount or reached through a ref, so there is nothing here that could legitimately
    // ask for a second map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Follow the theme ------------------------------------------------------------------
  // The map is created with whatever theme was active at mount; this keeps it in step if `.dark`
  // lands on `<html>` later. Nothing writes that class today (see `civic-pulse-map.ts`), so this
  // observer is dormant by design rather than dead — it is what makes the map follow appearance
  // for free on the day appearance returns.
  useEffect(() => {
    const themeObserver = new MutationObserver(() => {
      mapInstanceRef.current?.setStyle(resolveMapStyleUrl(isDarkThemeActive()));
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => themeObserver.disconnect();
  }, []);

  // --- Follow the view mode --------------------------------------------------------------
  //
  // ⚠️ **THIS FIRES `moveend`, AND `moveend` DRIVES THE CLUSTER FETCH.** That is correct rather
  // than incidental: a tilted camera genuinely sees further toward the horizon, so `getBounds()`
  // widens and the viewport-scoped read should widen with it. What it must NOT do is feed itself —
  // the `fitBounds` latch exists because a camera move that re-triggers a camera move never
  // settles. This one is safe because it eases only when `viewMode` actually changed, and nothing
  // downstream of the fetch can change `viewMode`.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map === null) return;
    const targetPitch = MAP_VIEW_PITCH_DEGREES[viewMode];
    // Already there on the first run, because the map was constructed with this pitch. Skipping
    // spares one pointless `moveend` and therefore one pointless read on every mount.
    if (map.getPitch() === targetPitch) return;
    map.easeTo({ pitch: targetPitch, duration: 400 });
  }, [viewMode, readyMapToken]);

  // --- Follow the container -------------------------------------------------------------
  // ⚠️ **THE MAP'S BOX NOW CHANGES WITHOUT THE WINDOW CHANGING.** Collapsing the tablet panel or
  // dragging the mobile sheet to another detent resizes this element while the viewport stays
  // exactly the same size, and a MapLibre canvas that is not told about that keeps its old
  // transform: the picture stretches and every marker lands off its coordinate. A window `resize`
  // listener cannot see any of it, which is why this observes the container instead.
  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    // Returns a no-op teardown rather than bailing with a bare `return`, so every path out of this
    // effect hands React the same kind of value.
    if (mapContainer === null || typeof ResizeObserver === "undefined") return () => {};

    const containerObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    containerObserver.observe(mapContainer);
    return () => containerObserver.disconnect();
  }, []);

  // --- One marker per cluster ------------------------------------------------------------
  useEffect(() => {
    const map = mapInstanceRef.current;
    let isEffectStillMounted = true;
    const createdMarkers: MapLibreMarker[] = [];

    async function attachMarkers(readyMap: MapLibreMap) {
      const maplibreModule = await import("maplibre-gl");
      if (!isEffectStillMounted) return;

      const containersByClusterId = new Map<string, HTMLDivElement>();

      let westernmostLongitude = Number.POSITIVE_INFINITY;
      let easternmostLongitude = Number.NEGATIVE_INFINITY;
      let southernmostLatitude = Number.POSITIVE_INFINITY;
      let northernmostLatitude = Number.NEGATIVE_INFINITY;

      for (const cluster of clusters) {
        const longitudeDegrees = cluster.centroidLongitudeMicrodegrees / 1_000_000;
        const latitudeDegrees = cluster.centroidLatitudeMicrodegrees / 1_000_000;

        const markerContainer = document.createElement("div");
        const marker = new maplibreModule.Marker({ element: markerContainer })
          .setLngLat([longitudeDegrees, latitudeDegrees])
          .addTo(readyMap);

        containersByClusterId.set(cluster.id, markerContainer);
        createdMarkers.push(marker);

        westernmostLongitude = Math.min(westernmostLongitude, longitudeDegrees);
        easternmostLongitude = Math.max(easternmostLongitude, longitudeDegrees);
        southernmostLatitude = Math.min(southernmostLatitude, latitudeDegrees);
        northernmostLatitude = Math.max(northernmostLatitude, latitudeDegrees);
      }

      setMarkerContainersByClusterId(containersByClusterId);

      // Open on the clusters that exist rather than on the whole globe. Skipped for a single
      // cluster, where a bounding box has zero area and `fitBounds` would slam to max zoom.
      //
      // ⚠️ **AND SKIPPED ON EVERY RUN AFTER THE FIRST, AND WHENEVER THE URL NAMED A CAMERA.** This
      // effect re-runs on every `clusters` change, and `clusters` now changes because the reader
      // panned. See `hasFittedToClustersRef` — an unlatched fit here is an endless refetch loop,
      // not a cosmetic issue.
      const shouldFitToClusters =
        clusters.length > 1 && !hasFittedToClustersRef.current && initialCameraRef.current === null;

      if (shouldFitToClusters) {
        hasFittedToClustersRef.current = true;
        readyMap.fitBounds(
          [
            [westernmostLongitude, southernmostLatitude],
            [easternmostLongitude, northernmostLatitude],
          ],
          { padding: 64, maxZoom: 6, duration: 0 },
        );
      }
    }

    if (map && readyMapToken > 0) void attachMarkers(map);

    return () => {
      isEffectStillMounted = false;
      for (const marker of createdMarkers) marker.remove();
      setMarkerContainersByClusterId(new Map());
    };
  }, [clusters, readyMapToken]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#00696E]/5">
      {/* Fills the region the shell gives it. It used to carry `aspect-2000/857` so that flipping
          the flag did not move the content below it — there is no content below it any more, the
          map IS the page, and a fixed aspect inside a full-height box would letterbox the one
          renderer that does not need to. */}
      <div
        ref={mapContainerRef}
        className="h-full w-full"
        role="application"
        aria-label="Map of reported problem clusters"
      />
      <VectorMapStatusOverlay status={status} />

      {[...markerContainersByClusterId].map(([clusterId, markerContainer]) => {
        const cluster = clusters.find((candidate) => candidate.id === clusterId);
        if (!cluster) return null;

        const isSelected = cluster.id === selectedClusterId;
        const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);

        return createPortal(
          <button
            type="button"
            onClick={() => onSelectCluster(cluster.id)}
            aria-label={`${cluster.title} — ${cluster.locationLabel ?? "location not resolved"}`}
            aria-pressed={isSelected}
            className={`cursor-pointer overflow-hidden rounded-full bg-white ring-2 ${PIN_SIZE_CLASS[opportunityBand]} ${PIN_RING_CLASS[opportunityBand]} ${
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
          </button>,
          markerContainer,
          clusterId,
        );
      })}
    </div>
  );
}

/**
 * The only thing ever drawn over the canvas: a caption while the tiles arrive.
 *
 * `ready` renders NOTHING — an overlay that says "loaded" over a loaded map is the placeholder
 * PRODUCT.md Principle 2 rules out. There is no failure branch here on purpose: a basemap that
 * cannot load hands the whole surface back to the static canvas (`onUnavailable`), because a
 * reader is better served by an approximate map with pins than by an exact message with none.
 */
function VectorMapStatusOverlay({ status }: { status: VectorMapStatus }) {
  switch (status.kind) {
    case "loading":
      return (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="text-xs text-muted-foreground">Loading map…</span>
        </div>
      );
    case "ready":
      return null;
    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}
