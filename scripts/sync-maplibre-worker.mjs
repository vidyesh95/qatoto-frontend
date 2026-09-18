// Copies MapLibre's worker bundle into `public/maplibre/` so the browser can load it.
//
// WHY THIS EXISTS — TURBOPACK BREAKS MAPLIBRE'S WORKER, SILENTLY.
//
// MapLibre parses every vector tile in a Web Worker. It derives that worker's URL from its own
// `import.meta.url` and gives up when that is not an http(s) URL:
//
//     let e = import.meta.url;
//     if (!/^https?:/.test(e)) return ``;
//
// Under Turbopack `import.meta.url` is `file:///ROOT/src/...`, so the guard returns `""` and
// MapLibre calls `new Worker("", { type: "module" })`. The worker dies on construction and NOTHING
// SURFACES — no exception, no error event, no console message. The style, the sprites and the
// Natural Earth raster still load over HTTP on the main thread, so the map draws a plausible
// shaded-relief backdrop while every `.pbf` is silently never fetched.
//
// `setWorkerUrl()` is MapLibre's supported override, but pointing it at Turbopack's own emitted
// copy does not work either, and that is the second half of the bug. Turbopack emits the worker as
// a RAW ASSET without rewriting the imports inside it, so the emitted
// `/_next/static/media/maplibre-gl-worker.<hash>.mjs` still contains, literally:
//
//     import { ... } from "./maplibre-gl-shared.mjs"
//
// while its sibling is emitted as `maplibre-gl-shared.<a-different-hash>.mjs`. The relative
// specifier resolves to a path that 404s (measured: 404 unhashed, 200 hashed), so the module
// worker fails to evaluate. Both files must therefore sit next to each other under their ORIGINAL
// names, which is what `public/maplibre/` is for.
//
// IT RUNS ON EVERY `dev` AND EVERY `build`, which is what makes version drift impossible: the copy
// is reproduced from whatever `maplibre-gl` is installed at the moment the app is compiled, rather
// than vendored once and forgotten. `public/maplibre/` is therefore gitignored — it is build
// output, not source.

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(repositoryRoot, "node_modules", "maplibre-gl", "dist");
const outputDirectory = join(repositoryRoot, "public", "maplibre");

// The worker entry, and the one sibling module it imports. Verified against maplibre-gl 6.10.0:
// `maplibre-gl-worker.mjs` imports exactly `./maplibre-gl-shared.mjs`, and that file imports no
// sibling of its own, so this list is the whole closure rather than a guess.
const WORKER_BUNDLE_FILE_NAMES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

async function syncMaplibreWorkerBundle() {
  await mkdir(outputDirectory, { recursive: true });

  for (const fileName of WORKER_BUNDLE_FILE_NAMES) {
    await copyFile(join(sourceDirectory, fileName), join(outputDirectory, fileName));
  }

  // Fails loudly if a future MapLibre grows a second sibling import: the copy would still succeed
  // and the worker would still 404 at runtime, which is precisely the silent failure this whole
  // script exists to prevent.
  const workerSource = await readFile(join(outputDirectory, "maplibre-gl-worker.mjs"), "utf8");
  const importedSiblings = [...workerSource.matchAll(/from\s*"(\.\/[^"]+)"/g)].map(
    (match) => match[1],
  );
  const unmetSiblings = importedSiblings.filter(
    (specifier) => !WORKER_BUNDLE_FILE_NAMES.includes(specifier.replace("./", "")),
  );

  if (unmetSiblings.length > 0) {
    throw new Error(
      `maplibre-gl's worker imports files this script does not copy: ${unmetSiblings.join(", ")}. ` +
        `Add them to WORKER_BUNDLE_FILE_NAMES in scripts/sync-maplibre-worker.mjs.`,
    );
  }
}

await syncMaplibreWorkerBundle();
