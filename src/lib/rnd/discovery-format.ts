// TRANSPORT: props-only — pure formatting, no network.
//
// Composes the knowledge-hub statistic sentence CLIENT-SIDE from the three typed
// fields the backend sends. `MarketInsight.statValue` used to be one string carrying
// "+34%", "68M people" and "3× coverage"; it decomposed into a KIND (what sort of
// magnitude), a VALUE in milli-units, and a UNIT. The `×`, the sign and the thousands
// separator all belong to the reader's locale, which is why the server does not
// pre-render any of them.
//
// Deterministic and locale-pinned, like `format.ts` — a server render and a client
// render must produce identical text or hydration mismatches.

import type { MarketInsightStatKind, MarketInsightStatUnitKey } from "@/lib/rnd/discovery.schemas";

const MILLI_PER_UNIT = 1000;
const STAT_FORMATTING_LOCALE = "en-US";

/** The noun (or symbol) that follows the magnitude. Empty for a bare count. */
const STAT_UNIT_SUFFIXES: Record<MarketInsightStatUnitKey, string> = {
  percent: "%",
  multiple: "×",
  people: " people",
  households: " households",
  tonnes: " tonnes",
  litres: " litres",
  hectares: " hectares",
  // Rendered as a prefix instead — see `formatMarketInsightStat`.
  usd_dollars: "",
  count: "",
};

function toUnitValue(statValueMilli: number): number {
  return statValueMilli / MILLI_PER_UNIT;
}

/** "34" not "34.0", but "33.5" when the milli-value actually carries a fraction. */
function formatMagnitude(unitValue: number, useCompactNotation: boolean): string {
  return new Intl.NumberFormat(STAT_FORMATTING_LOCALE, {
    notation: useCompactNotation ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(unitValue);
}

export interface MarketInsightStatFields {
  readonly statKind: MarketInsightStatKind;
  readonly statValueMilli: number;
  readonly statUnitKey: MarketInsightStatUnitKey;
}

/**
 * 34000 + `percent_change` + `percent` → "+34%".
 * 250_000_000 + `absolute_count` + `tonnes` → "250K tonnes".
 * 3000 + `multiplier` + `multiple` → "3×".
 *
 * Only `percent_change` carries an explicit sign, because it is the only kind that
 * may be negative — a level, a count and a multiplier cannot be. Rendering "+" on a
 * `percent_level` would turn "31% of households have access" into a claim about
 * change.
 */
export function formatMarketInsightStat(insight: MarketInsightStatFields): string {
  const unitValue = toUnitValue(insight.statValueMilli);
  const suffix = STAT_UNIT_SUFFIXES[insight.statUnitKey];

  if (insight.statKind === "percent_change") {
    const sign = unitValue > 0 ? "+" : unitValue < 0 ? "−" : "";
    return `${sign}${formatMagnitude(Math.abs(unitValue), false)}${suffix}`;
  }

  // Counts and dollar amounts are the only kinds large enough to need compacting;
  // a percentage or a multiplier reads worse as "1.2K%".
  const isLargeMagnitudeKind = insight.statKind === "absolute_count";
  const magnitude = formatMagnitude(unitValue, isLargeMagnitudeKind);

  return insight.statUnitKey === "usd_dollars" ? `$${magnitude}` : `${magnitude}${suffix}`;
}

/**
 * A 0..100 score, or the absence of one.
 *
 * A demand score is never null on a snapshot row — the row would not exist — but an
 * opportunity score is, so callers on the problem map route through
 * `formatScorePoints` in `format.ts` instead of coercing.
 */
export function formatDemandScore(demandScorePoints: number): string {
  return String(demandScorePoints);
}
