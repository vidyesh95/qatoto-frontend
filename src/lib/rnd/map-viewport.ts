// TRANSPORT: props-only — pure geometry and query-string mapping. No network, no browser API.
//
// The viewport half of `todo.md` §19.4. `ListProblemClustersFilter` has declared four bounding-box
// microdegree fields since the endpoint shipped and no caller ever passed them, so the panel list
// was the top of a global ranking rather than what the map was showing. These are the conversions
// that let a caller pass them.

import type { RawSearchParams } from "@/lib/filter-href";

/**
 * The backend's own bounds, mirrored so a value this module builds cannot be refused for being
 * out of range (`problem-clusters.schemas.ts` — `MAXIMUM_LATITUDE_MICRODEGREES`,
 * `MAXIMUM_LONGITUDE_MICRODEGREES`).
 */
const MAXIMUM_LATITUDE_MICRODEGREES = 90_000_000;
const MAXIMUM_LONGITUDE_MICRODEGREES = 180_000_000;

/**
 * The grid a bounding box is rounded onto BEFORE it becomes part of a React Query cache key.
 *
 * ⚠️ **THIS IS A CACHE CONCERN, NOT A PRIVACY ONE**, and it is a different number from the one it
 * matches. The backend quantizes a published centroid onto a 1,000-microdegree grid because a
 * singleton cluster's centroid is one reporter's address (`problem-clusters.service.ts`'s
 * `quantizePublishedMicrodegrees`). Here the same figure does something unrelated: a drag fires a
 * `moveend` per gesture and an unrounded box would mint a distinct cache entry for every one of
 * them, so pixel-level jitter that cannot change which pins match must not change the key.
 *
 * A camera position is the reader's own view of a public map and is not anybody's location, so
 * nothing here is a privacy control. The reporter's pin — which IS — is §19.1 and rounds in the
 * browser before it is sent.
 */
const CACHE_KEY_GRID_MICRODEGREES = 1_000;

/** The URL keys that carry the camera. Written out of the URL when absent, never as defaults. */
export const MAP_LATITUDE_QUERY_KEY = "lat";
export const MAP_LONGITUDE_QUERY_KEY = "lng";
export const MAP_ZOOM_QUERY_KEY = "z";

/** Where the camera is pointing. Degrees, because that is what MapLibre's API speaks. */
export interface MapCamera {
  readonly latitudeDegrees: number;
  readonly longitudeDegrees: number;
  readonly zoom: number;
}

/**
 * What is on screen, in the integer microdegrees the endpoint takes.
 *
 * ⚠️ **ALL FOUR OR NONE.** `problem-clusters.controller.ts` counts the supplied bounds and answers
 * `422 VIEWPORT_INCOMPLETE` on anything between one and three, because a partial box would
 * otherwise silently return the planet. Keeping the four inside one object rather than as four
 * optional fields makes the partial case unconstructible on this side.
 */
export interface ViewportBoundsMicrodegrees {
  readonly minLatitudeMicrodegrees: number;
  readonly maxLatitudeMicrodegrees: number;
  readonly minLongitudeMicrodegrees: number;
  readonly maxLongitudeMicrodegrees: number;
}

/** The corners MapLibre's `LngLatBounds` reports, in degrees. */
export interface ViewportCornersDegrees {
  readonly westDegrees: number;
  readonly southDegrees: number;
  readonly eastDegrees: number;
  readonly northDegrees: number;
}

function clamp(value: number, limit: number): number {
  if (value < -limit) return -limit;
  if (value > limit) return limit;
  return value;
}

/**
 * Degrees to microdegrees, rounded OUTWARD.
 *
 * A minimum floors and a maximum ceils, so the integer box always contains the floating-point one.
 * Rounding to nearest would shave up to half a microdegree off an edge and could drop a pin that
 * is genuinely on screen — an off-by-one that presents as a pin the reader can see and the list
 * cannot.
 */
function toMicrodegreesFloor(degrees: number, limit: number): number {
  return clamp(Math.floor(degrees * 1_000_000), limit);
}

function toMicrodegreesCeil(degrees: number, limit: number): number {
  return clamp(Math.ceil(degrees * 1_000_000), limit);
}

/**
 * MapLibre's corners to the endpoint's box.
 *
 * ⚠️ **THE CLAMP IS LOAD-BEARING AT LOW ZOOM.** `Map.getBounds()` reports the unwrapped world, so
 * at zoom 1 it returns longitudes beyond ±180 and latitudes beyond the Mercator cutoff. Sending
 * those verbatim is a `422` from a `.min()/.max()` the schema applies per field. Clamped, a
 * wrapped-around view becomes the whole planet, which is what it is showing.
 */
