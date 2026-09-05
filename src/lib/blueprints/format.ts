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
