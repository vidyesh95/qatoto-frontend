// TRANSPORT: props-only — the explosion scrubber under the stage, on the Exploded tab only.

"use client";

import { type FormEvent, useEffect, useRef } from "react";

import type { ExplosionStore } from "@/components/home/blueprints/teardowns/engine/explosion-store";

export interface ExplosionSliderProps {
  readonly store: ExplosionStore;
  readonly isInteractive: boolean;
  /** Entering the tab opens the assembly, so the thumb has to start where the model already is. */
  readonly initialFactor: number;
}

function formatPercentLabel(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

/**
 * UNCONTROLLED, AND REACT-FREE ON DRAG. `onInput` writes the store's mutable motion field and
 * updates the `<output>` through a ref; no state changes, so nothing re-renders while the thumb
 * moves and the frame loop keeps the whole budget. This is the single most important line in the
 * viewer's performance story.
 */
export default function ExplosionSlider({
  store,
  isInteractive,
  initialFactor,
}: ExplosionSliderProps) {
  const sliderRef = useRef<HTMLInputElement>(null);
  const percentOutputRef = useRef<HTMLOutputElement>(null);

  // The tab, not the slider, decides the opening factor — so the thumb follows the model rather
  // than the other way round.
  useEffect(() => {
    const slider = sliderRef.current;
    if (slider !== null) slider.value = String(initialFactor);
    const percentOutput = percentOutputRef.current;
    if (percentOutput !== null) percentOutput.textContent = formatPercentLabel(initialFactor);
  }, [initialFactor]);

  function handleExplosionSliderInput(event: FormEvent<HTMLInputElement>): void {
    const factor = event.currentTarget.valueAsNumber;
    store.setTargetFactor(factor);
    const percentOutput = percentOutputRef.current;
    if (percentOutput !== null) percentOutput.textContent = formatPercentLabel(factor);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#CAC4D0]/60 bg-card px-3 py-2.5">
      <label
        htmlFor="teardown-explosion-slider"
        className="font-mono text-[10px] tracking-[0.12em] text-[#6F7979] uppercase"
      >
        Explode
      </label>
      <input
        ref={sliderRef}
        id="teardown-explosion-slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        defaultValue={initialFactor}
        disabled={!isInteractive}
        onInput={handleExplosionSliderInput}
        aria-label="Explosion amount"
        className="h-1.5 w-full cursor-pointer accent-[#FF5500] disabled:cursor-not-allowed"
      />
      <output
        ref={percentOutputRef}
        htmlFor="teardown-explosion-slider"
        className="w-10 text-right font-mono text-[11px] text-foreground tabular-nums"
      >
        {formatPercentLabel(initialFactor)}
      </output>
    </div>
  );
}
