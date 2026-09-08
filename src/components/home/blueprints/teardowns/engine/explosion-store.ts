// TRANSPORT: props-only — in-memory state for ONE viewport. Never touches the network or storage.
//
// TWO SPEEDS, TWO MECHANISMS, and the split is the whole design:
//
// - `motion` is HIGH-FREQUENCY. The slider writes `targetFactor` on every input event and the frame
//   loop integrates `currentFactor` sixty times a second. Neither write tells React anything — no
//   listener runs, no component renders. The loop reads the fields directly.
// - The snapshot is LOW-FREQUENCY. Selection, hover and the two toggles change on a click, and the
//   components that show them (pins, the part panel, the camera rig) subscribe through
//   `useSyncExternalStore`, which is the repo's precedent for a hand-rolled store
//   (`src/lib/browser-preferences.ts`).
//
// The bridge between the DOM controls (outside the canvas) and R3F's on-demand frame loop is
// `setFrameRequester`: the in-canvas component registers R3F's `invalidate`, and every write here
// asks for one frame. Without it a slider drag would update a number nobody drew.
//
// A PER-VIEWPORT INSTANCE, created by the island with `useState(() => createExplosionStore())` and
// passed down as a prop. Two viewports on one page must never share a slider.

import { useSyncExternalStore } from "react";

import type { TeardownCameraPreset } from "@/lib/blueprints/camera-presets";

/** Mutated in place; read by the frame loop; never notifies React. */
export interface ExplosionMotion {
  targetFactor: number;
  currentFactor: number;
}

/**
 * A camera instruction on its way INTO the canvas.
 *
 * The preset menu and the zoom buttons are DOM controls outside the `<Canvas>`, and the
 * `CameraControls` instance they need to drive lives inside it. Rather than lift a ref out through
 * the renderer, an instruction is published here and the rig reacts to it — the same direction of
 * travel as `setFrameRequester`, which carries `invalidate` the other way.
 *
 * `requestToken` is monotonic and is the whole reason this is not just a preset name: pressing
 * "Front" twice, or zooming in twice, must fire twice, and two identical snapshots would not.
 */
export interface CameraCommand {
  readonly kind: "preset" | "dolly";
  readonly preset: TeardownCameraPreset | null;
  /** Dolly steps; positive moves closer. Ignored for a preset. */
  readonly dollySteps: number;
  readonly requestToken: number;
}

/** Immutable; every change notifies `useSyncExternalStore` subscribers. */
export interface ExplosionSnapshot {
  readonly selectedPartId: string | null;
  readonly hoveredPartId: string | null;
  readonly isXrayEnabled: boolean;
  readonly isStressViewEnabled: boolean;
  /**
   * Non-selected parts are HIDDEN rather than ghosted. The Components tab is a part browser, and a
   * browser that leaves the rest of the assembly faintly on screen is showing the assembly, not
   * the part.
   */
  readonly isIsolationEnabled: boolean;
  /** Callout pins only make sense while the assembly is open, so the tab decides. */
  readonly arePinsEnabled: boolean;
  /** Promoted from `currentFactor` by the frame loop, on a flip only. Pins hide while collapsed. */
  readonly isAssemblyCollapsed: boolean;
  /** Monotonic; the camera rig treats every increment as "go home". */
  readonly viewResetCount: number;
  readonly cameraCommand: CameraCommand | null;
  /**
   * How close the camera is, as a percentage of its fitted distance — published BY the rig for the
   * zoom readout. Rounded to whole percent so an orbit or a fit transition cannot spray renders.
   */
  readonly zoomPercent: number;
}

// FUNCTION-TYPED PROPERTIES, NOT METHODS. `useSyncExternalStore(store.subscribe, store.getSnapshot)`
// hands these over unbound, which is only safe because none of them reads `this` — and the lint
// rule that guards against unbound methods reads that guarantee off the property syntax.
export interface ExplosionStore {
  readonly motion: ExplosionMotion;
  readonly getSnapshot: () => ExplosionSnapshot;
  readonly subscribe: (onStoreChange: () => void) => () => void;
  /** Clamped to [0, 1]. Asks for a frame; notifies nobody. */
  readonly setTargetFactor: (factor: number) => void;
  readonly selectPart: (partId: string | null) => void;
  readonly hoverPart: (partId: string | null) => void;
  readonly setXrayEnabled: (isEnabled: boolean) => void;
  readonly setStressViewEnabled: (isEnabled: boolean) => void;
  /** Called every frame; publishes only when the value flips. */
  readonly publishCollapsedState: (isCollapsed: boolean) => void;
  readonly setIsolationEnabled: (isEnabled: boolean) => void;
  readonly setPinsEnabled: (areEnabled: boolean) => void;
  /** Collapse, deselect and send the camera home. */
  readonly requestViewReset: () => void;
  readonly requestCameraPreset: (preset: TeardownCameraPreset) => void;
  /** Positive steps move closer. */
  readonly requestDolly: (dollySteps: number) => void;
  readonly publishZoomPercent: (zoomPercent: number) => void;
  /** Registered by the in-canvas component with R3F's `invalidate`; `null` once it unmounts. */
  readonly setFrameRequester: (requestFrame: (() => void) | null) => void;
}