export function toViewportBoundsMicrodegrees(
  corners: ViewportCornersDegrees,
): ViewportBoundsMicrodegrees {
  return {
    minLatitudeMicrodegrees: toMicrodegreesFloor(
      corners.southDegrees,
      MAXIMUM_LATITUDE_MICRODEGREES,
    ),
    maxLatitudeMicrodegrees: toMicrodegreesCeil(
      corners.northDegrees,
      MAXIMUM_LATITUDE_MICRODEGREES,
    ),
    minLongitudeMicrodegrees: toMicrodegreesFloor(
      corners.westDegrees,
      MAXIMUM_LONGITUDE_MICRODEGREES,
    ),
    maxLongitudeMicrodegrees: toMicrodegreesCeil(
      corners.eastDegrees,
      MAXIMUM_LONGITUDE_MICRODEGREES,
    ),
  };
}

function roundToGrid(microdegrees: number): number {
  return Math.round(microdegrees / CACHE_KEY_GRID_MICRODEGREES) * CACHE_KEY_GRID_MICRODEGREES;
}

/** The same box, coarsened so a drag does not mint a cache entry per frame. See the grid above. */
export function roundViewportBoundsForCacheKey(
  bounds: ViewportBoundsMicrodegrees,
): ViewportBoundsMicrodegrees {
  return {
    minLatitudeMicrodegrees: roundToGrid(bounds.minLatitudeMicrodegrees),
    maxLatitudeMicrodegrees: roundToGrid(bounds.maxLatitudeMicrodegrees),
    minLongitudeMicrodegrees: roundToGrid(bounds.minLongitudeMicrodegrees),
    maxLongitudeMicrodegrees: roundToGrid(bounds.maxLongitudeMicrodegrees),
  };
}

function readFiniteNumberParam(
  searchParams: RawSearchParams,
  key: string,
  limitDegrees: number,
): number | null {
  const rawValue = searchParams[key];
  if (typeof rawValue !== "string" || rawValue.length === 0) return null;
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) return null;
  if (parsedValue < -limitDegrees || parsedValue > limitDegrees) return null;
  return parsedValue;
}

/**
 * The camera a shared link carries, or `null`.
 *
 * ⚠️ **ALL THREE OR NONE**, and a hand-edited value is dropped rather than repaired — the
 * `readEnumParam` precedent in `src/lib/filter-href.ts`, which exists so a mangled URL renders the
 * default view instead of a `422`. Half a camera is not a camera: a latitude with no zoom would
 * open somewhere nobody chose.
 */
export function readMapCameraFromSearchParams(searchParams: RawSearchParams): MapCamera | null {
  const latitudeDegrees = readFiniteNumberParam(searchParams, MAP_LATITUDE_QUERY_KEY, 90);
  const longitudeDegrees = readFiniteNumberParam(searchParams, MAP_LONGITUDE_QUERY_KEY, 180);
  const zoom = readFiniteNumberParam(searchParams, MAP_ZOOM_QUERY_KEY, 24);
  if (latitudeDegrees === null || longitudeDegrees === null || zoom === null) return null;
  if (zoom < 0) return null;
  return { latitudeDegrees, longitudeDegrees, zoom };
}

/**
 * The camera as query-string values.
 *
 * Four decimals is about 11 m, which is finer than any zoom this map offers can distinguish, and
 * it keeps a shared link short enough to paste into a message.
 */
export function toMapCameraSearchParams(camera: MapCamera): Record<string, string> {
  return {
    [MAP_LATITUDE_QUERY_KEY]: camera.latitudeDegrees.toFixed(4),
    [MAP_LONGITUDE_QUERY_KEY]: camera.longitudeDegrees.toFixed(4),
    [MAP_ZOOM_QUERY_KEY]: camera.zoom.toFixed(2),
  };
}

/** A point in integer microdegrees — the shape `sort=distance`'s centre takes on the wire. */
export interface CentreMicrodegrees {
  readonly latitudeMicrodegrees: number;
  readonly longitudeMicrodegrees: number;
}

function snapToCacheKeyGrid(microdegrees: number): number {
  return Math.round(microdegrees / CACHE_KEY_GRID_MICRODEGREES) * CACHE_KEY_GRID_MICRODEGREES;
}

/**
 * The camera's centre as the `sort=distance` centre: integer microdegrees, longitude wrapped into
 * ±180°, both snapped to `CACHE_KEY_GRID_MICRODEGREES` so pixel jitter in a drag cannot mint a new
 * cache entry — the reason the viewport box is rounded too.
 *
 * MapLibre can report a longitude outside ±180 after the reader pans across the antimeridian; the
 * backend's schema would refuse that with a 422, so it is wrapped here rather than sent.
 */
