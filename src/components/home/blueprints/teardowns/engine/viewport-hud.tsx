// TRANSPORT: props-only — the DOM chrome over and under the canvas. Reads the store's snapshot for
// the toggles and the part panel; writes the slider straight into the store's motion fields.
//
// THE SLIDER IS UNCONTROLLED AND REACT-FREE ON DRAG. `onInput` writes `store.setTargetFactor` and
// updates the percentage `<output>` through a ref; no state changes, so nothing re-renders while
// the thumb moves. That is the whole reason the exploded view stays at frame rate under a drag.
//
// DARK ON PURPOSE, AND ONLY HERE. The viewport and its instruments are the one dark surface on a
// light page — the same way a video player is — so the palette below is literal hex, not the
// site's theme tokens, and nothing outside this file and the canvas uses it.

"use client";

import Image from "next/image";
import { type FormEvent, useRef } from "react";

import {
  type ExplosionStore,
  useExplosionSnapshot,
} from "@/components/home/blueprints/teardowns/engine/explosion-store";
import {
  type FactorOfSafetyBand,
  formatTelemetryQuantity,
  manufacturingMethodLabel,
  resolveFactorOfSafetyBand,
} from "@/lib/blueprints/format";
import type { TeardownAssembly, TeardownSimulationTelemetry } from "@/lib/blueprints/schemas";
import { NOT_SIMULATED_HEX, SPECTRAL_STRESS_STOP_HEXES } from "@/lib/blueprints/stress-ramp";

export interface ViewportHudProps {
  readonly store: ExplosionStore;
  readonly assembly: TeardownAssembly;
  /** `false` until the engine and the model are ready — the controls render disabled until then. */
  readonly isInteractive: boolean;
  readonly missingNodeNames: readonly string[];
}

const XRAY_ICON_SOURCE = "/icons/visibility_off_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg";
const RESET_ICON_SOURCE = "/icons/restart_alt_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg";