const INITIAL_SNAPSHOT: ExplosionSnapshot = {
  selectedPartId: null,
  hoveredPartId: null,
  isXrayEnabled: false,
  isStressViewEnabled: false,
  isIsolationEnabled: false,
  arePinsEnabled: false,
  isAssemblyCollapsed: true,
  viewResetCount: 0,
  cameraCommand: null,
  zoomPercent: 100,
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createExplosionStore(): ExplosionStore {
  const motion: ExplosionMotion = { targetFactor: 0, currentFactor: 0 };
  const listeners = new Set<() => void>();
  let snapshot = INITIAL_SNAPSHOT;
  let requestFrame: (() => void) | null = null;
  let cameraRequestToken = 0;

  function publish(nextSnapshot: ExplosionSnapshot): void {
    snapshot = nextSnapshot;
    for (const onStoreChange of listeners) onStoreChange();
    // A toggle or a selection always needs at least one frame to show.
    requestFrame?.();
  }

  // Closures only — no `this` — so `subscribe` and `getSnapshot` can be handed to
  // `useSyncExternalStore` unbound.
  return {
    motion,
    getSnapshot: () => snapshot,
    subscribe(onStoreChange) {
      listeners.add(onStoreChange);
      return () => {
        listeners.delete(onStoreChange);
      };
    },
    setTargetFactor(factor) {
      motion.targetFactor = clampUnit(factor);
      requestFrame?.();
    },
    selectPart(partId) {
      if (partId !== snapshot.selectedPartId) publish({ ...snapshot, selectedPartId: partId });
    },
    hoverPart(partId) {
      if (partId !== snapshot.hoveredPartId) publish({ ...snapshot, hoveredPartId: partId });
    },
    setXrayEnabled(isEnabled) {
      if (isEnabled !== snapshot.isXrayEnabled) publish({ ...snapshot, isXrayEnabled: isEnabled });
    },
    setStressViewEnabled(isEnabled) {
      if (isEnabled !== snapshot.isStressViewEnabled) {
        publish({ ...snapshot, isStressViewEnabled: isEnabled });
      }
    },
    setIsolationEnabled(isEnabled) {
      if (isEnabled !== snapshot.isIsolationEnabled) {
        publish({ ...snapshot, isIsolationEnabled: isEnabled });
      }
    },
    setPinsEnabled(areEnabled) {
      if (areEnabled !== snapshot.arePinsEnabled) {
        publish({ ...snapshot, arePinsEnabled: areEnabled });
      }
    },
    requestCameraPreset(preset) {
      cameraRequestToken += 1;
      publish({
        ...snapshot,
        cameraCommand: { kind: "preset", preset, dollySteps: 0, requestToken: cameraRequestToken },
      });
    },
    requestDolly(dollySteps) {
      cameraRequestToken += 1;
      publish({
        ...snapshot,
        cameraCommand: {
          kind: "dolly",
          preset: null,
          dollySteps,
          requestToken: cameraRequestToken,
        },
      });
    },
    publishZoomPercent(zoomPercent) {
      const rounded = Math.round(zoomPercent);
      if (rounded !== snapshot.zoomPercent) publish({ ...snapshot, zoomPercent: rounded });
    },
    publishCollapsedState(isCollapsed) {
      if (isCollapsed !== snapshot.isAssemblyCollapsed) {
        publish({ ...snapshot, isAssemblyCollapsed: isCollapsed });
      }
    },
    requestViewReset() {
      motion.targetFactor = 0;
      publish({ ...snapshot, selectedPartId: null, viewResetCount: snapshot.viewResetCount + 1 });
    },
    setFrameRequester(nextRequestFrame) {
      requestFrame = nextRequestFrame;
    },
  };
}

export function useExplosionSnapshot(store: ExplosionStore): ExplosionSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
