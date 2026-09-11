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

/**
 * `3` -> `"03"`. Zero-padded so a column of numerals aligns on its own left edge.
 *
 * It was `formatConceptNumberLabel` and it was named for the case-study numeral, which is gone —
 * the numbered card grid was replaced by a lesson list. `assembly-step-list.tsx` was always the
 * other caller, so the function stayed and took a name that describes what it does rather than the
 * one caller it used to have.
 */
export function formatTwoDigitLabel(value: number): string {
  return String(value).padStart(2, "0");
}

export function blueprintDisciplineLabel(discipline: BlueprintDiscipline): string {
  return BLUEPRINT_DISCIPLINE_LABELS[discipline];
}

export function manufacturingMethodLabel(method: TeardownManufacturingMethod): string {
  return TEARDOWN_MANUFACTURING_METHOD_LABELS[method];
}

/**
 * A write-up as paragraphs: blank-line separated, the way somebody types into a textarea.
 *
 * Trailing whitespace and a run of three newlines both collapse to one break, because a maker
 * pasting from a document should not be able to open a 4rem hole in the middle of their own launch
 * page. An entry that is nothing but whitespace yields no paragraphs at all.
 */
export function splitWriteUpIntoParagraphs(writeUp: string): string[] {
  return writeUp
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * The write-up split where a launch's demo goes: after the first paragraph.
 *
 * `null` for no write-up AND for one that is only whitespace, which is `null` wearing a string. The
 * detail page needs that answer on the server, because a launch with nothing to read still shows its
 * demo, right after the summary.
 */
export function splitWriteUpAtFirstParagraph(writeUp: string | null): {
  readonly firstParagraph: string;
  readonly remainingParagraphs: readonly string[];
} | null {
  if (writeUp === null) return null;
  const paragraphs = splitWriteUpIntoParagraphs(writeUp);
  const firstParagraph = paragraphs.at(0);
  if (firstParagraph === undefined) return null;
  return { firstParagraph, remainingParagraphs: paragraphs.slice(1) };
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