const PANEL_CLASS = "rounded-lg border border-white/10 bg-[#0F1115]/85 backdrop-blur";
const LABEL_CLASS = "font-mono text-[10px] tracking-[0.12em] text-[#9AA3AD] uppercase";
const TOGGLE_BASE_CLASS =
  "pointer-events-auto flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const TOGGLE_OFF_CLASS = "border-white/15 bg-[#0F1115]/85 text-white hover:border-white/40";
const TOGGLE_ON_CLASS = "border-[#FF5500] bg-[#FF5500]/15 text-[#FF5500]";

const STRESS_GRADIENT = `linear-gradient(90deg, ${SPECTRAL_STRESS_STOP_HEXES.join(", ")})`;

const FACTOR_OF_SAFETY_BAND_CLASSES: Record<FactorOfSafetyBand, string> = {
  safe: "text-[#22C55E]",
  marginal: "text-[#F59E0B]",
  critical: "text-[#EF4444]",
};

function formatPercentLabel(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

export default function ViewportHud({
  store,
  assembly,
  isInteractive,
  missingNodeNames,
}: ViewportHudProps) {
  const snapshot = useExplosionSnapshot(store);
  const sliderRef = useRef<HTMLInputElement>(null);
  const percentOutputRef = useRef<HTMLOutputElement>(null);

  const selectedPart =
    snapshot.selectedPartId === null
      ? undefined
      : assembly.parts.find((part) => part.id === snapshot.selectedPartId);

  function handleExplosionSliderInput(event: FormEvent<HTMLInputElement>): void {
    const factor = event.currentTarget.valueAsNumber;
    store.setTargetFactor(factor);
    const percentOutput = percentOutputRef.current;
    if (percentOutput !== null) percentOutput.textContent = formatPercentLabel(factor);
  }

  function handleXrayToggleClick(): void {
    store.setXrayEnabled(!snapshot.isXrayEnabled);
  }

  function handleStressToggleClick(): void {
    store.setStressViewEnabled(!snapshot.isStressViewEnabled);
  }

  function handleResetViewClick(): void {
    store.requestViewReset();
    const slider = sliderRef.current;
    if (slider !== null) slider.value = "0";
    const percentOutput = percentOutputRef.current;
    if (percentOutput !== null) percentOutput.textContent = formatPercentLabel(0);
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={snapshot.isXrayEnabled}
            disabled={!isInteractive}
            onClick={handleXrayToggleClick}
            className={`${TOGGLE_BASE_CLASS} ${snapshot.isXrayEnabled ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`}
          >
            <Image src={XRAY_ICON_SOURCE} width={14} height={14} alt="" />
            X-ray
          </button>
          <button
            type="button"
            aria-pressed={snapshot.isStressViewEnabled}
            disabled={!isInteractive}
            onClick={handleStressToggleClick}
            className={`${TOGGLE_BASE_CLASS} ${snapshot.isStressViewEnabled ? TOGGLE_ON_CLASS : TOGGLE_OFF_CLASS}`}
          >
            <span
              aria-hidden
              className="block h-2.5 w-5 rounded-sm"
              style={{ backgroundImage: STRESS_GRADIENT }}
            />
            Stress
          </button>
          <button
            type="button"
            disabled={!isInteractive}
            onClick={handleResetViewClick}
            className={`${TOGGLE_BASE_CLASS} ${TOGGLE_OFF_CLASS}`}
          >
            <Image src={RESET_ICON_SOURCE} width={14} height={14} alt="" />
            Reset view
          </button>
        </div>

        <div className="flex max-w-[45%] flex-col items-end gap-1.5">
          {snapshot.isStressViewEnabled ? (
            <div className={`${PANEL_CLASS} px-2.5 py-2 text-right`}>
              <p className={LABEL_CLASS}>Stress, fraction of yield</p>
              <div className="mt-1.5 flex items-center justify-end gap-1.5">
                <span className="font-mono text-[10px] text-white">0</span>
                <span
                  aria-hidden
                  className="block h-2 w-24 rounded-sm"
                  style={{ backgroundImage: STRESS_GRADIENT }}
                />
                <span className="font-mono text-[10px] text-white">1</span>
                <span
                  aria-hidden
                  className="ml-1 block size-2 rounded-sm"
                  style={{ backgroundColor: NOT_SIMULATED_HEX }}
                />
                <span className="font-mono text-[10px] text-[#9AA3AD]">n/a</span>
              </div>
              <p className="mt-1.5 max-w-52 text-[10px] leading-4 text-[#9AA3AD]">
                Author-reported ratings. Not a live simulation.
              </p>
            </div>
          ) : null}
          {missingNodeNames.length === 0 ? null : (
            <p className={`${PANEL_CLASS} px-2.5 py-1.5 text-[10px] leading-4 text-[#F59E0B]`}>
              Not in the model: {missingNodeNames.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {selectedPart === undefined ? null : (
          <div className={`${PANEL_CLASS} pointer-events-auto max-w-xs px-3 py-2`}>
            <p className={LABEL_CLASS}>
              {manufacturingMethodLabel(selectedPart.manufacturingMethod)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-white">{selectedPart.label}</p>
            <p className="text-[11px] leading-4 text-[#9AA3AD]">{selectedPart.material}</p>
            <p className="mt-1 font-mono text-[11px] text-white tabular-nums">
              {selectedPart.stressRating === null
                ? "Not simulated"
                : `${Math.round(selectedPart.stressRating * 100)}% of yield, author-reported`}
            </p>
            {selectedPart.calloutText === null ? null : (
              <p className="mt-1 text-[11px] leading-4 text-white/80">{selectedPart.calloutText}</p>
            )}
          </div>
        )}

        <div className={`${PANEL_CLASS} pointer-events-auto flex items-center gap-3 px-3 py-2`}>
          <label htmlFor="exploded-view-explosion-slider" className={LABEL_CLASS}>
            Explode
          </label>
          <input
            ref={sliderRef}
            id="exploded-view-explosion-slider"
            type="range"
            min={0}
            max={1}
            step={0.001}
            defaultValue={0}
            disabled={!isInteractive}
            onInput={handleExplosionSliderInput}
            aria-label="Explosion amount"
            className="h-1.5 w-full cursor-pointer accent-[#FF5500] disabled:cursor-not-allowed"
          />
          <output
            ref={percentOutputRef}
            htmlFor="exploded-view-explosion-slider"
            className="w-10 text-right font-mono text-[11px] text-white tabular-nums"
          >
            {formatPercentLabel(0)}
          </output>
        </div>
      </div>
    </div>
  );
}

/**
 * The author-reported figures, under the viewport rather than over it so they never cover the
 * model and stay readable at phone widths. Renders NOTHING when the author published none.
 */
export function TelemetryStrip({
  telemetry,
}: {
  readonly telemetry: TeardownSimulationTelemetry | null;
}) {
  if (telemetry === null) return null;
  const factorOfSafetyBand = resolveFactorOfSafetyBand(telemetry.factorOfSafety);

  const readouts: readonly {
    readonly label: string;
    readonly value: string;
    readonly className?: string;
  }[] = [
    {
      label: "Factor of safety",
      value: formatTelemetryQuantity(telemetry.factorOfSafety, "×"),
      className: FACTOR_OF_SAFETY_BAND_CLASSES[factorOfSafetyBand],
    },
    {
      label: "Peak von Mises",
      value: formatTelemetryQuantity(telemetry.peakVonMisesStressMegapascals, "MPa"),
    },
    {
      label: "Max displacement",
      value: formatTelemetryQuantity(telemetry.maxDisplacementMicrometres, "µm"),
    },
    { label: "Thermal delta", value: formatTelemetryQuantity(telemetry.thermalDeltaKelvin, "K") },
    { label: "Rated load", value: formatTelemetryQuantity(telemetry.ratedLoadNewtons, "N") },
  ];

  return (
    <div className="border-t border-white/10 bg-[#0F1115] px-3 py-2.5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
        {readouts.map((readout) => (
          <div key={readout.label}>
            <dt className={LABEL_CLASS}>{readout.label}</dt>
            <dd
              className={`mt-0.5 font-mono text-sm tabular-nums ${readout.className ?? "text-white"}`}
            >
              {readout.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[10px] leading-4 text-[#9AA3AD]">
        Author-reported figures from their own analysis or test rig. Nothing on this page computed
        them.
      </p>
    </div>
  );
}
