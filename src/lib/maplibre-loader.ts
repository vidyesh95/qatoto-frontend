// TRANSPORT: props-only — dynamic loader for MapLibre GL and its styles.
// Hoisted outside React component bodies so the React Compiler can auto-memoize
// components without encountering dynamic import HIR lowering bailouts.

let cachedMapLibreModulePromise: Promise<typeof import("maplibre-gl")> | null = null;

export function loadMapLibreModule(): Promise<typeof import("maplibre-gl")> {
  if (cachedMapLibreModulePromise === null) {
    cachedMapLibreModulePromise = import("maplibre-gl");
  }
  return cachedMapLibreModulePromise;
}

export function loadMapLibreWithCss(): Promise<[typeof import("maplibre-gl"), unknown]> {
  return Promise.all([loadMapLibreModule(), import("maplibre-gl/dist/maplibre-gl.css")]);
}
