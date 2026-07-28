// TRANSPORT: props-only — pure formatting, no network. Safe on either side of the
// server/client boundary.
//
// The wire-format renderers for the whole research-and-development surface
// (R_AND_D_STRUCTURE.md §11, backend §1). The server sends raw integers in named
// units — cents, basis points, minutes, bytes, score points, ISO instants — and
// each of the three clients composes its own sentence. That is what makes one
// payload renderable by web, Android and iOS in their own locale; a server-rendered
// "$6,000" would ship USD and English to every device on earth.
//
// Every helper is deterministic and timezone-free ON PURPOSE: ISO strings are
// parsed by pattern rather than by `new Date()`, so a server render and a client
// render can never disagree and no hydration mismatch is possible. Do not
// introduce `Date.now()`, `new Date()` or a locale read into this file.

const MONTH_ABBREVIATIONS = [
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

const BASIS_POINTS_PER_PERCENT = 100;
const MINUTES_PER_HOUR = 60;

// `BigInt(…)` calls rather than `100n` literals: tsconfig targets ES2017, where the
// literal syntax is unavailable even though the type is (lib includes esnext).
const ZERO_CENTS = BigInt(0);
const CENTS_PER_UNIT = BigInt(100);
/**
 * Past this many cents (~$90 trillion) a float can no longer hold the cents place, so
 * `formatMoneyFromCents` stops handing the value to `Intl` and composes the label by
 * hand. Silent rounding of someone's compensation is not an acceptable failure mode.
 */
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

// Fixed locale so a server render and a client render always agree.
const MONEY_FORMATTING_LOCALE = "en-US";

/**
 * Accepts either wire representation of money.
 *
 * Several backend columns are `bigint` — locked rate cents, valuation cents, slice
 * numerators — and those cross the wire as DECIMAL STRINGS precisely because anything
 * past 2^53 loses precision the moment `JSON.parse` makes it a `number`. Call sites
 * parse such a field with `BigInt(…)` and pass the result straight through.
 */
function toCentsBigInt(amountInCents: number | bigint): bigint {
  return typeof amountInCents === "bigint" ? amountInCents : BigInt(Math.round(amountInCents));
}

function absoluteCents(amountInCents: bigint): bigint {
  return amountInCents < ZERO_CENTS ? -amountInCents : amountInCents;
}

/** Exact decimal rendering of integer cents: 198000 → "1980.00". Never lossy. */
function centsToDecimalString(amountInCents: bigint): string {
  const isNegative = amountInCents < ZERO_CENTS;
  const magnitude = absoluteCents(amountInCents);

  return `${isNegative ? "-" : ""}${magnitude / CENTS_PER_UNIT}.${(magnitude % CENTS_PER_UNIT)
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Integer cents + an ISO 4217 code → a currency label. The currency ALWAYS travels
 * beside the amount on the wire; there is no default, because guessing one would
 * re-read a ¥120 rate as $120.
 */
export function formatMoneyFromCents(amountInCents: number | bigint, currency: string): string {
  const cents = toCentsBigInt(amountInCents);
  const magnitude = absoluteCents(cents);

  // Beyond float range, prefer an exact unlocalized label over a rounded pretty one.
  if (magnitude > MAX_SAFE_CENTS) {
    return `${currency} ${centsToDecimalString(cents)}`;
  }

  const showsWholeUnits = magnitude % CENTS_PER_UNIT === ZERO_CENTS;
  return new Intl.NumberFormat(MONEY_FORMATTING_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: showsWholeUnits ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(cents) / 100);
}

export function formatHourlyRateFromCents(
  rateInCentsPerHour: number | bigint,
  currency: string,
): string {
  return `${formatMoneyFromCents(rateInCentsPerHour, currency)}/hr`;
}

/** 6200 → "62%". 10000 basis points is 100%. */
export function formatEquityFromBasisPoints(basisPoints: number): string {
  const percent = basisPoints / BASIS_POINTS_PER_PERCENT;
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2)}%`;
}

/**
 * Signed on purpose — a member's share falls when others out-contribute them, and
 * hiding the minus sign would make the statement dishonest.
 */
export function formatSignedEquityFromBasisPoints(deltaBasisPoints: number): string {
  const sign = deltaBasisPoints > 0 ? "+" : deltaBasisPoints < 0 ? "−" : "±";
  return `${sign}${formatEquityFromBasisPoints(Math.abs(deltaBasisPoints))}`;
}

/** 8880 → "148 hrs". Minutes are the wire unit; hours are the reading unit. */
export function formatEffortFromMinutes(effortMinutes: number): string {
  const wholeHours = Math.floor(effortMinutes / MINUTES_PER_HOUR);
  const remainingMinutes = effortMinutes % MINUTES_PER_HOUR;
  return remainingMinutes === 0 ? `${wholeHours} hrs` : `${wholeHours} hrs ${remainingMinutes} min`;
}

const BYTES_PER_STEP = 1024;
const BYTE_UNIT_LABELS = ["B", "KB", "MB", "GB", "TB"];

/**
 * 1_887_437 → "1.8 MB". Returns "—" for null, which is the real value for a
 * link-hosted workshop file: the backend never measures a Drive URL, so the
 * column is NULL rather than 0.
 */
export function formatFileSizeFromBytes(sizeBytes: number | null): string {
  if (sizeBytes === null) return "—";
  if (sizeBytes < BYTES_PER_STEP) return `${sizeBytes} B`;

  let scaledSize = sizeBytes;
  let unitIndex = 0;
  while (scaledSize >= BYTES_PER_STEP && unitIndex < BYTE_UNIT_LABELS.length - 1) {
    scaledSize /= BYTES_PER_STEP;
    unitIndex += 1;
  }

  return `${scaledSize.toFixed(1)} ${BYTE_UNIT_LABELS[unitIndex]}`;
}

/**
 * An integer score in a stated range → a label, and `null` → the ABSENCE of a
 * score rather than a zero.
 *
 * This distinction is load-bearing and appears all over the surface:
 * `opportunityScorePoints` and investor confidence are both nullable when no job
 * has computed them yet. Rendering `null` as "0" publishes "no opportunity here"
 * as a finding about the place, when the only finding is about the pipeline.
 */
export function formatScorePoints(scorePoints: number | null): string {
  return scorePoints === null ? "Not computed yet" : String(scorePoints);
}

/**
 * "2026-07-31" → "Jul 31, 2026". Returns the input unchanged if it is not a
 * date-only ISO string, so a malformed payload is visible rather than silently
 * rendered as today.
 */
export function formatIsoDate(isoDate: string): string {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!dateParts) return isoDate;
  const [, year, month, day] = dateParts;
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

/** "2026-07-05T12:30:00Z" → "Jul 5, 2026 · 12:30 UTC". */
export function formatIsoInstant(isoInstant: string): string {
  const instantParts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(isoInstant);
  if (!instantParts) return isoInstant;
  const [, year, month, day, hour, minute] = instantParts;
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]} ${Number(day)}, ${year} · ${hour}:${minute} UTC`;
}

export function formatPeriodRange(periodStartDate: string, periodEndDate: string): string {
  const startParts = /^(\d{4})-(\d{2})-/.exec(periodStartDate);
  if (!startParts) return `${periodStartDate} – ${periodEndDate}`;
  const [, year, month] = startParts;
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]} ${year}`;
}

