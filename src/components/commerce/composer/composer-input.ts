// TRANSPORT: props-only — pure conversion from draft state to request fields. No network.
//
// THE ONE PLACE A DRAFT BECOMES A REQUEST BODY, and every function here exists to enforce the same rule:
//
//   A FIELD THE USER DID NOT FILL IS OMITTED FROM THE REQUEST. Never `null`, never `""`, never `0`, never
//   `false`.
//
// Both bodies these feed are `.strict()` AND their optional fields are `.optional()` without `.nullable()`,
// so `null` is a 422 rather than an "unset". But the 422 is the least of it — the values that would parse are
// the dangerous ones:
//
//   `0` for a blank indicative price publishes a free service.
//   `0` for a blank lead time publishes same-day delivery.
//   `false` for an unanswered requirement claims the buyer does not need the thing.
//   `""` for a blank summary fails a `min(1)` on some fields and stores an empty string on others.
//
// So the draft state keeps strings and a three-state answer, and the conversion to wire types happens here,
// once, where the omission is visible in one place instead of at thirty call sites.

import type { TriStateAnswer } from "@/components/commerce/composer/composer-fields";

/** A trimmed string, or `undefined` when blank — so the key can be dropped from the body. */
export function toOptionalText(rawText: string): string | undefined {
  const trimmed = rawText.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * A non-negative integer, or `undefined`.
 *
 * A BLANK FIELD IS `undefined`, NOT `0` — see the header. So is an unparseable one: "about 12" is not a
 * number, and guessing 12 from it would put a figure on a commercial listing that nobody typed.
 *
 * A NEGATIVE VALUE IS ALSO `undefined` rather than clamped to 0. Every one of these wire fields is
 * `.min(0)`, so clamping would send a figure the user did not type in place of a refusal they should see.
 */
export function toOptionalNonNegativeInteger(rawText: string): number | undefined {
  const trimmed = rawText.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) return undefined;
  return parsed;
}

/**
 * A major-unit money string ("1250.50") as integer cents, or `undefined`.
 *
 * ROUNDED, and the rounding is the point: `1250.505 * 100` is `125050.49999999999` in IEEE 754, and an
 * un-rounded value fails the backend's `.int()` check. Money never travels as a float on this surface.
 */
