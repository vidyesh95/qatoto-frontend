// TRANSPORT: props-only — fetches the app's own static atlas; no API calls.

import {
  MASCOT_ATLAS_JSON_URL,
  parseMascotAtlas,
  type MascotAtlas,
} from "@/lib/assistant/mascot-atlas.schemas";

export interface MascotStageResources {
  readonly atlas: MascotAtlas;
  readonly pixi: typeof import("pixi.js");
}

let cachedStageResourcesPromise: Promise<MascotStageResources | null> | null = null;

/**
 * Downloads and caches the static mascot atlas JSON and the PixiJS chunk in parallel.
 * Reused across stage mounts so re-mounts do not re-request static assets.
 */
export async function loadMascotStageResources(): Promise<MascotStageResources | null> {
  if (cachedStageResourcesPromise !== null) {
    return cachedStageResourcesPromise;
  }

  cachedStageResourcesPromise = (async () => {
    try {
      const atlasPromise = fetch(MASCOT_ATLAS_JSON_URL).then(async (response) => {
        const rawAtlas: unknown = response.ok ? await response.json() : null;
        return parseMascotAtlas(rawAtlas);
      });
      const pixiPromise = import("pixi.js");

      const [atlasResult, pixi] = await Promise.all([atlasPromise, pixiPromise]);
      if (!atlasResult.success) {
        return null;
      }

      return {
        atlas: atlasResult.data,
        pixi,
      };
    } catch {
      return null;
    }
  })();

  return cachedStageResourcesPromise;
}
