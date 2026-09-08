// TRANSPORT: props-only — the orbit controls and the auto-framing. Reacts to selection and to the
// reset counter; the drag itself is handled by `camera-controls` with its own smoothing.

"use client";

import { CameraControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, MathUtils, type Object3D, Sphere } from "three";

import {
  TEARDOWN_CAMERA_PRESET_ANGLES,
  type TeardownCameraPreset,
} from "@/lib/blueprints/camera-presets";

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
 * The smallest sphere a selected part is framed with, as a fraction of the ASSEMBLY radius.
 *
 * GENEROUS ON PURPOSE. Fitting a small part to its own bounds fills the frame with it and nothing
 * else — measured at 371% zoom on the heatsink, close enough that the part above it covered the
 * shot. A reader who clicks "unbolt the heatsink" wants to see where the heatsink is, so the floor
 * is most of the assembly and the part is merely centred in it.
 */
const PART_FIT_MINIMUM_RADIUS_FRACTION = 0.8;

/** One press of the zoom buttons, as a fraction of the current camera distance. */
const DOLLY_STEP_FRACTION = 0.18;

function applyCameraPreset(controls: CameraControls, preset: TeardownCameraPreset): void {
  const { azimuthDegrees, polarDegrees } = TEARDOWN_CAMERA_PRESET_ANGLES[preset];
  void controls.rotateTo(
    MathUtils.degToRad(azimuthDegrees),
    MathUtils.degToRad(polarDegrees),
    true,
  );
}

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
  const fittedDistanceRef = useRef<number | null>(null);
  const { selectedPartId, viewResetCount, isAssemblyCollapsed, cameraCommand } =
    useExplosionSnapshot(store);
  const radius = loadedAssembly.boundingSphere.radius;

  // The home view: frame the closed assembly once, without a transition, and remember it. The
  // distance it settles at is 100% on the zoom readout.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    fitWholeAssembly(controls, loadedAssembly, false, false);
    controls.saveState();
    fittedDistanceRef.current = controls.distance;
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

  // Instructions published by the DOM controls outside the canvas. Keyed on the monotonic token so
  // pressing the same preset twice fires twice.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null || cameraCommand === null) return;
    if (cameraCommand.kind === "preset" && cameraCommand.preset !== null) {
      applyCameraPreset(controls, cameraCommand.preset);
      return;
    }
    if (cameraCommand.kind === "dolly") {
      const step = controls.distance * DOLLY_STEP_FRACTION * cameraCommand.dollySteps;
      void controls.dolly(step, true);
    }
  }, [cameraCommand]);

  // The zoom readout is a percentage of the distance the assembly was first fitted at, published
  // from inside the loop because that distance only exists here. `publishZoomPercent` rounds and
  // drops no-ops, so an orbit — which does not change distance — costs nothing.
  useFrame(() => {
    const controls = controlsRef.current;
    const fittedDistance = fittedDistanceRef.current;
    if (controls === null || fittedDistance === null) return;
    store.publishZoomPercent((fittedDistance / controls.distance) * 100);
  });

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
