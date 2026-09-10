// TRANSPORT: props-only — the transient overlay that names the gesture the viewer just declined.

"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import { VIEWER_GESTURE_TOUCH_COUNT, isZoomModifierHeld } from "@/lib/blueprints/viewer-gestures";

export interface ViewportGestureHintProps {
  readonly stageRef: RefObject<HTMLElement | null>;
  readonly isInteractive: boolean;
}

/** The gestures this viewer hands back to the document, and therefore the two things to explain. */
type RefusedGestureKind = "wheel" | "touch";

/**
 * `lastRefusedGesture` is carried through the hidden state so the copy survives the fade. Dropping
 * it on hide made the panel empty the instant the timer fired and the fade played on nothing.
 */
type GestureHintState =
  | { readonly status: "hidden"; readonly lastRefusedGesture: RefusedGestureKind | null }
  | { readonly status: "visible"; readonly refusedGesture: RefusedGestureKind };

const HINT_VISIBLE_MS = 1500;

function formatGestureHintLabel(
  refusedGesture: RefusedGestureKind,
  isApplePlatform: boolean,
): string {
  switch (refusedGesture) {
    case "wheel":
      return isApplePlatform ? "⌘ + scroll to zoom" : "Ctrl + scroll to zoom";
    case "touch":
      return "Use two fingers to move the model";
    default: {
      const exhaustiveCheck: never = refusedGesture;
      return exhaustiveCheck;
    }
  }
}

/**
 * WHY AN OVERLAY AND NOT JUST THE CAPTION UNDER THE VIEWER: the zoom that used to happen on a bare
 * scroll now needs a modifier, and a reader who scrolls and gets nothing has no way to learn that
 * from the stage itself. This is the same answer a map embed gives, for the same reason.
 *
 * IT LISTENS ON THE STAGE, NOT THE CANVAS, so it also speaks before the engine has loaded — and the
 * listeners are PASSIVE, which is a guarantee rather than a preference: a hint that could cancel a
 * scroll would be the bug it exists to explain. The engine's own handler stops propagation on the
 * wheels it acts on, so a real zoom never reaches this.
 *
 * `aria-hidden`, deliberately. It fires whenever anyone scrolls past the stage, which as a live
 * region would be a screen reader announcing a mouse convention over and over; the labelled zoom
 * buttons beside it are the accessible path and they never moved.
 */
export default function ViewportGestureHint({ stageRef, isInteractive }: ViewportGestureHintProps) {
  const [hintState, setHintState] = useState<GestureHintState>({
    status: "hidden",
    lastRefusedGesture: null,
  });
  // Read in an effect, never during render: this island has server HTML and the server has no
  // `navigator` — the same rule `viewport-zoom-control.tsx` records for `fullscreenEnabled`.
  const [isApplePlatform, setIsApplePlatform] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On the frame after mount rather than synchronously, which would cascade a second render on
  // every mount — `viewport-zoom-control.tsx` reads `fullscreenEnabled` the same way.
  useEffect(() => {
    const frameHandle = requestAnimationFrame(() => {
      setIsApplePlatform(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
    });
    return () => cancelAnimationFrame(frameHandle);
  }, []);

  useEffect(() => {
    const stageElement = stageRef.current;
    if (stageElement === null || !isInteractive) return undefined;

    function showHint(refusedGesture: RefusedGestureKind): void {
      setHintState({ status: "visible", refusedGesture });
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setHintState({ status: "hidden", lastRefusedGesture: refusedGesture });
      }, HINT_VISIBLE_MS);
    }

    function handleStageWheel(event: WheelEvent): void {
      if (isZoomModifierHeld(event)) return;
      showHint("wheel");
    }

    function handleStageTouchMove(event: TouchEvent): void {
      if (event.touches.length >= VIEWER_GESTURE_TOUCH_COUNT) return;
      showHint("touch");
    }

    stageElement.addEventListener("wheel", handleStageWheel, { passive: true });
    stageElement.addEventListener("touchmove", handleStageTouchMove, { passive: true });
    return () => {
      stageElement.removeEventListener("wheel", handleStageWheel);
      stageElement.removeEventListener("touchmove", handleStageTouchMove);
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, [stageRef, isInteractive]);

  const shownGesture =
    hintState.status === "visible" ? hintState.refusedGesture : hintState.lastRefusedGesture;
  if (shownGesture === null) return null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-10 grid place-items-center transition-opacity duration-300 ${
        hintState.status === "visible" ? "opacity-100" : "opacity-0"
      }`}
    >
      <span className="rounded-lg bg-black/65 px-3 py-2 text-sm font-medium text-white backdrop-blur">
        {formatGestureHintLabel(shownGesture, isApplePlatform)}
      </span>
    </div>
  );
}