export function toCentreMicrodegrees(camera: MapCamera): CentreMicrodegrees {
  const wrappedLongitudeDegrees = ((((camera.longitudeDegrees + 180) % 360) + 360) % 360) - 180;
  return {
    latitudeMicrodegrees: Math.min(
      MAXIMUM_LATITUDE_MICRODEGREES,
      Math.max(
        -MAXIMUM_LATITUDE_MICRODEGREES,
        snapToCacheKeyGrid(camera.latitudeDegrees * 1_000_000),
      ),
    ),
    longitudeMicrodegrees: Math.min(
      MAXIMUM_LONGITUDE_MICRODEGREES,
      Math.max(
        -MAXIMUM_LONGITUDE_MICRODEGREES,
        snapToCacheKeyGrid(wrappedLongitudeDegrees * 1_000_000),
      ),
    ),
  };
}

/** A screen rectangle in CSS pixels — the fields of a `DOMRect` this module needs, and no more. */
export interface ScreenRectPx {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Insets from each edge of the map container, in CSS pixels — MapLibre's `PaddingOptions`. */
export interface EdgeInsetsPx {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/**
 * The largest part of the map container NOT covered by the overlay floating over it.
 *
 * The map is full-bleed and the list floats over it — a panel down the left from `md`, a sheet
 * over the bottom 50–75% under it. This takes the four strips of container left beside the overlay
 * (left, right, above, below) and keeps the one with the largest area. The whole container when
 * nothing covers it.
 *
 * Measured rects rather than breakpoint or detent constants: a collapsed tab, a dragged sheet and a
 * resized window all arrive here as whatever is actually on screen.
 */
function findLargestUncoveredRectPx(
  containerRect: ScreenRectPx,
  overlayRect: ScreenRectPx | null,
): ScreenRectPx {
  // ⚠️ **COPIED FIELD BY FIELD, NEVER SPREAD.** A `DOMRect`'s edges are prototype getters, so
  // `{ ...domRect }` is `{}` — the strips below would get `undefined` edges and MapLibre would throw
  // "Invalid LngLat object: (NaN, NaN)". Measured, which is how this line exists.
  const containerRectCopy: ScreenRectPx = {
    left: containerRect.left,
    top: containerRect.top,
    right: containerRect.right,
    bottom: containerRect.bottom,
  };
  if (overlayRect === null) return containerRectCopy;

  const clippedOverlayRect: ScreenRectPx = {
    left: Math.max(overlayRect.left, containerRect.left),
    top: Math.max(overlayRect.top, containerRect.top),
    right: Math.min(overlayRect.right, containerRect.right),
    bottom: Math.min(overlayRect.bottom, containerRect.bottom),
  };
  const isOverlayCoveringMap =
    clippedOverlayRect.left < clippedOverlayRect.right &&
    clippedOverlayRect.top < clippedOverlayRect.bottom;
  if (!isOverlayCoveringMap) return containerRectCopy;

  const uncoveredStrips: readonly ScreenRectPx[] = [
    { ...containerRectCopy, right: clippedOverlayRect.left },
    { ...containerRectCopy, left: clippedOverlayRect.right },
    { ...containerRectCopy, bottom: clippedOverlayRect.top },
    { ...containerRectCopy, top: clippedOverlayRect.bottom },
  ];
  return uncoveredStrips.reduce((largestStrip, candidateStrip) =>
    measureRectAreaPx(candidateStrip) > measureRectAreaPx(largestStrip)
      ? candidateStrip
      : largestStrip,
  );
}

/**
 * How far from the map container's centre the middle of its uncovered part sits, as the `[x, y]`
 * pixel offset MapLibre's `easeTo` takes. `[0, 0]` when nothing covers the map.
 */
export function computeUnobscuredCentreOffsetPx(
  containerRect: ScreenRectPx,
  overlayRect: ScreenRectPx | null,
): [number, number] {
  const uncoveredRect = findLargestUncoveredRectPx(containerRect, overlayRect);
  return [
    (uncoveredRect.left + uncoveredRect.right) / 2 - (containerRect.left + containerRect.right) / 2,
    (uncoveredRect.top + uncoveredRect.bottom) / 2 - (containerRect.top + containerRect.bottom) / 2,
  ];
}

/**
 * Padding that fits a set of pins inside the uncovered part of the map, with `marginPx` to spare
 * on every side — what the map passes as `fitBoundsOptions.padding` when it opens on the clusters,
 * so none of them opens underneath the list.
 */
export function computeUncoveredFitPaddingPx(
  containerRect: ScreenRectPx,
  overlayRect: ScreenRectPx | null,
  marginPx: number,
): EdgeInsetsPx {
  const uncoveredRect = findLargestUncoveredRectPx(containerRect, overlayRect);
  return {
    top: uncoveredRect.top - containerRect.top + marginPx,
    right: containerRect.right - uncoveredRect.right + marginPx,
    bottom: containerRect.bottom - uncoveredRect.bottom + marginPx,
    left: uncoveredRect.left - containerRect.left + marginPx,
  };
}

function measureRectAreaPx(rect: ScreenRectPx): number {
  return Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);
}
