"use client";

import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapOptions,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import { type RefObject, useEffect, useRef, useState } from "react";
import { loadMapLibreModule, loadMapLibreWithCss } from "@/lib/maplibre-loader";
import {
  buildCatchmentRingPolygon,
  type CatchmentRingPolygon,
  isDarkThemeActive,
  MAP_VIEW_PITCH_DEGREES,
  type MapViewMode,
  resolveCssColorToRgb,
  resolveMapStyleUrl,
} from "@/lib/rnd/civic-pulse-map";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import {
  computeUncoveredFitPaddingPx,
  computeUnobscuredCentreOffsetPx,
  type MapCamera,
  toViewportBoundsMicrodegrees,
  type ViewportBoundsMicrodegrees,
} from "@/lib/rnd/map-viewport";

export interface MapViewportReport {
  readonly bounds: ViewportBoundsMicrodegrees;
  readonly camera: MapCamera;
  readonly isInitial: boolean;
}

export type VectorMapStatus = { readonly kind: "loading" } | { readonly kind: "ready" };

const CONSECUTIVE_TILE_ERRORS_BEFORE_GIVING_UP = 3;
const INITIAL_MAP_CENTER: [number, number] = [10, 20];
const INITIAL_MAP_ZOOM = 1.3;
const OPENING_FIT_MAX_ZOOM = 6;
const OPENING_FIT_MARGIN_PX = 64;
const VIEWPORT_REPORT_DEBOUNCE_MS = 300;

const CATCHMENT_SOURCE_ID = "selected-cluster-catchment";
const CATCHMENT_FILL_LAYER_ID = "selected-cluster-catchment-fill";
const CATCHMENT_LINE_LAYER_ID = "selected-cluster-catchment-line";

function applyCatchmentRing(map: MapLibreMap, catchmentRing: CatchmentRingPolygon | null): void {
  void map.getSource<GeoJSONSource>(CATCHMENT_SOURCE_ID)?.setData({
    type: "FeatureCollection",
    features:
      catchmentRing === null ? [] : [{ type: "Feature", properties: {}, geometry: catchmentRing }],
  });
}