/**
 * A 64-char hash is unreadable, and a 24-bit prefix collides around 4,800
 * entries — so this is for DISPLAY ONLY. Never key a React list, a cache entry or
 * an equality test on the result; use the full hash for all three.
 */
export function shortenHashForDisplay(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

// --- Advertised compensation ranges -----------------------------------------
//
// A role's compensation and a talent profile's ask are both OPEN-ENDED RANGES with a
// nullable maximum, and both used to arrive as one pre-rendered `amountLabel` string.
// The client composes them now, so the dash, the currency and the percent sign all
// localize.
//
// An open-ended range renders as "X+" rather than "X–", because a trailing dash reads
// as a truncated string rather than as "at least".

function formatOpenEndedRange(
  minimumLabel: string,
  maximumLabel: string | null,
  suffix = "",
): string {
  return maximumLabel === null
    ? `${minimumLabel}+${suffix}`
    : `${minimumLabel}–${maximumLabel}${suffix}`;
}

export function formatMonthlySalaryRange(
  salaryMinInCentsPerMonth: number,
  salaryMaxInCentsPerMonth: number | null,
  currency: string,
): string {
  return formatOpenEndedRange(
    formatMoneyFromCents(salaryMinInCentsPerMonth, currency),
    salaryMaxInCentsPerMonth === null
      ? null
      : formatMoneyFromCents(salaryMaxInCentsPerMonth, currency),
    "/mo",
  );
}

export function formatOneTimeAmountRange(
  oneTimeMinInCents: number,
  oneTimeMaxInCents: number | null,
  currency: string,
): string {
  return formatOpenEndedRange(
    formatMoneyFromCents(oneTimeMinInCents, currency),
    oneTimeMaxInCents === null ? null : formatMoneyFromCents(oneTimeMaxInCents, currency),
  );
}

/**
 * An ADVERTISED OFFER, never a granted share. Equity comes solely from the §9 slice
 * ledger — no endpoint sets a member's stake from a request body — so copy around this
 * must never let a range read as an allocation.
 */
export function formatEquityBasisPointsRange(
  equityBasisPointsMin: number,
  equityBasisPointsMax: number | null,
): string {
  return formatOpenEndedRange(
    formatEquityFromBasisPoints(equityBasisPointsMin),
    equityBasisPointsMax === null ? null : formatEquityFromBasisPoints(equityBasisPointsMax),
  );
}
