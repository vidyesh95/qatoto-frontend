// TRANSPORT: props-only — the per-frame integrator. Owns no React state; reads the store's mutable
// motion fields and writes three.js objects directly.
//
// THE GOLDEN RULE OF THIS FILE: nothing in here calls `setState` on a slider tick. The slider
// writes `store.motion.targetFactor`; `useFrame` below integrates toward it and moves the parts by
// mutating `position` in place. React renders this component once per selection or toggle and
// never during a drag — react-scan in dev shows nothing lighting up while the slider moves.
//
// ON DEMAND, SELF-SUSTAINING. The canvas runs `frameloop="demand"`; this loop calls `invalidate()`
// while anything is still moving (the explosion factor or a part's opacity) and stops asking the
// moment everything is at rest, so an idle viewport costs no frames at all.

"use client";

import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Color, EdgesGeometry, LineBasicMaterial, LineSegments, MeshStandardMaterial } from "three";

import type {
  LoadedTeardownAssembly,
  LoadedTeardownPart,
} from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import type {
  ExplosionSnapshot,
  ExplosionStore,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import PartCalloutPin from "@/components/home/blueprints/teardowns/engine/part-callout-pin";
import { isFactorAtRest, stepFactorTowardTarget } from "@/lib/blueprints/explosion";

export interface ExplodedAssemblyProps {
  readonly store: ExplosionStore;
  readonly loadedAssembly: LoadedTeardownAssembly;
  readonly stiffnessPerSecond: number;
}

/** Everything but the focused part fades to this under X-ray. */
const GHOSTED_OPACITY = 0.15;
/** Above this a part writes depth again, so a solid part is not seen through by a ghost. */
const OPAQUE_DEPTH_WRITE_THRESHOLD = 0.98;
/** Below this the assembly counts as collapsed and the pins hide. */
const COLLAPSED_FACTOR_THRESHOLD = 0.02;
/** Feature edges only: faces meeting at less than this angle draw no line. */
const EDGE_THRESHOLD_DEGREES = 30;
const HOVER_EMISSIVE = new Color("#331400");
const NO_EMISSIVE = new Color("#000000");

/** One shared line material for every X-ray overlay in the viewport. */
const EDGE_MATERIAL = new LineBasicMaterial({
  color: "#FF5500",
  transparent: true,
  opacity: 0.35,
  depthTest: false,
});

function resolveTargetOpacity(snapshot: ExplosionSnapshot, partId: string): number {
  if (!snapshot.isXrayEnabled) return 1;
  const isFocused = snapshot.selectedPartId === partId || snapshot.hoveredPartId === partId;
  return isFocused ? 1 : GHOSTED_OPACITY;
}

function applyOpacity(loadedPart: LoadedTeardownPart, opacity: number): void {
  const isDepthWritten = opacity > OPAQUE_DEPTH_WRITE_THRESHOLD;
  for (const materials of loadedPart.pbrMaterialsByMesh.values()) {
    for (const material of materials) {
      material.opacity = opacity;
      material.depthWrite = isDepthWritten;
    }
  }
  loadedPart.stressMaterial.opacity = opacity;
  loadedPart.stressMaterial.depthWrite = isDepthWritten;
}

function applyStressView(loadedAssembly: LoadedTeardownAssembly, isStressView: boolean): void {
  for (const loadedPart of loadedAssembly.parts) {
    for (const mesh of loadedPart.meshes) {
      if (isStressView) {
        mesh.material = loadedPart.stressMaterial;
        continue;
      }
      const pbrMaterials = loadedPart.pbrMaterialsByMesh.get(mesh);
      if (pbrMaterials === undefined) continue;
      mesh.material =
        pbrMaterials.length === 1 ? (pbrMaterials[0] ?? mesh.material) : [...pbrMaterials];
    }
  }
}

/**
 * Feature-edge overlays, built on the FIRST X-ray toggle rather than at load. `EdgesGeometry` is
 * O(triangles) once and a fraction of the line count `wireframe: true` would draw on a dense CAD
 * mesh, and reads as a blueprint. The overlay does not raycast, so it never steals a click.
 */
function applyEdgeOverlays(loadedAssembly: LoadedTeardownAssembly, isVisible: boolean): void {
  for (const loadedPart of loadedAssembly.parts) {
    if (loadedPart.edgeOverlays === null) {
      if (!isVisible) continue;
      loadedPart.edgeOverlays = loadedPart.meshes.map((mesh) => {
        const overlay = new LineSegments(
          new EdgesGeometry(mesh.geometry, EDGE_THRESHOLD_DEGREES),
          EDGE_MATERIAL,
        );
        overlay.raycast = () => undefined;
        mesh.add(overlay);
        return overlay;
      });
    }
    for (const overlay of loadedPart.edgeOverlays) overlay.visible = isVisible;
  }
}

function applyHoverHighlight(loadedPart: LoadedTeardownPart, isHovered: boolean): void {
  for (const materials of loadedPart.pbrMaterialsByMesh.values()) {
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) {
        material.emissive.copy(isHovered ? HOVER_EMISSIVE : NO_EMISSIVE);
      }
    }
  }
}