export function toOptionalCents(rawMajorUnits: string): number | undefined {
  const trimmed = rawMajorUnits.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

/** An optional wire boolean: `yes` → `true`, `no` → `false`, `unspecified` → omitted. */
export function toOptionalBoolean(answer: TriStateAnswer): boolean | undefined {
  switch (answer) {
    case "yes":
      return true;
    case "no":
      return false;
    case "unspecified":
      return undefined;
    default: {
      const exhaustiveCheck: never = answer;
      return exhaustiveCheck;
    }
  }
}

/**
 * A two-letter country code, upper-cased, or `undefined`.
 *
 * The wire regex is `/^[A-Z]{2}$/` — upper case, exactly two letters. Anything else is `undefined` rather
 * than sent and refused: "United Kingdom" typed into a code field is a mistake to catch here, not a 422 the
 * user has to decode.
 */
export function toOptionalCountryCode(rawCode: string): string | undefined {
  const normalized = rawCode.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

/** A three-letter ISO currency, upper-cased, or `undefined`. Same reasoning as the country code. */
export function toOptionalCurrencyCode(rawCode: string): string | undefined {
  const normalized = rawCode.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
}

/**
 * A `datetime-local` value as an ISO instant, or `undefined`.
 *
 * `<input type="datetime-local">` yields `"2026-09-01T17:30"` with NO zone, which `z.iso.datetime()` rejects.
 * `new Date(value).toISOString()` is the correct conversion and is safe here in a way it is not at render
 * time: this runs in a click handler, in the browser, so interpreting the value in the user's own timezone is
 * exactly right — they typed a local wall-clock time and meant it.
 */
export function toOptionalIsoInstant(rawLocalDateTime: string): string | undefined {
  const trimmed = rawLocalDateTime.trim();
  if (trimmed === "") return undefined;
  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) return undefined;
  return new Date(parsedMs).toISOString();
}

/**
 * A both-or-neither numeric range.
 *
 * SEVERAL BACKEND FIELDS ARE PAIRED, enforced by a `validatePairedRange` call in the service AND by a
 * Postgres `CHECK`: an indicative price with only a minimum is refused, as is a lead time with only a
 * maximum. Half a range is not "a floor with no ceiling" — it is invalid.
 *
 * So this returns BOTH or NEITHER, and it also drops an INVERTED pair rather than swapping it. A max below a
 * min is a typo, and silently reordering it would publish a range the provider never chose.
 */
export function toOptionalPairedRange(
  rawMinimum: number | undefined,
  rawMaximum: number | undefined,
): { readonly minimum: number; readonly maximum: number } | undefined {
  if (rawMinimum === undefined || rawMaximum === undefined) return undefined;
  if (rawMaximum < rawMinimum) return undefined;
  return { minimum: rawMinimum, maximum: rawMaximum };
}

// NO `withoutUndefinedFields` HELPER HERE, and that is a decision rather than an omission.
//
// A helper that strips `undefined` keys from an arbitrary object cannot be written without a type assertion
// on its return value, and an `as` in the one file whose whole job is building request bodies is the wrong
// place to make an exception. The bodies are therefore assembled with conditional spreads at the call site:
//
//     ...(originCountryCode === undefined ? {} : { originCountryCode }),
//
// which omits the key with no cast, and shows the omission in the same line as the field it omits.

/**
 * A both-or-neither money-with-currency pair.
 *
 * TWO ARMS OF THE QUOTE'S SERVICE-DETAIL UNION ARE PAIRED THIS WAY — insurance's
 * `coverageLimitInCents` + `currency`, and FX's `notionalAmountInCents` + `notionalCurrency`. The
 * backend enforces both with a `superRefine` and again in the service, and half a pair is a 422
 * naming the missing half rather than an ignored field.
 *
 * Same shape and same reasoning as `toOptionalPairedRange` above: both or neither, never half.
 */
export function toOptionalMoneyWithCurrency(
  rawMajorUnits: string,
  rawCurrencyCode: string,
): { readonly amountInCents: number; readonly currency: string } | undefined {
  const amountInCents = toOptionalCents(rawMajorUnits);
  const currency = toOptionalCurrencyCode(rawCurrencyCode);
  if (amountInCents === undefined || currency === undefined) return undefined;
  return { amountInCents, currency };
}

/**
 * A typed decimal exchange rate as the fixed-point pair the wire wants, or `undefined`.
 *
 * **THE RISKIEST CONVERSION ON THIS SURFACE, AND FLOATS ARE WHY.** The obvious implementation —
 * `Math.round(Number("1.0840") * 10 ** 4)` — happens to work for that value and does not for others:
 * the intermediate is `10839.999999999998`, and any input where it lands just below a .5 boundary
 * rounds to the wrong integer. A quoted exchange rate that is wrong in its last place is a real
 * commercial error, and `commerce_prevent_submitted_quote_revision_mutation` freezes it on submit.
 *
 * So the STRING is parsed, never the number: the scale is how many digits were typed after the point,
 * and the mantissa is the digits with the point removed. No float arithmetic anywhere.
 *
 * **TRAILING ZEROS ARE SIGNIFICANT AND ARE PRESERVED.** `1.0840` yields `{ 10840, 4 }`, not
 * `{ 1084, 3 }` — a rate quoted to four places is a different commitment from one quoted to three,
 * and `formatFixedPointRateLabel` renders it back to exactly what was typed.
 *
 * `rateScale` is bounded 0..12 and `rateFixedPoint` must be a positive integer, both per the wire.
 * A zero rate is refused here rather than sent: no currency trades at zero.
 */
export function toFixedPointRate(
  rawDecimalRate: string,
): { readonly rateFixedPoint: number; readonly rateScale: number } | undefined {
  const trimmed = rawDecimalRate.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return undefined;

  const [integerDigits, fractionalDigits = ""] = trimmed.split(".");
  if (fractionalDigits.length > 12) return undefined;

  const rateFixedPoint = Number(`${integerDigits}${fractionalDigits}`);
  if (!Number.isSafeInteger(rateFixedPoint) || rateFixedPoint <= 0) return undefined;

  return { rateFixedPoint, rateScale: fractionalDigits.length };
}
