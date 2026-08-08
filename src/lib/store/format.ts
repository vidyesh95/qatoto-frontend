// TRANSPORT: props-only — pure formatting, no network.
//
// Every store surface formats money, rates, ranges and country codes, and 18 of them do
// it in more than one place. These lived in `organizations.schemas.ts` while the
// storefront was the only wired surface; they are carved out here because importing a
// formatter FROM A SCHEMA FILE teaches everyone to put formatters in schema files.
// `organizations.schemas.ts` re-exports them, so its 14 section files are untouched.
//
// THE RULE THESE FUNCTIONS EXIST TO ENFORCE: money crosses the wire as integer cents
// beside an ISO currency, and the division by 100 happens HERE AND NOWHERE ELSE. No
// arithmetic is ever done on a formatted result — that is how `"$890 / ton"` ended up in
// `src/types/store.ts` as a domain value, and why a client that wanted to compare two
// prices could not.

/** A rate on `0..1` as a percentage. Callers must have already handled `null`. */
export function formatPercentageLabel(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * One amount. `currency` is the ISO code that arrived beside the cents, never a guess.
 *
 * A WHOLE AMOUNT SHOWS NO DECIMALS; A FRACTIONAL ONE SHOWS EXACTLY TWO. That is not a style
 * preference — the previous version passed `minimumFractionDigits: 0` with `maximum: 2`, which drops
 * a trailing zero and rendered 14,769,480 cents as **"$147,694.8"**. A one-decimal price is not a
 * price, and on a cart total it reads as either a typo or a tenth of a cent.
 *
 * Whole amounts keep their bare form because B2B figures are usually round and "€74,900" beats
 * "€74,900.00" at a glance — but the moment there is a fraction, both digits are mandatory.
 */
export function formatCentsLabel(amountInCents: number, currency: string): string {
  const hasFractionalPart = amountInCents % 100 !== 0;
  const fractionDigits = hasFractionalPart ? 2 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountInCents / 100);
}

/**
 * A price range in one currency, collapsing to a single amount when the ends match.
 *
 * For the indicative bands a service offering publishes and the delivery estimate
 * returns. Both are ranges on purpose: an estimate is not a quote, and printing one end
 * of it as "the price" is the lie A16 was written to prevent.
 */
export function formatCentsRangeLabel(
  minimumInCents: number | null,
  maximumInCents: number | null,
  currency: string,
): string | null {
  if (minimumInCents === null) {
    if (maximumInCents === null) return null;
    return `Up to ${formatCentsLabel(maximumInCents, currency)}`;
  }
  if (maximumInCents === null) return `From ${formatCentsLabel(minimumInCents, currency)}`;
  if (minimumInCents === maximumInCents) return formatCentsLabel(minimumInCents, currency);
  const lowerLabel = formatCentsLabel(minimumInCents, currency);
  const upperLabel = formatCentsLabel(maximumInCents, currency);
  return `${lowerLabel} – ${upperLabel}`;
}

/**
 * Every total on a cart or a pathway set, ONE PER CURRENCY.
 *
 * THE TOTALS ARE NEVER SUMMED. The backend returns an array precisely because a basket
 * sourced from three countries has three totals and no grand total; adding them would
 * invent an exchange rate the platform has not quoted and is not offering. A single
 * number here would be a price the buyer cannot pay.
 *
 * An empty array means an empty basket, and returns `null` so the caller renders its own
 * empty state rather than a zero.
 */
export function formatCurrencyTotalsLabel(
  totals: readonly { readonly amountInCents: number; readonly currency: string }[],
): string | null {
  if (totals.length === 0) return null;
  return totals.map((total) => formatCentsLabel(total.amountInCents, total.currency)).join(" + ");
}

/**
 * A lead time as a band, or `null` when the seller declared none.
 *
 * Null is not "ships immediately" — it is "this seller has not said". Callers render an
 * absence, never a zero and never an optimistic "in stock".
 */
export function formatLeadTimeRangeLabel(
  minimumDays: number | null,
  maximumDays: number | null,
): string | null {
  if (minimumDays === null && maximumDays === null) return null;
  if (minimumDays !== null && maximumDays !== null) {
    if (minimumDays === maximumDays) return `Ships in about ${minimumDays} days`;
    return `Ships in ${minimumDays}–${maximumDays} days`;
  }
  const declaredDays = minimumDays ?? maximumDays;
  return `Ships in about ${declaredDays} days`;
}

export function formatSquareMetresLabel(squareMetres: number): string {
  return `${squareMetres.toLocaleString("en-US")} m²`;
}

/** A plain integer with thousands separators — counts, quantities, sample sizes. */
export function formatCountLabel(count: number): string {
  return count.toLocaleString("en-US");
}

export function countryLabelFromCode(countryCode: string): string {
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  return displayNames.of(countryCode.toUpperCase()) ?? countryCode;
}

/**
 * A `YYYY-MM-DD` value as readable copy, WITHOUT going through `new Date()`.
 *
 * Parsing a date-only string as a Date treats it as UTC midnight, which renders as the
 * previous day for every viewer west of UTC — a certificate that lapses on the 1st would
 * read as the 31st. Splitting the parts avoids the whole class of bug.
 */
export function formatIsoDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthLabel = monthNames[Number(month) - 1] ?? month;
  return `${monthLabel} ${Number(day)}, ${year}`;
}

/**
 * A full ISO INSTANT as readable copy — `"Aug 1, 2026, 00:00 UTC"`.
 *
 * NO `new Date()` AND NO LOCALE, for the reason `relative-time.tsx` sets out at length: these are client
 * components, so they render once on the server and again in the browser. Anything that reads the ambient
 * timezone or the current instant produces two different strings and a hydration mismatch. Splitting the
 * string is deterministic in both places.
 *
 * THE `UTC` SUFFIX IS DELIBERATE, not a shortcut around timezone conversion. Every instant this formats is
 * a commercial deadline — quote validity, a delivery window, a deliverable due date — and a deadline shown
 * without its zone is a deadline two parties in two countries will read differently. Naming the zone is the
 * honest render; converting to the viewer's local time would need `Intl` and reintroduce the mismatch.
 *
 * A string that is not an ISO instant comes back UNCHANGED rather than half-parsed.
 */
export function formatIsoInstantLabel(isoInstant: string): string {
  const [datePart, timePart] = isoInstant.split("T");
  if (datePart === undefined || timePart === undefined) return isoInstant;
  const [hour, minute] = timePart.split(":");
  if (hour === undefined || minute === undefined) return isoInstant;
  return `${formatIsoDateLabel(datePart)}, ${hour}:${minute} UTC`;
}

/**
 * The same, keeping `null` as `null`.
 *
 * `DefinitionList` renders a null value as an explicit absence, so the null must SURVIVE formatting rather
 * than becoming `"—"` or `""` here. An unset `acceptedAt` means nobody accepted; that is a fact, not a
 * missing string.
 */
export function formatOptionalIsoInstantLabel(isoInstant: string | null): string | null {
  return isoInstant === null ? null : formatIsoInstantLabel(isoInstant);
}
