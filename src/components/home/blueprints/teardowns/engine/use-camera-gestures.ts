// TRANSPORT: props-only — every wheel and touch the viewer acts on, routed by hand.
//
// WHY BY HAND, AND NOT THROUGH camera-controls' OWN `mouseButtons`/`touches` MAP: the library
// decides what an input means, but not whether the DOCUMENT gets a look in first, and on both
// routes it takes the event before the browser can scroll.
//
//  - `onMouseWheel` calls `preventDefault()` for every wheel over its element, so scrolling down
//    the article dollied the model instead of moving the page. Setting `mouseButtons.wheel` to
//    `ACTION.NONE` is enough to stop that — the handler returns BEFORE `preventDefault()` on that
//    check — but it also switches off the trackpad pinch, which reaches the same handler as a
//    wheel with `ctrlKey` set. Both come back through `handleWheelCapture` below.
//  - `onPointerDown` attaches a document `pointermove` that calls `preventDefault()` on every
//    cancelable move, and it does so BEFORE consulting `touches.*`. So zeroing `touches.one` does
//    NOT give a phone its scroll back: the first move is still cancelled and the browser never
//    starts scrolling. What does work is `enabled`, which is documented as "disable user
//    dragging/touch-move, but all methods work" — it is switched off for the duration of a touch
//    and the two-finger gesture is driven through those methods instead. The other half of that
//    fix is the `touch-pan-y!` class on the `<Canvas>`: `enabled` writes `touch-action` inline on
//    the wrapper every time it flips, and only `!important` outlasts it.
//
// The listeners sit on the CANVAS while camera-controls listens on the wrapper div R3F connects
// its events to, so anything here runs first by position rather than by registration order.

