// Display formatting for the typed integers the compensation and oversight
// fixtures carry (R_AND_D_STRUCTURE.md §11). The server sends cents, basis
// points, minutes and ISO strings; composing the sentence is the client's job,
// which is what makes the same payload renderable by the web, Android and iOS
// clients in their own locale.
//
// Every helper here is deterministic and timezone-free on purpose: ISO strings
// are parsed by pattern rather than by `new Date()`, so a server render and a
// client render can never disagree and no hydration mismatch is possible.

import type {
  CompensationPaymentRecord,
  CompensationPaymentState,
  CompensationPeriodLine,
} from "@/types/research-and-development";

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
const CENTS_PER_UNIT = 100;
const MINUTES_PER_HOUR = 60;

// Fixed locale so a server render and a client render always agree.
const MONEY_FORMATTING_LOCALE = "en-US";

export function formatMoneyFromCents(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat(MONEY_FORMATTING_LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: amountInCents % CENTS_PER_UNIT === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountInCents / CENTS_PER_UNIT);
}

export function formatHourlyRateFromCents(rateInCentsPerHour: number, currency: string): string {
  return `${formatMoneyFromCents(rateInCentsPerHour, currency)}/hr`;
}

export function formatEquityFromBasisPoints(basisPoints: number): string {
  const percent = basisPoints / BASIS_POINTS_PER_PERCENT;
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2)}%`;
}

// Signed on purpose — a member's share falls when others out-contribute them,
// and hiding the minus sign would make the statement dishonest.
export function formatSignedEquityFromBasisPoints(deltaBasisPoints: number): string {
  const sign = deltaBasisPoints > 0 ? "+" : deltaBasisPoints < 0 ? "−" : "±";
  return `${sign}${formatEquityFromBasisPoints(Math.abs(deltaBasisPoints))}`;
}

export function formatEffortFromMinutes(effortMinutes: number): string {
  const wholeHours = Math.floor(effortMinutes / MINUTES_PER_HOUR);
  const remainingMinutes = effortMinutes % MINUTES_PER_HOUR;
  return remainingMinutes === 0 ? `${wholeHours} hrs` : `${wholeHours} hrs ${remainingMinutes} min`;
}

// "2026-07-31" → "Jul 31, 2026". Returns the input unchanged if it is not a
// date-only ISO string, so a malformed fixture is visible rather than silently
// rendered as today.
export function formatIsoDate(isoDate: string): string {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!dateParts) return isoDate;
  const [, year, month, day] = dateParts;
  return `${MONTH_ABBREVIATIONS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

// "2026-07-05T12:30:00Z" → "Jul 5, 2026 · 12:30 UTC".
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

// A 64-char hash is unreadable and a 24-bit prefix collides around 4,800
// entries — so this is for display only. Never key, cache or compare on it.
export function shortenHashForDisplay(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

export function derivePaymentState(
  line: CompensationPeriodLine,
  payments: CompensationPaymentRecord[],
): CompensationPaymentState {
  const matchingPayment = payments.find((payment) => payment.lineId === line.id);
  if (!matchingPayment) return "unpaid";
  return matchingPayment.confirmedByMemberAt === null ? "recorded" : "confirmed";
}

export const PAYMENT_STATE_BADGES: Record<
  CompensationPaymentState,
  { label: string; className: string }
> = {
  unpaid: { label: "Unpaid", className: "bg-muted text-muted-foreground" },
  // Deliberately not "Paid": a payment the member has not confirmed is a
  // one-sided claim, and rendering it as settled would be a lie to the member.
  recorded: { label: "Recorded · unconfirmed", className: "bg-amber-100 text-amber-800" },
  confirmed: { label: "Confirmed by member", className: "bg-[#00696E]/10 text-[#00696E]" },
};
