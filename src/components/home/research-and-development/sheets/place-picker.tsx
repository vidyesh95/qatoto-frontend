// TRANSPORT: props-only — the pin lives in the parent form's state and arrives back as a prop.
// Fetches no Qatoto endpoint; the only network reads are OpenFreeMap's style, fonts and tiles,
// none of which carry a key.
"use client";

import { useEffect, useRef, useState } from "react";

import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import { LABEL_CLASS } from "@/components/ui/field-classes";
import {
  getMapCanvasModeSnapshot,
  getServerMapCanvasModeSnapshot,
  isDarkThemeActive,
  resolveMapStyleUrl,
  subscribeToMapCanvasMode,
} from "@/lib/rnd/civic-pulse-map";
import {
  type ApproximatePin,
  formatPinReadout,
  PIN_ROUNDING_DISCLOSURE,
  toApproximatePin,
  toPinDegrees,
} from "@/lib/rnd/report-pin";
import { useSyncExternalStore } from "react";

/** Whole world, roughly centred — the picker opens here when nothing has been chosen. */
const INITIAL_PICKER_CENTER: [number, number] = [10, 20];
const INITIAL_PICKER_ZOOM = 1.2;
/** Close enough to read a neighbourhood once the reporter's own device has answered. */
const LOCATED_PICKER_ZOOM = 14;

/**
 * What the locate button is doing.
 *
 * A discriminated union rather than `isLocating` + `hasFailed` (CLAUDE.md Pattern 1): "asking the
 * device" and "the device refused" must not be constructible at once, and the button renders from
 * an exhaustive read of this.
 */
type GeolocationState =
  | { readonly kind: "idle" }
  | { readonly kind: "locating" }
  | { readonly kind: "unavailable" };

function useResolvedMapCanvasMode() {
  return useSyncExternalStore(
    subscribeToMapCanvasMode,
    getMapCanvasModeSnapshot,
    getServerMapCanvasModeSnapshot,
  );
}

type PlacePickerProps = {
  readonly pin: ApproximatePin | null;
  readonly onPinChange: (pin: ApproximatePin | null) => void;
};

/**
 * The optional coarse pin on the report sheet (`todo.md` §19.1).
 *
 * ⚠️ **IT IS OPTIONAL, AND `locationText` BESIDE IT STAYS REQUIRED.** A reporter who cannot read a
 * map, or whose browser cannot draw one, files exactly the report they filed before this existed.
 * The pin cannot replace the free text: there is no reverse geocoder, the region is a pure function
 * of the country, and the country only ever comes from geocoding what they typed.
 *
 * ⚠️ **EVERY COORDINATE IS ROUNDED BEFORE IT REACHES STATE.** `toApproximatePin` is called in the
 * map's click handler and inside the geolocation success callback, so the precise reading never
 * lives in a variable that outlives the callback that produced it. That is what keeps
 * `GEOLOCATION_PRIVACY.md`'s dual-storage apparatus unnecessary rather than unbuilt.
 *
 * ⚠️ **NO CONSENT CHECKBOX.** See `PIN_ROUNDING_DISCLOSURE` — the proposed tick-box asserts a
 * 90-day purge nobody can keep and a private-storage claim that is false once nothing precise is
 * stored.
 */
