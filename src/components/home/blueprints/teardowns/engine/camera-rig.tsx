// TRANSPORT: props-only — the orbit controls and the auto-framing. Reacts to selection and to the
// reset counter; the drag itself is handled by `camera-controls` with its own smoothing.
//
// WHEEL AND TOUCH ARE NOT ITS DRAG, AND THEY ARE NOT ITS ROUTES EITHER: both are switched off
// below and re-issued by `useCameraGestures`, so that a plain wheel and a one-finger swipe belong
// to the page. The reasoning is written out there.

"use client";

import { CameraControls, CameraControlsImpl } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Box3, MathUtils, type Object3D, Sphere } from "three";

import {
  TEARDOWN_CAMERA_PRESET_ANGLES,
  type TeardownCameraPreset,
} from "@/lib/blueprints/camera-presets";

import type { LoadedTeardownAssembly } from "@/components/home/blueprints/teardowns/engine/assembly-loader";
import { useCameraGestures } from "@/components/home/blueprints/teardowns/engine/use-camera-gestures";
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
// the current angles, so every fit below is a sphere, padded by enlarging its radius.
//
// THE PIVOT IS THE MODEL'S CENTRE, AND NOTHING MAY LOWER IT. An earlier version dropped the fit
// centre by 15% of the radius to keep the model clear of a slider that overlaid the stage. The
// camera orbits and dollies about that point, so the model sat ABOVE the pivot on screen — and
// perspective then slid it down toward the pivot on every zoom out and up on every zoom in. That
// was reported as "tapping zoom moves the model". Any pivot that is not the content's centre is a
// parallax drift under every zoom input; clearance comes from the headroom below, which scales
// with the model instead of displacing it.

/**
 * How much larger than the content the fitted sphere is. It is what keeps the model clear of the
 * corner controls at 100%, and because it is a fraction of the radius it stays proportionate at
 * every framing.
 */
const FIT_HEADROOM_FRACTION = 0.3;
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

/**
 * HOW FAR THE ZOOM MAY TRAVEL, as fractions of the distance the CURRENT framing was fitted at —
 * never of the assembly's own size.
 *
 * ⚠️ THE BUG THIS EXISTS TO CLOSE: the limits used to be JSX props off the closed assembly's
 * bounding-sphere radius, `minDistance={radius * 0.4}`. A fit parks the camera at roughly
 * `4.3 × radius`, so that floor let it come in to `0.4 × radius` — well inside a sphere of radius
 * `radius`. Eight presses of the zoom button reached 779% and put the camera inside the enclosure,
 * looking at the back of the control board with the shell clipped away.
 *
 * Anchoring to the fit instead is what makes that unreachable. A fit distance is always about
 * 3.3 times the framed radius, so a floor at 0.4 of it sits at roughly 1.3 framed radii — outside
 * whatever is on screen, at every framing, without a special case. The band works out at 33% to
 * 250%, and a small isolated part is still inspectable because the part's own fit is what the band
 * is measured from.
 */
const ZOOM_IN_LIMIT_FRACTION = 0.4;
const ZOOM_OUT_LIMIT_MULTIPLE = 3;

/**
 * What the camera is currently framing. Mutable and carried by a ref, because the frame loop reads
 * it sixty times a second and nothing renders off it.
 *
 * `framedRadius` is the EFFECTIVE radius — headroom already applied — so it can be handed back to
 * `applyFraming` on a resize without compounding the padding.
 */
interface CameraFraming {
  framedRadius: number | null;
  fittedDistance: number | null;
}

function applyCameraPreset(controls: CameraControls, preset: TeardownCameraPreset): void {
  const { azimuthDegrees, polarDegrees } = TEARDOWN_CAMERA_PRESET_ANGLES[preset];
  void controls.rotateTo(
    MathUtils.degToRad(azimuthDegrees),
    MathUtils.degToRad(polarDegrees),
    true,
  );
}

