// TRANSPORT: props-only — the orbit controls and the auto-framing. Reacts to selection and to the
// reset counter; the drag itself is handled by `camera-controls` with its own smoothing.

"use client";

import { CameraControls } from "@react-three/drei";
import { useEffect, useRef } from "react";
import { Box3, type Object3D, Sphere } from "three";

import type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";

export interface CameraRigProps {
  readonly store: ExplosionStore;
  readonly loadedAssembly: LoadedTeardownAssembly;
}

// SPHERES, NOT BOXES. camera-controls' `fitToBox` snaps the view to the nearest axis, which turns
// the three-quarter view into a flat elevation the moment anything is framed. `fitToSphere` keeps
// the current angles, so every fit below is a sphere — padded by enlarging its radius, and pushed
// up the frame by lowering its centre, because the HUD's slider and part panel cover the bottom
// of the canvas and the toggles cover the top.

/**
 * How much larger than the content the fitted sphere is, and how far its centre drops as a
 * fraction of that radius. Together they leave about a tenth of a radius above the content and
 * half a radius below it — the slider and the part panel sit in that lower band.
 */
const FIT_HEADROOM_FRACTION = 0.3;
const FIT_CENTRE_DROP_FRACTION = 0.15;
/**
 * The smallest sphere a selected part is framed with, as a fraction of the ASSEMBLY radius. A
 * 10 mm MOSFET framed tightly is a wall of board with no context; a floor of a third of the whole
 * assembly keeps its neighbours in the frame while it stays centred.
 */
const PART_FIT_MINIMUM_RADIUS_FRACTION = 0.35;

function fitSphereWithHeadroom(
  controls: CameraControls,
  sphere: Sphere,
  isAnimated: boolean,
): void {
  const radius = sphere.radius * (1 + FIT_HEADROOM_FRACTION);
  const centre = sphere.center.clone();
  centre.y -= radius * FIT_CENTRE_DROP_FRACTION;
  void controls.fitToSphere(new Sphere(centre, radius), isAnimated);
}

/** Frame the closed or the exploded bounds. Module-level: no closure over component props. */
function fitWholeAssembly(
  controls: CameraControls,
  loadedAssembly: LoadedTeardownAssembly,
  isExploded: boolean,
  isAnimated: boolean,
): void {
  fitSphereWithHeadroom(
    controls,
    isExploded ? loadedAssembly.explodedBoundingSphere : loadedAssembly.boundingSphere,
    isAnimated,
  );
}

/** Frame one part where it currently sits — exploded or not. */
function fitPart(
  controls: CameraControls,
  partObject: Object3D,
  minimumRadius: number,
  isAnimated: boolean,
): void {
  const partSphere = new Box3().setFromObject(partObject, true).getBoundingSphere(new Sphere());
  partSphere.radius = Math.max(partSphere.radius, minimumRadius);
  void controls.fitToSphere(partSphere, isAnimated);
}

export default function CameraRig({ store, loadedAssembly }: CameraRigProps) {
  const controlsRef = useRef<CameraControls>(null);
  const { selectedPartId, viewResetCount, isAssemblyCollapsed } = useExplosionSnapshot(store);
  const radius = loadedAssembly.boundingSphere.radius;

  // The home view: frame the closed assembly once, without a transition, and remember it.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    fitWholeAssembly(controls, loadedAssembly, false, false);
    controls.saveState();
  }, [loadedAssembly]);

  // A selected part is framed where it currently sits, which is the framing a reader who just
  // clicked it wants. With nothing selected the camera frames the whole: the closed assembly
  // while it is closed, the exploded bounds once it opens, so a part that flies outward never
  // leaves the frame.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    const selectedPart =
      selectedPartId === null ? undefined : loadedAssembly.partById.get(selectedPartId);
    if (selectedPart === undefined) {
      fitWholeAssembly(controls, loadedAssembly, !isAssemblyCollapsed, true);
      return;
    }
    fitPart(controls, selectedPart.object, radius * PART_FIT_MINIMUM_RADIUS_FRACTION, true);
  }, [selectedPartId, isAssemblyCollapsed, loadedAssembly, radius]);

  useEffect(() => {
    if (viewResetCount === 0) return;
    void controlsRef.current?.reset(true);
  }, [viewResetCount]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.35}
      draggingSmoothTime={0.08}
      minDistance={radius * 0.4}
      maxDistance={radius * 10}
      dollyToCursor
    />
  );
}
