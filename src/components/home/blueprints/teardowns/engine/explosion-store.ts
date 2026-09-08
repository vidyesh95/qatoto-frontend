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

/** Mutated in place; read by the frame loop; never notifies React. */
export interface ExplosionMotion {
  targetFactor: number;
  currentFactor: number;
}

/** Immutable; every change notifies `useSyncExternalStore` subscribers. */
export interface ExplosionSnapshot {
  readonly selectedPartId: string | null;
  readonly hoveredPartId: string | null;
  readonly isXrayEnabled: boolean;
  readonly isStressViewEnabled: boolean;
  /** Promoted from `currentFactor` by the frame loop, on a flip only. Pins hide while collapsed. */
  readonly isAssemblyCollapsed: boolean;
  /** Monotonic; the camera rig treats every increment as "go home". */
  readonly viewResetCount: number;
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
  /** Collapse, deselect and send the camera home. */
  readonly requestViewReset: () => void;
  /** Registered by the in-canvas component with R3F's `invalidate`; `null` once it unmounts. */
  readonly setFrameRequester: (requestFrame: (() => void) | null) => void;
}

const INITIAL_SNAPSHOT: ExplosionSnapshot = {
  selectedPartId: null,
  hoveredPartId: null,
  isXrayEnabled: false,
  isStressViewEnabled: false,
  isAssemblyCollapsed: true,
  viewResetCount: 0,
};

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function createExplosionStore(): ExplosionStore {
  const motion: ExplosionMotion = { targetFactor: 0, currentFactor: 0 };
  const listeners = new Set<() => void>();
  let snapshot = INITIAL_SNAPSHOT;
  let requestFrame: (() => void) | null = null;

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
