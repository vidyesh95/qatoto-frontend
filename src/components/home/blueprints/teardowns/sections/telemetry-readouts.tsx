// TRANSPORT: props-only — the author's reported figures. Renders NOTHING when they published none.

import {
  type FactorOfSafetyBand,
  formatTelemetryQuantity,
  resolveFactorOfSafetyBand,
} from "@/lib/blueprints/format";
import type { TeardownSimulationTelemetry } from "@/lib/blueprints/schemas";

const LABEL_CLASS = "font-mono text-[10px] tracking-[0.12em] text-[#6F7979] uppercase";

/**
 * WHAT MAKES THE SCHEMA'S PROMISED COMPILE ERROR REAL.
 *
 * `schemas.ts` declares `source` as a `z.literal` rather than a one-value enum, on the stated
 * grounds that widening it into a union "is a compile error at every renderer that reads `source`".
 * Until this existed NO renderer read it, so that error had nowhere to fire and the footer below
 * asserted "author-reported" over any figure at all — including, one day, a platform-simulated one.
 * A `Record` keyed on the union is what turns a second arm into a build failure here.
 *
 * The provenance is the single most important thing on this panel. A factor of safety carries very
 * different weight depending on whether a rig measured it or a publisher typed it.
 */
const TELEMETRY_SOURCE_NOTES: Record<TeardownSimulationTelemetry["source"], string> = {
  author_reported:
    "Author-reported figures from their own analysis or test rig. Nothing on this page computed them.",
};

/**
 * Darkened from the values a dark instrument panel would use: on a white ground `#22C55E` and
 * `#F59E0B` do not carry enough contrast for a figure a reader is meant to act on.
 */
const FACTOR_OF_SAFETY_BAND_CLASSES: Record<FactorOfSafetyBand, string> = {
  safe: "text-[#15803D]",
  marginal: "text-[#B45309]",
  critical: "text-[#B91C1C]",
};

export default function TelemetryReadouts({
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
    <section className="mt-8">
      <h2 className="text-sm font-medium text-foreground">Simulation</h2>
      <div className="mt-2 rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {readouts.map((readout) => (
            <div key={readout.label}>
              <dt className={LABEL_CLASS}>{readout.label}</dt>
              <dd
                className={`mt-0.5 font-mono text-sm tabular-nums ${readout.className ?? "text-foreground"}`}
              >
                {readout.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] leading-4 text-[#6F7979]">
          {TELEMETRY_SOURCE_NOTES[telemetry.source]}
        </p>
      </div>
    </section>
  );
}
