// TRANSPORT: props-only — fetches the app's own static atlas; no API calls.
"use client";

// THE CANVAS, AND THE ONLY PLACE PIXI IS LOADED.
//
// One fixed, full-viewport, transparent canvas that never takes a pointer event and is hidden from
// assistive technology: the character is ornament. Everything a person can act on (the open button,
// the speech bubble) is real DOM in `assistant-root.tsx`, positioned over the drawing.
//
// `loadMascotStageResources()` caches both the static atlas JSON and the PixiJS chunk in memory:
// the chunk is requested the first time AI Assist Mode is on, and never on a page where it is off.
//
// IF ANYTHING HERE FAILS — no WebGL, an atlas that breaks the contract, an image that 404s — the
// stage reports `unavailable` and the root shows one static frame instead. A failure is a state the
// parent renders, not an exception it has to catch.

import { useEffect, useEffectEvent, useRef, type RefObject } from "react";

import {
  createMascotController,
  type MascotController,
} from "@/components/assistant/mascot-controller";
import { loadMascotStageResources } from "@/components/assistant/mascot-stage-loader";
import type { MascotDockSide, MascotSize, MascotSpeed } from "@/lib/browser-preferences";

export type MascotStageStatus =
  | { readonly status: "loading" }
  | { readonly status: "ready" }
  | { readonly status: "unavailable" };

export default function MascotStage({
  mascotBoxRef,
  controllerRef,
  initialDockSide,
  initialSize,
  initialSpeed,
  onStatusChange,
}: {
  readonly mascotBoxRef: RefObject<HTMLDivElement | null>;
  /** Read once, at mount. Later changes go through `controller.setDockSide`. */
  readonly initialDockSide: MascotDockSide;
  /** Read once, at mount, like the dock side. Later changes go through `controller.setAppearance`. */
  readonly initialSize: MascotSize;
  readonly initialSpeed: MascotSpeed;
  /** Filled while the stage is ready, emptied on unmount. The root drives the mascot through it. */
  readonly controllerRef: RefObject<MascotController | null>;
  readonly onStatusChange: (stageStatus: MascotStageStatus) => void;
}) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const reportStatus = useEffectEvent((stageStatus: MascotStageStatus) => {
    onStatusChange(stageStatus);
  });
  const readInitialAppearance = useEffectEvent(() => ({
    initialDockSide,
    initialSize,
    initialSpeed,
  }));

  useEffect(() => {
    const canvasHost = canvasHostRef.current;
    const mascotBox = mascotBoxRef.current;
    if (canvasHost === null || mascotBox === null) return undefined;

    let isCancelled = false;
    let mountedController: MascotController | null = null;

    const mountStage = async () => {
      try {
        const resources = await loadMascotStageResources();
        if (resources === null) {
          if (!isCancelled) reportStatus({ status: "unavailable" });
          return;
        }

        if (isCancelled) return;
        const createdController = await createMascotController({
          pixi: resources.pixi,
          atlas: resources.atlas,
          canvasHost,
          mascotBox,
          ...readInitialAppearance(),
        });
        if (isCancelled) {
          createdController.destroy();
          return;
        }
        mountedController = createdController;
        controllerRef.current = createdController;
        reportStatus({ status: "ready" });
      } catch {
        if (!isCancelled) reportStatus({ status: "unavailable" });
      }
    };
    void mountStage();

    return () => {
      isCancelled = true;
      mountedController?.destroy();
      controllerRef.current = null;
    };
  }, [mascotBoxRef, controllerRef]);

  return (
    <div
      ref={canvasHostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    />
  );
}
