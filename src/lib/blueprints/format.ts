// TRANSPORT: props-only — pure formatting. No network, no state.
//
// THE DIVISION HAPPENS HERE AND NOWHERE ELSE, the rule `src/lib/store/format.ts` states for money
// and this file extends to the other two metric kinds. Nothing downstream does arithmetic on a
// formatted result.
//
// Three of the four formatters below are re-exports rather than new code — the repo already had a
// duration formatter and a byte-size formatter, and a second copy of either is a second answer to
// "how big is 1,887,437 bytes".

import {
  type BlueprintMetricValue,
  BLUEPRINT_DISCIPLINE_LABELS,
  type BlueprintDiscipline,
  TEARDOWN_MANUFACTURING_METHOD_LABELS,
  type TeardownManufacturingMethod,
} from "@/lib/blueprints/schemas";
import { formatDurationLabel } from "@/lib/feed/format";
import { formatFileSizeFromBytes } from "@/lib/rnd/format";
import { formatCentsLabel, formatCountLabel, formatPercentageLabel } from "@/lib/store/format";

export { formatDurationLabel, formatFileSizeFromBytes };

const BASIS_POINTS_PER_UNIT = 10_000;

/**
 * One case-study outcome figure, rendered by what kind of number it is.
 *
 * Exhaustive over the value union with a `never` default: a fourth metric kind is a compile error
 * here rather than a silently blank cell (CLAUDE.md Pattern 1).
 */
export function formatBlueprintMetricValue(value: BlueprintMetricValue): string {
  switch (value.kind) {
    case "count":
      return formatCountLabel(value.amount);
    case "money":
      return formatCentsLabel(value.amountInCents, value.currency);
    case "percentage":
      return formatPercentageLabel(value.basisPoints / BASIS_POINTS_PER_UNIT);
    default: {
      const exhaustiveCheck: never = value;
      return exhaustiveCheck;
    }
  }
}

/** `3` -> `"03"`. The index numeral, zero-padded so a column of cards aligns. */
export function formatConceptNumberLabel(conceptNumber: number): string {
  return String(conceptNumber).padStart(2, "0");
}

/**
 * The tint one discipline's card carries.
 *
 * LITERAL CLASS STRINGS, NEVER INTERPOLATED. Tailwind scans source text, so a computed
 * `bg-${name}-50` compiles to nothing at all — the same trap `pipeline-stages-strip.tsx:68`
 * records for its stage ramp. Each value here is written out in full for that reason.
 */
export const BLUEPRINT_DISCIPLINE_TINT_CLASSES: Record<BlueprintDiscipline, string> = {
  tooling: "bg-[#00696E]/8 border-[#00696E]/25",
  supply_chain: "bg-[#4A5B92]/8 border-[#4A5B92]/25",
  quality: "bg-[#7A5B00]/8 border-[#7A5B00]/25",
  distribution: "bg-[#3F6B3F]/8 border-[#3F6B3F]/25",
  unit_economics: "bg-[#8A4B5C]/8 border-[#8A4B5C]/25",
};

/** The numeral's ink, matched to the card tint so the two read as one object. */
export const BLUEPRINT_DISCIPLINE_NUMERAL_CLASSES: Record<BlueprintDiscipline, string> = {
  tooling: "text-[#00696E]/35",
  supply_chain: "text-[#4A5B92]/35",
  quality: "text-[#7A5B00]/35",
  distribution: "text-[#3F6B3F]/35",
  unit_economics: "text-[#8A4B5C]/35",
};

export function blueprintDisciplineLabel(discipline: BlueprintDiscipline): string {
  return BLUEPRINT_DISCIPLINE_LABELS[discipline];
}

/**
 * `0` -> `"0:00"`, `93` -> `"1:33"`. A POSITION IN A VIDEO, WHICH IS NOT A DURATION, and the
 * distinction is why this is not `formatDurationLabel`: that one returns `null` at or below zero,
 * because a clip of no length has nothing to show. Second zero is the first frame — a real place a
 * step can point at — so it formats like any other.
 */
export function formatVideoTimestampLabel(timestampSeconds: number): string {
  const totalSeconds = Math.max(0, Math.trunc(timestampSeconds));
  const hours = Math.trunc(totalSeconds / 3600);
  const minutes = Math.trunc((totalSeconds % 3600) / 60);
  const paddedSeconds = String(totalSeconds % 60).padStart(2, "0");
  if (hours === 0) return `${minutes}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

export function manufacturingMethodLabel(method: TeardownManufacturingMethod): string {
  return TEARDOWN_MANUFACTURING_METHOD_LABELS[method];
}

const TELEMETRY_QUANTITY_FORMAT = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });

/**
 * `74.2` + `"MPa"` -> `"74.2 MPa"`. One decimal at most: the telemetry HUD prints author-reported
 * figures, and a third decimal on a rig reading is precision the rig never had.
 */
export function formatTelemetryQuantity(value: number, unitSuffix: string): string {
  return `${TELEMETRY_QUANTITY_FORMAT.format(value)} ${unitSuffix}`;
}

/** The factor-of-safety colour bands the HUD uses. Boundaries inclusive at the top of each band. */
export const FACTOR_OF_SAFETY_SAFE_MINIMUM = 2;
export const FACTOR_OF_SAFETY_MARGINAL_MINIMUM = 1.2;

export type FactorOfSafetyBand = "safe" | "marginal" | "critical";

export function resolveFactorOfSafetyBand(factorOfSafety: number): FactorOfSafetyBand {
  if (factorOfSafety >= FACTOR_OF_SAFETY_SAFE_MINIMUM) return "safe";
  if (factorOfSafety >= FACTOR_OF_SAFETY_MARGINAL_MINIMUM) return "marginal";
  return "critical";
}