/** What the frame loop last applied to the scene, so a toggle costs work only on the flip. */
interface AppliedFrameState {
  isStressViewApplied: boolean;
  isXrayApplied: boolean;
  hoveredPartIdApplied: string | null;
}

/**
 * ONE FRAME. A module-level function rather than a closure in the component: every mutation of the
 * store's motion fields and of the three.js objects happens here, where the React Compiler sees a
 * call and not a component mutating its props. Returns whether anything is still moving.
 */
function advanceExplosionFrame(
  store: ExplosionStore,
  loadedAssembly: LoadedTeardownAssembly,
  applied: AppliedFrameState,
  stiffnessPerSecond: number,
  deltaSeconds: number,
): boolean {
  const { motion } = store;
  const snapshot = store.getSnapshot();

  motion.currentFactor = stepFactorTowardTarget(
    motion.currentFactor,
    motion.targetFactor,
    deltaSeconds,
    stiffnessPerSecond,
  );
  const isMotionAtRest = isFactorAtRest(motion.currentFactor, motion.targetFactor);

  if (snapshot.isStressViewEnabled !== applied.isStressViewApplied) {
    applyStressView(loadedAssembly, snapshot.isStressViewEnabled);
    applied.isStressViewApplied = snapshot.isStressViewEnabled;
  }
  if (snapshot.isXrayEnabled !== applied.isXrayApplied) {
    applyEdgeOverlays(loadedAssembly, snapshot.isXrayEnabled);
    applied.isXrayApplied = snapshot.isXrayEnabled;
  }
  if (snapshot.hoveredPartId !== applied.hoveredPartIdApplied) {
    if (applied.hoveredPartIdApplied !== null) {
      const previousPart = loadedAssembly.partById.get(applied.hoveredPartIdApplied);
      if (previousPart !== undefined) applyHoverHighlight(previousPart, false);
    }
    if (snapshot.hoveredPartId !== null) {
      const hoveredPart = loadedAssembly.partById.get(snapshot.hoveredPartId);
      if (hoveredPart !== undefined) applyHoverHighlight(hoveredPart, true);
    }
    applied.hoveredPartIdApplied = snapshot.hoveredPartId;
  }

  let isOpacityAtRest = true;
  for (const loadedPart of loadedAssembly.parts) {
    loadedPart.object.position
      .copy(loadedPart.originPosition)
      .addScaledVector(
        loadedPart.explosionDirection,
        loadedPart.explosionDistance * motion.currentFactor,
      );

    const targetOpacity = resolveTargetOpacity(snapshot, loadedPart.part.id);
    const nextOpacity = stepFactorTowardTarget(
      loadedPart.currentOpacity,
      targetOpacity,
      deltaSeconds,
      stiffnessPerSecond,
    );
    if (nextOpacity !== loadedPart.currentOpacity) {
      loadedPart.currentOpacity = nextOpacity;
      applyOpacity(loadedPart, nextOpacity);
      isOpacityAtRest = false;
    }
  }

  store.publishCollapsedState(motion.currentFactor < COLLAPSED_FACTOR_THRESHOLD);
  return !isMotionAtRest || !isOpacityAtRest;
}

export default function ExplodedAssembly({
  store,
  loadedAssembly,
  stiffnessPerSecond,
}: ExplodedAssemblyProps) {
  const invalidate = useThree((state) => state.invalidate);
  const appliedRef = useRef<AppliedFrameState>({
    isStressViewApplied: false,
    isXrayApplied: false,
    hoveredPartIdApplied: null,
  });

  useEffect(() => {
    store.setFrameRequester(() => invalidate());
    return () => store.setFrameRequester(null);
  }, [store, invalidate]);

  useFrame((_state, deltaSeconds) => {
    const isStillMoving = advanceExplosionFrame(
      store,
      loadedAssembly,
      appliedRef.current,
      stiffnessPerSecond,
      deltaSeconds,
    );
    if (isStillMoving) invalidate();
  });

  function handlePartClick(event: ThreeEvent<MouseEvent>, partId: string): void {
    // Also keeps the canvas's `onPointerMissed` from deselecting on the same click.
    event.stopPropagation();
    const { selectedPartId } = store.getSnapshot();
    store.selectPart(selectedPartId === partId ? null : partId);
  }

  function handlePartPointerOver(event: ThreeEvent<PointerEvent>, partId: string): void {
    event.stopPropagation();
    store.hoverPart(partId);
  }

  function handlePartPointerOut(): void {
    store.hoverPart(null);
  }

  return (
    <primitive object={loadedAssembly.root} dispose={null}>
      {loadedAssembly.parts.map((loadedPart) => (
        <primitive
          key={loadedPart.part.id}
          object={loadedPart.object}
          dispose={null}
          onClick={(event: ThreeEvent<MouseEvent>) => handlePartClick(event, loadedPart.part.id)}
          onPointerOver={(event: ThreeEvent<PointerEvent>) =>
            handlePartPointerOver(event, loadedPart.part.id)
          }
          onPointerOut={handlePartPointerOut}
        >
          {loadedPart.part.calloutText === null ? null : (
            <PartCalloutPin store={store} loadedPart={loadedPart} />
          )}
        </primitive>
      ))}
    </primitive>
  );
}
