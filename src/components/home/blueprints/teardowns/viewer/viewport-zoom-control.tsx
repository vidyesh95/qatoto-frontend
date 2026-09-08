// TRANSPORT: props-only — the bottom-right zoom readout and fullscreen toggle.

"use client";

import { type RefObject, useEffect, useState } from "react";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";

export interface ViewportZoomControlProps {
  readonly store: ExplosionStore;
  readonly isInteractive: boolean;
  /** The element that goes fullscreen — the stage, so the overlays travel with the canvas. */
  readonly stageRef: RefObject<HTMLElement | null>;
}

const CONTROL_BUTTON_CLASS =
  "grid size-7 cursor-pointer place-items-center rounded-md text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The percentage is published by the camera rig — it is the fitted distance over the current one,
 * so 100% is "framed as it first loaded" rather than any absolute scale.
 *
 * FULLSCREEN IS THE ANSWER TO A CONSTRAINT, not a flourish: every page in this route group renders
 * inside `<main>` beside the sidebar and under the navbar, so the stage can fill its column but
 * never the window. This is the escape hatch, and it copies the store viewer's pattern —
 * `fullscreenEnabled` read in an effect (never during render, this island has server HTML) and the
 * live state tracked from the `fullscreenchange` event rather than assumed from the click.
 */
export default function ViewportZoomControl({
  store,
  isInteractive,
  stageRef,
}: ViewportZoomControlProps) {
  const { zoomPercent } = useExplosionSnapshot(store);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // `fullscreenEnabled` cannot be read in a state initialiser — this island has server HTML, and
  // the server has no `document` — so it is read on the frame after mount rather than synchronously
  // inside the effect, which would cascade a second render on every mount.
  useEffect(() => {
    const frameHandle = requestAnimationFrame(() => setCanFullscreen(document.fullscreenEnabled));
    function handleFullscreenChange(): void {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      cancelAnimationFrame(frameHandle);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [stageRef]);

  function handleFullscreenToggleClick(): void {
    const stage = stageRef.current;
    if (stage === null) return;
    if (document.fullscreenElement === stage) {
      void document.exitFullscreen();
      return;
    }
    void stage.requestFullscreen();
  }

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-black/10 bg-white/85 px-1 py-1 backdrop-blur">
      <button
        type="button"
        aria-label="Zoom out"
        disabled={!isInteractive}
        onClick={() => store.requestDolly(-1)}
        className={CONTROL_BUTTON_CLASS}
      >
        <span aria-hidden>−</span>
      </button>
      <output className="w-11 text-center font-mono text-[11px] text-foreground tabular-nums">
        {zoomPercent}%
      </output>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={!isInteractive}
        onClick={() => store.requestDolly(1)}
        className={CONTROL_BUTTON_CLASS}
      >
        <span aria-hidden>+</span>
      </button>
      {canFullscreen ? (
        <button
          type="button"
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          disabled={!isInteractive}
          onClick={handleFullscreenToggleClick}
          className={`${CONTROL_BUTTON_CLASS} border-l border-black/10`}
        >
          <span aria-hidden className="text-sm">
            {isFullscreen ? "⤡" : "⤢"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
