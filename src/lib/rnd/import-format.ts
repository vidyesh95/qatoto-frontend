// TRANSPORT: props-only — pure formatting, no network.
//
// Composes §20's magnitudes CLIENT-SIDE from the typed fields the backend sends, the same
// division of labour `discovery-format.ts` records: the server sends a number and a unit
// key, and the separators, the symbol and the abbreviation belong to the reader.
//
// ⚠️ EVERYTHING HERE IS `BigInt` ARITHMETIC. A country's annual import bill in cents runs
// to 14,153,232,225,252 — inside `Number.MAX_SAFE_INTEGER`, but only just, and the sums a
// future surface might take are not. There is no `Number()` on a cents value anywhere in
// this file, and adding one would reintroduce exactly the rounding the decimal-string wire
// format exists to prevent.
//
// Deterministic and locale-pinned, like `format.ts` — a server render and a client render
// must produce identical text or hydration mismatches.

import type { ImportQuantityUnit } from "@/lib/rnd/import-intelligence.schemas";

const TRADE_FORMATTING_LOCALE = "en-US";

// `BigInt(…)` calls rather than `100n` literals: tsconfig targets ES2017, where the literal
// syntax is a compile error. `format.ts` records the same constraint for the same reason.
const ZERO = BigInt(0);
const TEN = BigInt(10);
const CENTS_PER_UNIT = BigInt(100);
const MILLI_PER_UNIT = BigInt(1000);
const KILOGRAMS_PER_TONNE = BigInt(1000);

/** Scale thresholds, largest first — the first match wins. */
const MAGNITUDE_SCALES: readonly { readonly divisor: bigint; readonly suffix: string }[] = [
  { divisor: BigInt(1_000_000_000_000), suffix: "T" },
  { divisor: BigInt(1_000_000_000), suffix: "B" },
  { divisor: BigInt(1_000_000), suffix: "M" },
  { divisor: BigInt(1_000), suffix: "K" },
];

/** ISO 4217 → the symbol a reader expects. Falls back to the code, never to a guess. */
const CURRENCY_SYMBOLS: Readonly<Record<string, string>> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

