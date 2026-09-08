// TRANSPORT: props-only — the bottom-left camera menu. Publishes a preset into the store; the
// camera rig inside the canvas is what acts on it.

"use client";

import { useEffect, useRef, useState } from "react";

import type { ExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";
import {
  DEFAULT_TEARDOWN_CAMERA_PRESET,
  TEARDOWN_CAMERA_PRESET_LABELS,
  TEARDOWN_CAMERA_PRESETS,
  type TeardownCameraPreset,
} from "@/lib/blueprints/camera-presets";

export interface CameraPresetMenuProps {
  readonly store: ExplosionStore;
  readonly isInteractive: boolean;
}

/**
 * THE CHECKED PRESET IS THE ONE LAST ASKED FOR, not the angle the camera is at. Once a preset is
 * applied the reader can orbit away from it freely, and chasing that with a live comparison would
 * make the tick flicker off on the first drag. It is a menu of destinations, not a readout.
 */
export default function CameraPresetMenu({ store, isInteractive }: CameraPresetMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestedPreset, setRequestedPreset] = useState<TeardownCameraPreset>(
    DEFAULT_TEARDOWN_CAMERA_PRESET,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: PointerEvent): void {
      const container = containerRef.current;
      if (container !== null && event.target instanceof Node && !container.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handlePresetClick(preset: TeardownCameraPreset): void {
    setRequestedPreset(preset);
    setIsOpen(false);
    store.requestCameraPreset(preset);
  }

  return (
    <div ref={containerRef} className="pointer-events-auto relative">
      {isOpen ? (
        <ul
          role="menu"
          aria-label="Camera view"
          className="absolute bottom-full left-0 mb-1.5 min-w-44 rounded-xl border border-black/10 bg-white p-1 shadow-lg"
        >
          {TEARDOWN_CAMERA_PRESETS.map((preset) => (
            <li key={preset}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={preset === requestedPreset}
                onClick={() => handlePresetClick(preset)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <span aria-hidden className="w-3 text-[#00696E]">
                  {preset === requestedPreset ? "✓" : ""}
                </span>
                {TEARDOWN_CAMERA_PRESET_LABELS[preset]}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={!isInteractive}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white/85 px-2.5 py-1.5 text-xs text-foreground backdrop-blur transition-colors hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {TEARDOWN_CAMERA_PRESET_LABELS[requestedPreset]}
        <span aria-hidden className="text-[#6F7979]">
          ⌄
        </span>
      </button>
    </div>
  );
}
