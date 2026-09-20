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
