// TRANSPORT: props-only — pure derivation, no network.
//
// Compensation-specific display logic (R_AND_D_STRUCTURE.md §5.5, backend §7A).
// The generic wire-format renderers moved to `@/lib/rnd/format` so every phase of
// the surface shares one implementation; they are re-exported here because ~20
// components already import them from this path.

import type {
  CompensationPaymentRecord,
  CompensationPaymentState,
  CompensationPeriodLine,
} from "@/types/research-and-development";

export {
  formatEffortFromMinutes,
  formatEquityFromBasisPoints,
  formatFileSizeFromBytes,
  formatHourlyRateFromCents,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatPeriodRange,
  formatScorePoints,
  formatSignedEquityFromBasisPoints,
  shortenHashForDisplay,
} from "@/lib/rnd/format";

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