function addCatchmentRingLayers(
  map: MapLibreMap,
  catchmentRing: CatchmentRingPolygon | null,
): void {
  const ringColor = resolveCssColorToRgb("--primary-imprint");
  if (map.getSource(CATCHMENT_SOURCE_ID) === undefined) {
    map.addSource(CATCHMENT_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (map.getLayer(CATCHMENT_FILL_LAYER_ID) === undefined) {
    map.addLayer({
      id: CATCHMENT_FILL_LAYER_ID,
      type: "fill",
      source: CATCHMENT_SOURCE_ID,
      paint: { "fill-color": ringColor, "fill-opacity": 0.08 },
    });
  }
  if (map.getLayer(CATCHMENT_LINE_LAYER_ID) === undefined) {
    map.addLayer({
      id: CATCHMENT_LINE_LAYER_ID,
      type: "line",
      source: CATCHMENT_SOURCE_ID,
      paint: { "line-color": ringColor, "line-width": 1.5, "line-dasharray": [2, 2] },
    });
  }
  applyCatchmentRing(map, catchmentRing);
}

function toClusterBoundsDegrees(
  clusters: readonly ProblemCluster[],
): [[number, number], [number, number]] {
  const longitudesDegrees = clusters.map(
    (cluster) => cluster.centroidLongitudeMicrodegrees / 1_000_000,
  );
  const latitudesDegrees = clusters.map(
    (cluster) => cluster.centroidLatitudeMicrodegrees / 1_000_000,
  );
  return [
    [Math.min(...longitudesDegrees), Math.min(...latitudesDegrees)],
    [Math.max(...longitudesDegrees), Math.max(...latitudesDegrees)],
  ];
}

export function useCivicPulseMaplibreController({
  clusters,
  selectedClusterId,
  initialCamera,
  onViewportChange,
  viewMode,
  onUnavailable,
  mapOverlayRef,
  matchRadiusMeters,
}: {
  readonly clusters: ProblemCluster[];
  readonly selectedClusterId: string | null;
  readonly initialCamera: MapCamera | null;
  readonly onViewportChange: (viewport: MapViewportReport) => void;
  readonly viewMode: MapViewMode;
  readonly onUnavailable: () => void;
  readonly mapOverlayRef: RefObject<HTMLElement | null>;
  readonly matchRadiusMeters: number | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const initialCameraRef = useRef(initialCamera);
  const initialViewModeRef = useRef(viewMode);
  const initialClustersRef = useRef(clusters);
  const onViewportChangeRef = useRef(onViewportChange);
  const onUnavailableRef = useRef(onUnavailable);
  const latestClustersRef = useRef(clusters);
  const lastEasedSelectionIdRef = useRef(selectedClusterId);
  const selectedCatchmentRef = useRef<CatchmentRingPolygon | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);

  const [status, setStatus] = useState<VectorMapStatus>({ kind: "loading" });
  const [readyMapToken, setReadyMapToken] = useState(0);
  const [markerContainersByClusterId, setMarkerContainersByClusterId] = useState<
    ReadonlyMap<string, HTMLDivElement>
  >(() => new Map());

  useEffect(() => {
    onViewportChangeRef.current = onViewportChange;
    onUnavailableRef.current = onUnavailable;
    latestClustersRef.current = clusters;
  }, [onViewportChange, onUnavailable, clusters]);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    let isEffectStillMounted = true;
    let consecutiveTileErrorCount = 0;
    let viewportReportTimer: ReturnType<typeof setTimeout> | undefined;

    async function createMap(container: HTMLDivElement) {
      const [maplibreModule] = await loadMapLibreWithCss();
      if (!isEffectStillMounted) return;

      maplibreModule.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const requestedCamera = initialCameraRef.current;
      const openingClusters = initialClustersRef.current;

      const openingCamera: Pick<MapOptions, "center" | "zoom" | "bounds" | "fitBoundsOptions"> =
        requestedCamera !== null
          ? {
              center: [requestedCamera.longitudeDegrees, requestedCamera.latitudeDegrees],
              zoom: requestedCamera.zoom,
            }
          : openingClusters.length > 0
            ? {
                bounds: toClusterBoundsDegrees(openingClusters),
                fitBoundsOptions: {
                  padding: computeUncoveredFitPaddingPx(
                    container.getBoundingClientRect(),
                    mapOverlayRef.current === null
                      ? null
                      : mapOverlayRef.current.getBoundingClientRect(),
                    OPENING_FIT_MARGIN_PX,
                  ),
                  maxZoom: OPENING_FIT_MAX_ZOOM,
                },
              }
            : { center: INITIAL_MAP_CENTER, zoom: INITIAL_MAP_ZOOM };

      const map = new maplibreModule.Map({
        container,
        style: resolveMapStyleUrl(isDarkThemeActive()),
        ...openingCamera,
        pitch: MAP_VIEW_PITCH_DEGREES[initialViewModeRef.current],
        keyboard: true,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });

      mapInstanceRef.current = map;
      map.addControl(new maplibreModule.NavigationControl({ showCompass: false }), "top-right");

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

      reportViewport(true);

      map.on("moveend", () => {
        if (!isEffectStillMounted) return;
        clearTimeout(viewportReportTimer);
        viewportReportTimer = setTimeout(() => reportViewport(false), VIEWPORT_REPORT_DEBOUNCE_MS);
      });

      map.on("style.load", () => {
        if (!isEffectStillMounted) return;
        addCatchmentRingLayers(map, selectedCatchmentRef.current);
      });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map === null) return;
    const targetPitch = MAP_VIEW_PITCH_DEGREES[viewMode];
    if (map.getPitch() === targetPitch) return;
    map.easeTo({ pitch: targetPitch, duration: 400 });
  }, [viewMode, readyMapToken]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map === null) return;
    if (selectedClusterId === lastEasedSelectionIdRef.current) return;
    lastEasedSelectionIdRef.current = selectedClusterId;
    if (selectedClusterId === null) return;

    const selectedCluster = latestClustersRef.current.find(
      (cluster) => cluster.id === selectedClusterId,
    );
    if (!selectedCluster) return;

    const overlayElement = mapOverlayRef.current;
    const unobscuredCentreOffsetPx = computeUnobscuredCentreOffsetPx(
      map.getContainer().getBoundingClientRect(),
      overlayElement === null ? null : overlayElement.getBoundingClientRect(),
    );
    map.easeTo({
      center: [
        selectedCluster.centroidLongitudeMicrodegrees / 1_000_000,
        selectedCluster.centroidLatitudeMicrodegrees / 1_000_000,
      ],
      offset: unobscuredCentreOffsetPx,
      duration: 600,
    });
  }, [selectedClusterId, readyMapToken, mapOverlayRef]);

  useEffect(() => {
    const selectedCluster =
      selectedClusterId === null || matchRadiusMeters === null
        ? undefined
        : latestClustersRef.current.find((cluster) => cluster.id === selectedClusterId);
    const catchmentRing =
      selectedCluster === undefined || matchRadiusMeters === null
        ? null
        : buildCatchmentRingPolygon(
            selectedCluster.centroidLongitudeMicrodegrees / 1_000_000,
            selectedCluster.centroidLatitudeMicrodegrees / 1_000_000,
            matchRadiusMeters,
          );
    selectedCatchmentRef.current = catchmentRing;
    const map = mapInstanceRef.current;
    if (map !== null) applyCatchmentRing(map, catchmentRing);
  }, [selectedClusterId, matchRadiusMeters, readyMapToken]);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (mapContainer === null || typeof ResizeObserver === "undefined") return () => {};

    const containerObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    containerObserver.observe(mapContainer);
    return () => containerObserver.disconnect();
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    let isEffectStillMounted = true;
    const createdMarkers: MapLibreMarker[] = [];

    async function attachMarkers(readyMap: MapLibreMap) {
      const maplibreModule = await loadMapLibreModule();
      if (!isEffectStillMounted) return;

      const containersByClusterId = new Map<string, HTMLDivElement>();

      for (const cluster of clusters) {
        const longitudeDegrees = cluster.centroidLongitudeMicrodegrees / 1_000_000;
        const latitudeDegrees = cluster.centroidLatitudeMicrodegrees / 1_000_000;

        const markerContainer = document.createElement("div");
        const marker = new maplibreModule.Marker({ element: markerContainer })
          .setLngLat([longitudeDegrees, latitudeDegrees])
          .addTo(readyMap);

        containersByClusterId.set(cluster.id, markerContainer);
        createdMarkers.push(marker);
      }

      setMarkerContainersByClusterId(containersByClusterId);
    }

    if (map && readyMapToken > 0) void attachMarkers(map);

    return () => {
      isEffectStillMounted = false;
      for (const marker of createdMarkers) marker.remove();
      setMarkerContainersByClusterId(new Map());
    };
  }, [clusters, readyMapToken]);

  return {
    mapContainerRef,
    status,
    markerContainersByClusterId,
  };
}
