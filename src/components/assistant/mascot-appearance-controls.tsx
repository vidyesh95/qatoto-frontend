// TRANSPORT: props-only — renders two browser preferences.
"use client";

// THE MASCOT'S SIZE AND SPEED CHOICES, rendered in two places: the assistant's own panel ("How it
// looks and moves") and the account menu's AI Assist panel. One component, so the two can never
// offer different choices.
//
// This file is the ONE assistant component a product surface may import (AGENTS.md §AI Assist
// Mode): it carries no Pixi and no chat code, only two radio groups over `mascot-display.ts`.

import { useSyncExternalStore } from "react";

import PillRadioGroup from "@/components/ui/pill-radio-group";
import { MASCOT_SIZE_LABELS, MASCOT_SPEED_LABELS } from "@/lib/assistant/mascot-display";
import {
  MASCOT_SIZES,
  MASCOT_SPEEDS,
  type MascotSize,
  type MascotSpeed,
} from "@/lib/browser-preferences";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  reducedMotionQuery.addEventListener("change", onChange);
  return () => {
    reducedMotionQuery.removeEventListener("change", onChange);
  };
}

function readIsReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function readIsReducedMotionOnServer(): boolean {
  return false;
}

/**
 * Size and speed. Speed changes how lively the mascot is, not how long it points or reacts, so a
 * message stays readable. `idPrefix` keeps the radio names unique when both copies are on screen.
 */
export default function MascotAppearanceControls({
  idPrefix,
  mascotSize,
  mascotSpeed,
  onMascotSizeChange,
  onMascotSpeedChange,
}: {
  readonly idPrefix: string;
  readonly mascotSize: MascotSize;
  readonly mascotSpeed: MascotSpeed;
  readonly onMascotSizeChange: (mascotSize: MascotSize) => void;
  readonly onMascotSpeedChange: (mascotSpeed: MascotSpeed) => void;
}) {
  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    readIsReducedMotion,
    readIsReducedMotionOnServer,
  );

  return (
    <div className="space-y-3">
      <PillRadioGroup
        legend="Size"
        groupName={`${idPrefix}-mascot-size`}
        values={MASCOT_SIZES}
        labels={MASCOT_SIZE_LABELS}
        selectedValue={mascotSize}
        onSelect={onMascotSizeChange}
      />
      <PillRadioGroup
        legend="Speed"
        groupName={`${idPrefix}-mascot-speed`}
        values={MASCOT_SPEEDS}
        labels={MASCOT_SPEED_LABELS}
        selectedValue={mascotSpeed}
        onSelect={onMascotSpeedChange}
        note={
          isReducedMotion
            ? "Your device asks for reduced motion, so it holds still at any speed."
            : null
        }
      />
    </div>
  );
}