/**
 * Set the zoom band and the readout's anchor for a framing, WITHOUT moving the camera.
 *
 * `getDistanceToFitSphere` is public and is the exact call `fitToSphere` makes internally, so this
 * knows the destination distance immediately rather than after the transition has played. Reading
 * `controls.distance` back instead would be a frame behind at best and a whole animation behind at
 * worst, which is what made the readout report 74% on a view nobody had zoomed.
 */
function applyFraming(
  controls: CameraControls,
  effectiveRadius: number,
  framing: CameraFraming,
): void {
  const fittedDistance = controls.getDistanceToFitSphere(effectiveRadius);
  controls.minDistance = fittedDistance * ZOOM_IN_LIMIT_FRACTION;
  controls.maxDistance = fittedDistance * ZOOM_OUT_LIMIT_MULTIPLE;
  framing.framedRadius = effectiveRadius;
  framing.fittedDistance = fittedDistance;
}

/**
 * THE ONLY PLACE A FIT HAPPENS. Padding, HUD clearance, the zoom band and the readout anchor all
 * follow from the same sphere, so they cannot drift apart the way they did when the band was a
 * prop and the anchor was captured once at load.
 *
 * ⚠️ THE BAND IS SET BEFORE THE FIT, and the order is load-bearing: `fitToSphere` dollies through
 * `dollyTo`, which clamps to `[minDistance, maxDistance]`. Set the band afterwards and a stale
 * band clamps the very fit that is meant to define it.
 */
function frameSphere(
  controls: CameraControls,
  sphere: Sphere,
  isAnimated: boolean,
  framing: CameraFraming,
): void {
  const effectiveRadius = sphere.radius * (1 + FIT_HEADROOM_FRACTION);
  applyFraming(controls, effectiveRadius, framing);
  void controls.fitToSphere(new Sphere(sphere.center.clone(), effectiveRadius), isAnimated);
}

/** Frame the closed or the exploded bounds. Module-level: no closure over component props. */
function fitWholeAssembly(
  controls: CameraControls,
  loadedAssembly: LoadedTeardownAssembly,
  isExploded: boolean,
  isAnimated: boolean,
  framing: CameraFraming,
): void {
  frameSphere(
    controls,
    isExploded ? loadedAssembly.explodedBoundingSphere : loadedAssembly.boundingSphere,
    isAnimated,
    framing,
  );
}

/** Frame one part where it currently sits — exploded or not. */
function fitPart(
  controls: CameraControls,
  partObject: Object3D,
  minimumRadius: number,
  isAnimated: boolean,
  framing: CameraFraming,
): void {
  const partSphere = new Box3().setFromObject(partObject, true).getBoundingSphere(new Sphere());
  partSphere.radius = Math.max(partSphere.radius, minimumRadius);
  // Through `frameSphere` like every other fit, so a framed part clears the slider and the tool
  // rail too — it used to skip the headroom and the centre drop and sit under the chrome.
  frameSphere(controls, partSphere, isAnimated, framing);
}