function currencyPrefixFor(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

/**
 * One decimal place, by integer arithmetic.
 *
 * `(value * 10) / divisor` then split — no float division, so there is no rounding rule for
 * a server and a client to disagree about.
 */
function scaledToOneDecimal(value: bigint, divisor: bigint): string {
  const tenths = (value * TEN) / divisor;
  const whole = tenths / TEN;
  const fraction = tenths % TEN;
  return fraction === ZERO ? whole.toString() : `${whole.toString()}.${fraction.toString()}`;
}

/**
 * A trade value, abbreviated: `$141.5B`.
 *
 * COMPACT ON PURPOSE. The exact figure is 14,153,232,225,252 cents, and rendering all
 * fourteen digits in a table cell tells a reader less than "$141.5B" does. `formatTradeValueExact`
 * is beside it for the one place the full number belongs.
 *
 * @param tradeValueInCents integer cents as a DECIMAL STRING, straight off the wire.
 */
export function formatTradeValueCompact(tradeValueInCents: string, currency: string): string {
  const cents = BigInt(tradeValueInCents);
  const units = cents / CENTS_PER_UNIT;
  const prefix = currencyPrefixFor(currency);

  if (units < ZERO) {
    return `${prefix}${units.toString()}`;
  }

  for (const scale of MAGNITUDE_SCALES) {
    if (units >= scale.divisor) {
      return `${prefix}${scaledToOneDecimal(units, scale.divisor)}${scale.suffix}`;
    }
  }
  return `${prefix}${new Intl.NumberFormat(TRADE_FORMATTING_LOCALE).format(units)}`;
}

/** The full figure, grouped. For a detail panel where the exact number is the point. */
export function formatTradeValueExact(tradeValueInCents: string, currency: string): string {
  const units = BigInt(tradeValueInCents) / CENTS_PER_UNIT;
  return `${currencyPrefixFor(currency)}${new Intl.NumberFormat(TRADE_FORMATTING_LOCALE).format(units)}`;
}

/**
 * The model's capital band — `"$2.0M – $15.0M"` — or the absence, spelled out.
 *
 * ⚠️ NULL IS NOT ZERO AND NOT "CHEAP". The prompt explicitly permits the model to decline,
 * and it declines when it has no honest basis. Rendering that as `$0` or as a blank would
 * turn a refusal into a claim, so the absence gets a sentence.
 *
 * ⚠️ THE CALLER MUST STILL SHOW THE PROVENANCE. This returns a number; the model name, the
 * prompt version and the `asOf` belong beside it, because an unattributed figure about money
 * reads as a platform quote. Nothing on this platform honours it.
 */
export function formatCapitalBand(
  estimatedCapitalMinInCents: string | null,
  estimatedCapitalMaxInCents: string | null,
  currency: string,
): string | null {
  if (estimatedCapitalMinInCents === null || estimatedCapitalMaxInCents === null) return null;
  return `${formatTradeValueCompact(estimatedCapitalMinInCents, currency)} – ${formatTradeValueCompact(estimatedCapitalMaxInCents, currency)}`;
}

/**
 * The capital estimate measured against the country's own annual import bill for that product
 * — `"3x"`, `"0.2x"` — or null when there is no band.
 *
 * ⚠️ THIS EXISTS TO MAKE A WRONG MODEL ANSWER OBVIOUS. The batch run produced one estimate of
 * $500B–$1.5T to build a semiconductor fab, which is roughly fifty times what such a plant
 * actually costs. Nothing in the platform can tell that it is wrong — no schedule of plant
 * costs exists here, which is precisely why the figure is a model's guess in the first place.
 * What CAN be stated is measured: the country buys $6.9B of that product a year, so the
 * estimate is 217 times the entire annual import bill. A reader who sees "217x" needs no
 * domain knowledge to distrust it, and one who sees "0.2x" has a number worth taking to a
 * supplier.
 *
 * It is a RATIO OF THE UPPER BOUND, deliberately — the pessimistic end is the one that makes
 * an over-estimate visible, and an over-estimate is the failure mode that costs a founder a
 * project they should have started.
 *
 * BigInt until the final divide, per the module header.
 */
export function formatCapitalAgainstImports(
  estimatedCapitalMaxInCents: string | null,
  observedImportValueInCents: string,
): string | null {
  if (estimatedCapitalMaxInCents === null) return null;
  const importCents = BigInt(observedImportValueInCents);
  if (importCents <= ZERO) return null;
  const ratioTenths = (BigInt(estimatedCapitalMaxInCents) * TEN) / importCents;
  const ratio = Number(ratioTenths) / 10;
  // Whole numbers above ten: "217.4x" implies a precision this figure does not have.
  return ratio >= 10 ? `${String(Math.round(ratio))}x` : `${ratio.toFixed(1)}x`;
}

/**
 * How many times more the country buys than it sells — `"4.2x"`, or null when it exports none.
 *
 * ⚠️ NULL MEANS NO EXPORTS AT ALL, which is a division by zero and also the strongest possible
 * version of the signal. It must render as "nothing exported", never as an enormous ratio and
 * never as zero.
 *
 * BigInt throughout until the final divide, per the module header — these are cents.
 */
export function formatImportToExportRatio(
  observedImportValueInCents: string,
  observedExportValueInCents: string,
): string | null {
  const exportCents = BigInt(observedExportValueInCents);
  if (exportCents <= ZERO) return null;
  // Scaled by ten before the integer divide so one decimal survives it.
  const ratioTenths = (BigInt(observedImportValueInCents) * TEN) / exportCents;
  return `${(Number(ratioTenths) / 10).toFixed(1)}x`;
}

/** The noun that follows a quantity. `not_applicable` has none — see below. */
const QUANTITY_UNIT_SUFFIXES: Record<ImportQuantityUnit, string> = {
  not_applicable: "",
  square_metres: " m²",
  thousand_kilowatt_hours: " MWh",
  metres: " m",
  units: " units",
  pairs: " pairs",
  litres: " L",
  kilograms: " kg",
  thousand_units: " thousand units",
  packs: " packs",
  cubic_metres: " m³",
  carats: " carats",
};

/**
 * A traded quantity, or an honest absence.
 *
 * ⚠️ THREE DIFFERENT NOTHINGS, and they must not collapse into one:
 *
 *   `unit === "not_applicable"`  the commodity is traded by VALUE ALONE. There is no
 *                                quantity to state and never was. 4,219 rows.
 *   `quantityMilli === null`     nobody filed one. There should be a number and there
 *                                is not.
 *   a quantity of zero           somebody filed zero, which is a real measurement.
 *
 * Collapsing the first two into "unknown" would report a fact about the commodity as a gap
 * in the data; collapsing either into "0" would invent a measurement.
 */
export function formatTradeQuantity(
  quantityMilli: string | null,
  quantityUnit: ImportQuantityUnit,
): string {
  if (quantityUnit === "not_applicable") {
    return "Traded by value only";
  }
  if (quantityMilli === null) {
    return "Not recorded";
  }
  const wholeUnits = BigInt(quantityMilli) / MILLI_PER_UNIT;
  return `${new Intl.NumberFormat(TRADE_FORMATTING_LOCALE).format(wholeUnits)}${QUANTITY_UNIT_SUFFIXES[quantityUnit]}`;
}

/**
 * A net weight in tonnes, or an honest absence.
 *
 * Tonnes rather than kilograms because a national annual figure in kilograms is nine digits
 * of noise. NULL renders as "Not recorded" — 3,521 of the 60,550 ingested rows have no
 * weight, and a zero would say the shipment weighed nothing.
 */
export function formatNetWeight(netWeightMilliKilograms: string | null): string {
  if (netWeightMilliKilograms === null) {
    return "Not recorded";
  }
  const kilograms = BigInt(netWeightMilliKilograms) / MILLI_PER_UNIT;
  const tonnes = kilograms / KILOGRAMS_PER_TONNE;
  if (tonnes === ZERO) {
    return `${new Intl.NumberFormat(TRADE_FORMATTING_LOCALE).format(kilograms)} kg`;
  }
  return `${new Intl.NumberFormat(TRADE_FORMATTING_LOCALE).format(tonnes)} t`;
}

/**
 * How a figure was arrived at, in the reader's terms.
 *
 * Shown beside every magnitude rather than in a footnote. A mirrored estimate and a
 * reported figure are both legitimate and are not the same claim, and a surface that shows
 * only the number invites a reader to treat them alike.
 */
export function describeEstimation(flow: {
  readonly isReported: boolean;
  readonly isAggregate: boolean;
  readonly isNetWeightEstimated: boolean;
}): string {
  if (flow.isReported) {
    return "Reported by the country";
  }
  if (flow.isAggregate) {
    return flow.isNetWeightEstimated
      ? "Aggregated by UNSD · weight estimated"
      : "Aggregated by UNSD";
  }
  return "Estimated";
}

/**
 * A confidence, or the absence of one.
 *
 * NULL means NO CONFIDENCE WAS RECORDED. Rendering it as "0%" would publish a judgement the
 * model explicitly declined to make — the prompt tells it to omit rather than invent one.
 */
export function formatConfidenceBps(confidenceBps: number | null): string {
  if (confidenceBps === null) {
    return "No confidence recorded";
  }
  return `${Math.round(confidenceBps / 100)}% confidence`;
}

/**
 * A lead time, or the absence of one.
 *
 * NULL is "no supplier published one", never zero days — and zero days is what the
 * feasibility score would have rewarded most, which is why the score module refuses to let
 * a null reach its ladder at all.
 */
export function formatLeadTimeDays(medianSupplierLeadTimeDays: number | null): string {
  if (medianSupplierLeadTimeDays === null) {
    return "Not published";
  }
  return `${medianSupplierLeadTimeDays}-day median lead time`;
}

/** `2023-01-01` → `2023`. Annual periods are a year, and the day is noise. */
export function formatTradePeriod(periodStartsDate: string): string {
  return periodStartsDate.slice(0, 4);
}