import type { CameraControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { type RefObject, useEffect } from "react";

import { VIEWER_GESTURE_TOUCH_COUNT, isZoomModifierHeld } from "@/lib/blueprints/viewer-gestures";

export interface CameraGestureProps {
  readonly controlsRef: RefObject<CameraControls | null>;
}

/**
 * This divisor reproduces the per-tick curve camera-controls applies to a wheel on macOS
 * (`0.95 ^ (deltaY / 10)`), so a pinch feels the way it did when the library owned it.
 */
const ZOOM_TICK_DIVISOR = 10;
/**
 * Ticks closer together than this belong to one gesture. A pinch delivers dozens of events in well
 * under a second while the camera is still gliding toward the previous tick's target, so each tick
 * must compound from the TARGET distance, not from wherever the animation has got to — compounding
 * from the lagging live value made forty pinch-out ticks stall at 55% instead of reaching the 33%
 * floor. camera-controls' own wheel path compounds from its end value for the same reason; that
 * value is private, so the gesture's running target is kept here.
 */
const ZOOM_GESTURE_GAP_MS = 400;
/**
 * A MOUSE NOTCH IS NOT A PINCH TICK, and one curve has to serve both. A pinch arrives as deltas of
 * one to ten pixels; a wheel notch is a single `deltaY` of 100, which through the curve above is a
 * 66% jump per click. Clamping the magnitude first lands a notch at ~16.6% — one press of the
 * on-screen zoom button — and leaves every pinch tick untouched, because they are all well under it.
 */
const MAX_ZOOM_TICK_PIXELS = 30;
/** `WheelEvent.deltaMode` values, and what a unit of each is worth in pixels. */
const WHEEL_DELTA_MODE_LINE = 1;
const WHEEL_DELTA_MODE_PAGE = 2;
const WHEEL_LINE_HEIGHT_PIXELS = 16;
const WHEEL_PAGE_HEIGHT_PIXELS = 400;
interface TouchPoint {
  readonly x: number;
  readonly y: number;
}

function normalizeWheelDeltaPixels(event: WheelEvent): number {
  const deltaInPixels =
    event.deltaMode === WHEEL_DELTA_MODE_LINE
      ? event.deltaY * WHEEL_LINE_HEIGHT_PIXELS
      : event.deltaMode === WHEEL_DELTA_MODE_PAGE
        ? event.deltaY * WHEEL_PAGE_HEIGHT_PIXELS
        : event.deltaY;
  return Math.max(-MAX_ZOOM_TICK_PIXELS, Math.min(MAX_ZOOM_TICK_PIXELS, deltaInPixels));
}

/** How far apart the first two fingers are, in CSS pixels. */
function measureTouchSpreadPixels(touches: TouchList): number {
  const [firstTouch, secondTouch] = [touches[0], touches[1]];
  if (firstTouch === undefined || secondTouch === undefined) return 0;
  return Math.hypot(
    secondTouch.clientX - firstTouch.clientX,
    secondTouch.clientY - firstTouch.clientY,
  );
}

/** The midpoint of the first two fingers — the point a two-finger drag orbits by. */
function measureTouchCentroid(touches: TouchList): TouchPoint | null {
  const [firstTouch, secondTouch] = [touches[0], touches[1]];
  if (firstTouch === undefined || secondTouch === undefined) return null;
  return {
    x: (firstTouch.clientX + secondTouch.clientX) / 2,
    y: (firstTouch.clientY + secondTouch.clientY) / 2,
  };
}

export function useCameraGestures({ controlsRef }: CameraGestureProps): void {
  // THE CANVAS IS READ HERE RATHER THAN PASSED IN. It is the element every listener below belongs
  // on, and taking it from R3F keeps it out of the hook's arguments — the styles and the flags this
  // sets are mutations of an external system, which is exactly what a hook argument may not be.
  const canvasElement = useThree((state) => state.gl.domElement);

  useEffect(() => {
    let zoomTargetDistance: number | null = null;
    let lastZoomTickAt = 0;
    let previousTouchSpreadPixels: number | null = null;
    let previousTouchCentroid: TouchPoint | null = null;
    let activeTouchPointerCount = 0;

    /**
     * ONE ZOOM PATH FOR EVERY INPUT — modifier wheel, trackpad pinch and two-finger pinch. The
     * band (`minDistance`/`maxDistance`) is owned by the camera rig's framing, and clamping here as
     * well as inside `dollyTo` keeps the running target from wandering past it and then needing
     * several ticks to come back.
     */
    function applyZoomScale(controls: CameraControls, zoomScale: number, tickAt: number): void {
      const baseDistance =
        zoomTargetDistance === null || tickAt - lastZoomTickAt > ZOOM_GESTURE_GAP_MS
          ? controls.distance
          : zoomTargetDistance;
      zoomTargetDistance = Math.min(
        controls.maxDistance,
        Math.max(controls.minDistance, baseDistance * zoomScale),
      );
      lastZoomTickAt = tickAt;
      void controls.dollyTo(zoomTargetDistance, true);
    }

    function handleWheelCapture(event: WheelEvent): void {
      const controls = controlsRef.current;
      // NO MODIFIER, NO INTERCEPTION — and the event is left completely alone, not merely ignored:
      // the page scroll depends on nobody having called `preventDefault()` on it.
      if (controls === null || !isZoomModifierHeld(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const zoomScale = Math.pow(0.95, -normalizeWheelDeltaPixels(event) / ZOOM_TICK_DIVISOR);
      applyZoomScale(controls, zoomScale, event.timeStamp);
    }

    function resetTouchGesture(): void {
      previousTouchSpreadPixels = null;
      previousTouchCentroid = null;
    }

    // A touch belongs to the document until a second finger says otherwise, so camera-controls is
    // switched off for the whole touch rather than per-move — by the time its `pointerdown` runs,
    // the decision has to have been made.
    function handleTouchPointerDownCapture(event: PointerEvent): void {
      if (event.pointerType !== "touch") return;
      activeTouchPointerCount += 1;
      const controls = controlsRef.current;
      if (controls === null || !controls.enabled) return;
      controls.enabled = false;
    }

    function handleTouchPointerUpCapture(event: PointerEvent): void {
      if (event.pointerType !== "touch") return;
      activeTouchPointerCount = Math.max(0, activeTouchPointerCount - 1);
      if (activeTouchPointerCount > 0) return;
      resetTouchGesture();
      const controls = controlsRef.current;
      if (controls === null || controls.enabled) return;
      controls.enabled = true;
    }

    function handleTouchStart(event: TouchEvent): void {
      if (event.touches.length < VIEWER_GESTURE_TOUCH_COUNT) {
        resetTouchGesture();
        return;
      }
      if (event.cancelable) event.preventDefault();
      previousTouchSpreadPixels = measureTouchSpreadPixels(event.touches);
      previousTouchCentroid = measureTouchCentroid(event.touches);
    }

    function handleTouchMove(event: TouchEvent): void {
      const controls = controlsRef.current;
      if (controls === null || event.touches.length < VIEWER_GESTURE_TOUCH_COUNT) {
        resetTouchGesture();
        return;
      }
      // A move the browser will not let us cancel is a SCROLL ALREADY UNDER WAY — a second finger
      // landing part-way down a one-finger swipe. Driving the camera from it would move the model
      // while the page slides, so the gesture is dropped and starts again on the next clean touch.
      if (!event.cancelable) {
        resetTouchGesture();
        return;
      }
      event.preventDefault();

      const touchSpreadPixels = measureTouchSpreadPixels(event.touches);
      const touchCentroid = measureTouchCentroid(event.touches);
      if (
        previousTouchSpreadPixels !== null &&
        previousTouchSpreadPixels > 0 &&
        touchSpreadPixels > 0
      ) {
        // Fingers spreading means a smaller camera distance, hence previous over current.
        applyZoomScale(controls, previousTouchSpreadPixels / touchSpreadPixels, event.timeStamp);
      }
      if (previousTouchCentroid !== null && touchCentroid !== null) {
        // The library's own drag conversion: a full canvas height is one full turn.
        const rotationRadiansPerPixel = (2 * Math.PI) / Math.max(1, canvasElement.clientHeight);
        void controls.rotate(
          -(touchCentroid.x - previousTouchCentroid.x) * rotationRadiansPerPixel,
          -(touchCentroid.y - previousTouchCentroid.y) * rotationRadiansPerPixel,
          true,
        );
      }
      previousTouchSpreadPixels = touchSpreadPixels;
      previousTouchCentroid = touchCentroid;
    }

    function handleTouchEnd(): void {
      resetTouchGesture();
    }

    canvasElement.addEventListener("wheel", handleWheelCapture, { capture: true, passive: false });
    canvasElement.addEventListener("pointerdown", handleTouchPointerDownCapture, { capture: true });
    canvasElement.addEventListener("pointerup", handleTouchPointerUpCapture, { capture: true });
    canvasElement.addEventListener("pointercancel", handleTouchPointerUpCapture, { capture: true });
    canvasElement.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvasElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvasElement.addEventListener("touchend", handleTouchEnd);
    canvasElement.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      canvasElement.removeEventListener("wheel", handleWheelCapture, { capture: true });
      canvasElement.removeEventListener("pointerdown", handleTouchPointerDownCapture, {
        capture: true,
      });
      canvasElement.removeEventListener("pointerup", handleTouchPointerUpCapture, {
        capture: true,
      });
      canvasElement.removeEventListener("pointercancel", handleTouchPointerUpCapture, {
        capture: true,
      });
      canvasElement.removeEventListener("touchstart", handleTouchStart);
      canvasElement.removeEventListener("touchmove", handleTouchMove);
      canvasElement.removeEventListener("touchend", handleTouchEnd);
      canvasElement.removeEventListener("touchcancel", handleTouchEnd);
      // Nothing to restore on the controls: this effect and the `CameraControls` instance are torn
      // down together with the canvas, so a viewport unmounting mid-touch takes the flag with it.
    };
  }, [canvasElement, controlsRef]);
}