export default function CameraRig({ store, loadedAssembly }: CameraRigProps) {
  const controlsRef = useRef<CameraControls>(null);
  const framingRef = useRef<CameraFraming>({ framedRadius: null, fittedDistance: null });
  const { selectedPartId, viewResetCount, isAssemblyCollapsed, cameraCommand } =
    useExplosionSnapshot(store);
  const radius = loadedAssembly.boundingSphere.radius;
  // ASPECT, NOT SIZE, and that is the precise dependency rather than a convenient one:
  // `getDistanceToFitSphere` picks the vertical or horizontal field of view by comparing the
  // aspect against 1 and uses nothing else about the viewport, so a resize that preserves the
  // shape does not move the fit distance and should not re-derive anything.
  const viewportAspect = useThree((state) => state.size.width / Math.max(1, state.size.height));

  // The home view: frame the closed assembly once, without a transition, and remember it.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    fitWholeAssembly(controls, loadedAssembly, false, false, framingRef.current);
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
      fitWholeAssembly(controls, loadedAssembly, !isAssemblyCollapsed, true, framingRef.current);
      return;
    }
    fitPart(
      controls,
      selectedPart.object,
      radius * PART_FIT_MINIMUM_RADIUS_FRACTION,
      true,
      framingRef.current,
    );
  }, [selectedPartId, isAssemblyCollapsed, loadedAssembly, radius]);

  useEffect(() => {
    if (viewResetCount === 0) return;
    const controls = controlsRef.current;
    if (controls === null) return;
    void controls.reset(true);
    // `reset` restores the saved state, which is the closed-assembly fit — so the bookkeeping is
    // pointed back at that framing too. Without this the band and the readout would keep
    // describing whatever was framed a moment ago until the next fit happened to correct them.
    applyFraming(controls, radius * (1 + FIT_HEADROOM_FRACTION), framingRef.current);
  }, [viewResetCount, radius]);

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

  // A resize changes the aspect and therefore the distance this framing SHOULD sit at. Re-derive
  // the band and the anchor from the radius already on screen rather than re-fitting, so entering
  // fullscreen keeps the readout honest without yanking back a zoom the reader chose.
  useEffect(() => {
    const controls = controlsRef.current;
    const { framedRadius } = framingRef.current;
    if (controls === null || framedRadius === null || viewportAspect <= 0) return;
    applyFraming(controls, framedRadius, framingRef.current);
  }, [viewportAspect]);

  // EVERY LIBRARY ROUTE THAT WOULD SWALLOW A SCROLL, OFF. Imperative for the same reason the zoom
  // band is: this component re-renders on every hover and selection, and R3F would reapply the
  // prop over whatever the live value had become. `mouseButtons.wheel` covers the wheel and the
  // trackpad pinch — both arrive at the same handler — and `touches.*` covers the rest, though on
  // its own it is not enough for touch; see the hook.
  useEffect(() => {
    const controls = controlsRef.current;
    if (controls === null) return;
    controls.mouseButtons.wheel = CameraControlsImpl.ACTION.NONE;
    controls.touches.one = CameraControlsImpl.ACTION.NONE;
    controls.touches.two = CameraControlsImpl.ACTION.NONE;
    controls.touches.three = CameraControlsImpl.ACTION.NONE;
  }, []);

  useCameraGestures({ controlsRef });

  // The readout is a percentage of the distance the CURRENT framing was fitted at, published from
  // inside the loop because that is where the live distance is. `publishZoomPercent` rounds and
  // drops no-ops, so an orbit — which does not change distance — costs nothing.
  useFrame(() => {
    const controls = controlsRef.current;
    const { fittedDistance } = framingRef.current;
    if (controls === null || fittedDistance === null) return;
    store.publishZoomPercent((fittedDistance / controls.distance) * 100);
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      smoothTime={0.35}
      draggingSmoothTime={0.08}
      // NO `minDistance`/`maxDistance` PROPS. The band is owned imperatively by `applyFraming`,
      // and this component re-renders on every hover and selection — R3F would reapply a stale
      // prop over the live value each time.
      //
      // `camera.zoom` IS LOCKED AT 1. Distance is the only zoom verb in this viewer — the readout
      // and the band both describe distance — and every zoom input is re-issued as a dolly by
      // `useCameraGestures`, so this guarantees nothing reaches `camera.zoom` by another door.
      minZoom={1}
      maxZoom={1}
      // NO `dollyToCursor`. It walks the orbit pivot toward the pointer on every scroll-wheel
      // zoom, so zooming near an edge moves the model sideways — the same "it moved" as the
      // lowered pivot, from a different input. The trade is honest: zoom-toward-the-corner is a
      // CAD convention that is gone; clicking a part is how this viewer looks closely at something.
    />
  );
}
