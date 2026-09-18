// TRANSPORT: props-only — reads `process.env` and browser capabilities, never the network.
//
// THE CAPABILITY GATE FOR THE CIVIC PULSE VECTOR BASEMAP.
//
// `/research-and-development/problem-map` drew its pins over `public/dummy/world_map.svg`
// for as long as it existed, projected by two latitude constants that `map-projection.ts`
// itself calls "calibrated estimates … close, not exact". This module is what lets a real
// vector basemap stand behind the same pins, and what lets that swap be reverted without a
// revert.
//
// NOTHING HERE COSTS MONEY, AND THAT IS THE DESIGN RATHER THAN A COINCIDENCE.
// `docs/MAP_TILE_FALLBACK.md` §3.1 rejects Google Maps by name over its $7/1,000 dynamic map
// loads and its mandatory billing credentials. OpenFreeMap serves the same OpenStreetMap data
// with NO API KEY, no account and no rate limit, so there is no secret to keep out of the
// client bundle (CLAUDE.md, "No secrets in the frontend") and no quota for a hostile client to
// burn. What is not bought is reliability: OpenFreeMap is donation-funded and publishes no SLA,
// which is why the canvas degrades in place rather than rendering a blank grey rectangle.

/**
 * Whether the vector basemap may render at all.
 *
 * A BUILD-TIME CONSTANT, NOT A RUNTIME TOGGLE. `process.env.NEXT_PUBLIC_*` is inlined by the
 * compiler, so flipping this needs a rebuild — which is correct for a rollback switch and wrong
 * for a user preference. It is deliberately NOT a browser preference: `browser-preferences.ts`
 * owns the one storage key this app is allowed, and a second key would make the claim
 * `privacy-policy.tsx` prints to readers false.
 *
 * Mirrors the `RAZORPAY_KEY_ID` precedent in `src/lib/razorpay-checkout.ts` — an env-derived
 * module constant is this repo's existing idiom for a capability that may simply be absent.
 */
export const IS_VECTOR_MAP_ENABLED = process.env.NEXT_PUBLIC_CIVIC_PULSE_MAPLIBRE === "true";

/**
 * OpenFreeMap's own hosted `liberty` style, referenced by URL rather than forked.
 *
 * NOT COPIED INTO THIS REPO ON PURPOSE. A fork is a file to keep current against a style that
 * its publisher revises, and it buys nothing here — the light map wants exactly what OpenFreeMap
 * already serves. The dark one is forked only because no dark style exists to reference.
 */
export const LIGHT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Served from `public/` rather than imported, so ~10 KB of style JSON is fetched as a URL and
 * cached by the CDN instead of being inlined into the lazily-loaded map chunk.
 */
export const DARK_MAP_STYLE_URL = "/map-styles/qatoto-dark.json";

/** The keyless vector source both styles read. Its TileJSON carries the ODbL attribution. */
export const OPENFREEMAP_VECTOR_TILEJSON_URL = "https://tiles.openfreemap.org/planet";

export function resolveMapStyleUrl(isDarkTheme: boolean): string {
  return isDarkTheme ? DARK_MAP_STYLE_URL : LIGHT_MAP_STYLE_URL;
}

/**
 * Whether the dark basemap should be used.
 *
 * ⚠️ **THIS READS THE `.dark` CLASS AND MUST NOT READ `prefers-color-scheme`.**
 * `browser-preferences.ts` records that the appearance preference was removed and "took the whole
 * theme system with it — it was the only thing that ever wrote `.dark` onto `<html>`, so there is
 * no pre-paint bootstrap script, no `prefers-color-scheme` subscription and no dark palette any
 * more". `globals.css` still defines all 32 dark tokens, but nothing applies them.
 *
 * So a media-query read here would hand a dark basemap to every visitor whose OS is dark while
 * the app around it stayed light — a map that disagrees with its own page. Reading the class
 * resolves to `false` today, which is correct, and starts resolving to `true` for free on the day
 * appearance comes back.
 */
export function isDarkThemeActive(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Whether this browser can run the vector basemap.
 *
 * MapLibre GL JS 6 requires WebGL2 — there is no WebGL1 path to fall back to inside the library,
 * so the probe is the whole compatibility story. A `false` here sends the surface back to the
 * static SVG, which needs no GPU context at all.
 */
export function detectVectorMapSupport(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    // Some hardened browsers throw from `getContext` rather than returning null.
    return false;
  }
}

/**
 * Whether the visitor has asked their browser not to fetch heavy media.
 *
 * Vector tiles are a continuous network read for as long as the map is panned, so a reader on a
 * metered connection gets the report list and no canvas at all. This is the one state where
 * dropping to the SVG would still be wrong: the SVG is a 2000×857 image, which is the thing
 * being avoided.
 */
export function prefersReducedData(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-data: reduce)").matches;
  } catch {
    return false;
  }
}

// --- Which canvas the problem map should draw on ----------------------------------------

/**
 * The three ways the problem map can render its pins.
 *
 * A STRING UNION RATHER THAN A TAGGED OBJECT, because no variant carries a payload — CLAUDE.md
 * Pattern 1 exists to stop `isVectorEnabled` + `hasWebgl` + `isReducedData` making
 * "vector map on a machine with no WebGL2" a constructible state, and a string union with an
 * exhaustive `switch` does that without wrapping three bare tags in three objects.
 *
 * It must also stay referentially stable: `useSyncExternalStore` re-invokes `getSnapshot` on every
 * render and loops forever if the value is a fresh object each time.
 */
export type MapCanvasModeKind = "static" | "vector" | "listOnly";

/**
 * Cached because `getSnapshot` runs on every render and a WebGL2 probe allocates a canvas and a
 * GPU context. Support cannot change within a page's life, so asking once is both cheaper and
 * more correct than asking repeatedly.
 */
let cachedVectorMapSupport: boolean | null = null;

function hasCachedVectorMapSupport(): boolean {
  cachedVectorMapSupport ??= detectVectorMapSupport();
  return cachedVectorMapSupport;
}

/**
 * ⚠️ **ALWAYS `static`, AND THAT IS THE POINT.** React uses this for the SSR render AND the
 * hydration render, so the server HTML and the first client render agree by construction. The
 * upgrade to `vector` happens on the render after hydration, by which time the SVG is already
 * painted — the pins are never missing, and a reader with JavaScript off keeps a map with every
 * cluster on it. `browser-preferences-context.tsx` documents the same mechanism for the same
 * reason.
 */
export function getServerMapCanvasModeSnapshot(): MapCanvasModeKind {
  return "static";
}

export function getMapCanvasModeSnapshot(): MapCanvasModeKind {
  if (!IS_VECTOR_MAP_ENABLED) return "static";
  // Checked BEFORE WebGL2: a reader on a metered connection is asking not to stream tiles, and
  // the static SVG is a 2000×857 image, so falling back to it would serve the request badly.
  if (prefersReducedData()) return "listOnly";
  // A browser without WebGL2 falls back to the SVG, not to the list — it keeps a map.
  return hasCachedVectorMapSupport() ? "vector" : "static";
}

/**
 * `prefers-reduced-data` is the one input here that can change mid-session (a laptop joining a
 * tethered hotspot flips it), so it is the only thing subscribed to. WebGL2 support cannot change,
 * and the build-time flag certainly cannot.
 */
export function subscribeToMapCanvasMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  try {
    const reducedDataQuery = window.matchMedia("(prefers-reduced-data: reduce)");
    reducedDataQuery.addEventListener("change", onStoreChange);
    return () => reducedDataQuery.removeEventListener("change", onStoreChange);
  } catch {
    return () => {};
  }
}