export default function PlacePicker({ pin, onPinChange }: PlacePickerProps) {
  const mapCanvasMode = useResolvedMapCanvasMode();
  const [geolocationState, setGeolocationState] = useState<GeolocationState>({ kind: "idle" });

  const canShowMap = mapCanvasMode === "vector";

  function handleLocateClick() {
    if (typeof navigator === "undefined" || navigator.geolocation === undefined) {
      setGeolocationState({ kind: "unavailable" });
      return;
    }
    setGeolocationState({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // ⚠️ ROUNDED HERE, INSIDE THE CALLBACK. `position.coords` is a device-grade reading and it
        // must not survive this line — not into state, not into a ref, not into a log.
        onPinChange(toApproximatePin(position.coords.latitude, position.coords.longitude));
        setGeolocationState({ kind: "idle" });
      },
      () => {
        // No retry loop and no permissions lecture: the reporter has a map to tap and a text field
        // that was always going to be the label anyway.
        setGeolocationState({ kind: "unavailable" });
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={LABEL_CLASS}>Mark it on the map</span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleLocateClick}
          disabled={geolocationState.kind === "locating"}
          className="cursor-pointer rounded-full border border-[#CAC4D0]/60 px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          {geolocationState.kind === "locating" ? "Locating…" : "Use my location"}
        </button>
        {pin !== null && (
          <button
            type="button"
            onClick={() => onPinChange(null)}
            className="cursor-pointer text-xs font-medium text-muted-foreground underline underline-offset-2"
          >
            Clear
          </button>
        )}
      </div>

      {canShowMap ? (
        <PickerMap pin={pin} onPinChange={onPinChange} />
      ) : (
        // No empty map box and no apology. A report with no pin is a valid report, and the field
        // above already asked the question this would have answered.
        <p className="text-xs text-muted-foreground">
          The map is not available here. The location you typed above is enough.
        </p>
      )}

      {geolocationState.kind === "unavailable" && (
        <p className="text-xs text-muted-foreground">
          We could not get your location. Tap the map instead, or just type where it is.
        </p>
      )}

      {pin !== null && (
        <p className="text-xs text-muted-foreground">
          <code className="font-mono">{formatPinReadout(pin)}</code>
        </p>
      )}

      {/* Said once, whether or not a pin has been dropped — it is what the control DOES, and a
          disclosure that only appears after the fact is a disclosure nobody read in time. */}
      <p className="text-xs text-muted-foreground">{PIN_ROUNDING_DISCLOSURE}</p>
    </div>
  );
}

/**
 * The tappable map.
 *
 * ⚠️ **MAPLIBRE LOADS THROUGH `await import()` INSIDE AN EFFECT AND MUST STAY THAT WAY**, the same
 * rule `civic-pulse-vector-map.tsx` states: it is the second-largest dependency in the repo, and a
 * static import here would put it in the bundle of every reader of every `(home)` route rather than
 * only those who open this sheet.
 *
 * ⚠️ **THE HEIGHT IS EXPLICIT BECAUSE THE SHEET CANNOT GIVE IT ONE.** `RndSheet`'s body is a
 * `min-h-0 flex-1 overflow-y-auto` box, so a map container with no intrinsic height collapses to
 * nothing and renders a blank strip with working controls.
 */
function PickerMap({ pin, onPinChange }: PlacePickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  /** Latest `onPinChange`, so the map is created once and never re-created for a new closure. */
  const onPinChangeRef = useRef(onPinChange);
  /** The pin the map opened with, read once — a later change must not re-create the map. */
  const initialPinRef = useRef(pin);

  useEffect(() => {
    onPinChangeRef.current = onPinChange;
  }, [onPinChange]);

  useEffect(() => {
    const mapContainer = mapContainerRef.current;
    if (mapContainer === null) return () => {};
    let isEffectStillMounted = true;

    async function createMap(container: HTMLDivElement) {
      const [maplibreModule] = await Promise.all([
        import("maplibre-gl"),
        import("maplibre-gl/dist/maplibre-gl.css"),
      ]);
      if (!isEffectStillMounted) return;

      // Turbopack breaks MapLibre's tile worker without this, and the failure is SILENT — the
      // canvas renders a shaded-relief backdrop and never fetches a vector tile. The long version
      // is in `civic-pulse-vector-map.tsx`.
      maplibreModule.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      const openingPin = initialPinRef.current;
      const openingDegrees = openingPin === null ? null : toPinDegrees(openingPin);

      const map = new maplibreModule.Map({
        container,
        style: resolveMapStyleUrl(isDarkThemeActive()),
        center:
          openingDegrees === null
            ? INITIAL_PICKER_CENTER
            : [openingDegrees.longitude, openingDegrees.latitude],
        zoom: openingDegrees === null ? INITIAL_PICKER_ZOOM : LOCATED_PICKER_ZOOM,
        keyboard: true,
        // Inside a scrolling sheet this is not optional: without it a one-finger drag over the map
        // pans it instead of scrolling to the fields below, and the reporter is trapped.
        cooperativeGestures: true,
        attributionControl: { compact: true },
      });
      mapInstanceRef.current = map;
      map.addControl(new maplibreModule.NavigationControl({ showCompass: false }), "top-right");

      map.on("click", (clickEvent) => {
        if (!isEffectStillMounted) return;
        // ⚠️ ROUNDED HERE TOO. The tap is precise to the pixel; what leaves this handler is not.
        onPinChangeRef.current(toApproximatePin(clickEvent.lngLat.lat, clickEvent.lngLat.lng));
      });

      return;
    }

    void createMap(mapContainer);

    return () => {
      isEffectStillMounted = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // --- Keep the marker where the pin is --------------------------------------------------
  // Driven by the PROP rather than by the click handler, so the marker shows the rounded value
  // that will actually be sent rather than the exact point that was tapped. The ~110 m offset
  // between the two is the mechanism, made visible instead of hidden.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map === null) return () => {};
    let isEffectStillMounted = true;

    async function syncMarker(readyMap: MapLibreMap) {
      if (pin === null) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }
      const maplibreModule = await import("maplibre-gl");
      if (!isEffectStillMounted) return;

      const degrees = toPinDegrees(pin);
      if (markerRef.current === null) {
        markerRef.current = new maplibreModule.Marker({ color: "#00696E" })
          .setLngLat([degrees.longitude, degrees.latitude])
          .addTo(readyMap);
      } else {
        markerRef.current.setLngLat([degrees.longitude, degrees.latitude]);
      }
      readyMap.easeTo({ center: [degrees.longitude, degrees.latitude], duration: 300 });
    }

    void syncMarker(map);
    return () => {
      isEffectStillMounted = false;
    };
  }, [pin]);

  return (
    <div
      ref={mapContainerRef}
      className="h-48 w-full overflow-hidden rounded-lg border border-[#CAC4D0]/60"
      role="application"
      aria-label="Map — tap to mark where the problem is"
    />
  );
}
