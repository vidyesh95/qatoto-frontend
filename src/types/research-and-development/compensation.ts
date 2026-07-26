// Month-end compensation statements (R_AND_D_STRUCTURE.md §5.5, backend §7A) —
// the pipeline's headline output and the replacement for the retired escrow
// ledger. Data truth lives in the Express backend; these shapes are the
// client-side contract only. UI-building phase: consumed from static mocks in
// `src/mocks/research-and-development-compensation-mocks.ts`, no fetch layer yet.
//
// Three non-negotiable rules the shapes here encode:
// 1. Qatoto holds no funds and charges nobody — a payment is *recorded* by the
//    parties, never moved by the platform. No account numbers, ever.
// 2. Cash is never reduced or withheld by a verification verdict. A flagged
//    claim annotates a line (`verificationNote`) and changes no number.
//    Verification gates equity, never a wage.
// 3. A statement is gross only — no tax, no withholding, no social contribution.
//
// Values follow the §11 wire format: integer cents / basis points / minutes with
// the unit in the field name, ISO-8601 instants (`…At`) and date-only calendar
// days (`…Date`). Every label on screen is composed by the client.

export type CompensationEngagementKind = "retainer" | "hourly" | "equity_only";

export type CompensationAgreementStatus = "proposed" | "accepted" | "declined" | "superseded";

type CompensationAgreementBase = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  status: CompensationAgreementStatus;
  proposedByName: string;
  proposedAt: string;
  // Null until the member accepts or declines.
  respondedAt: string | null;
  // How equity accrues under this agreement — copy only, never a number.
  equityPolicyNote: string;
};

// Discriminated on engagementKind so an equity-only agreement can carry no
// money field at all and a retainer can never be summed as an hourly line.
export type CompensationAgreement =
  | (CompensationAgreementBase & {
      engagementKind: "retainer";
      monthlyRetainerInCents: number;
      // ISO 4217, e.g. "USD".
      currency: string;
    })
  | (CompensationAgreementBase & {
      engagementKind: "hourly";
      hourlyRateInCents: number;
      currency: string;
      // Billing ceiling agreed up front; null when uncapped.
      monthlyCapMinutes: number | null;
    })
  | (CompensationAgreementBase & { engagementKind: "equity_only" });

export type CompensationPeriodStatus = "open" | "finalized" | "superseded";

type CompensationPeriodLineBase = {
  id: string;
  // Resolves against the owning project's teamMembers.
  memberId: string;
  // Set when a verification verdict annotates this line. Never changes a
  // number on a cash line — it is a footnote, not a deduction.
  verificationNote: string | null;
};

// Discriminated on kind — the union is what stops a client summing an equity
// delta into a cash total (backend §7A).
export type CompensationPeriodLine =
  | (CompensationPeriodLineBase & {
      kind: "cash_retainer";
      grossAmountInCents: number;
      currency: string;
    })
  | (CompensationPeriodLineBase & {
      kind: "cash_hourly";
      grossAmountInCents: number;
      currency: string;
      // The verified minutes behind the amount — shown under an hourly line.
      verifiedEffortMinutes: number;
      hourlyRateInCents: number;
    })
  | (CompensationPeriodLineBase & {
      kind: "equity_delta";
      openingEquityBasisPoints: number;
      closingEquityBasisPoints: number;
      // Signed: a share falls when others out-contribute you.
      deltaBasisPoints: number;
    });

export type CompensationPaymentMethodKey = "bank_transfer" | "mobile_money" | "cash" | "other";

// A record that the parties settled a line between themselves. Qatoto moves no
// money and stores no account details — this is an attestation, nothing more.
export type CompensationPaymentRecord = {
  id: string;
  // Resolves against a CompensationPeriodLine in the same period.
  lineId: string;
  paidAmountInCents: number;
  currency: string;
  paidOnDate: string;
  methodKey: CompensationPaymentMethodKey;
  recordedByName: string;
  recordedAt: string;
  // Null until the member themselves confirms receipt. A recorded-but-
  // unconfirmed payment renders as unconfirmed, never as paid.
  confirmedByMemberAt: string | null;
};

// Derived in the UI from whether a line has a payment record and whether the
// member confirmed it — never sent as a field.
export type CompensationPaymentState = "unpaid" | "recorded" | "confirmed";

// One month's statement. Corrections supersede; nothing is ever edited, so
// there is no PATCH on a period or a line.
export type CompensationPeriod = {
  id: string;
  periodStartDate: string;
  periodEndDate: string;
  // IANA zone the month boundary is computed in, e.g. "Africa/Nairobi".
  timeZone: string;
  status: CompensationPeriodStatus;
  // 64 lowercase hex chars once finalized; null while open. Render a short
  // form if you like — never key, cache or compare on it.
  statementHash: string | null;
  // Set only while open: the instant these still-moving numbers were computed.
  asOf: string | null;
  finalizedAt: string | null;
  finalizedByName: string | null;
  // Countersigned by a *different* admin than the finalizer.
  countersignedAt: string | null;
  countersignedByName: string | null;
  // Set on a superseded period, pointing at the correction that replaced it.
  supersededByPeriodId: string | null;
  // Why the correction was needed — set alongside supersededByPeriodId.
  supersedeReason: string | null;
  lines: CompensationPeriodLine[];
  payments: CompensationPaymentRecord[];
};

// A project's compensation surface: the standing agreements and every monthly
// statement. Member ids resolve against the matching ResearchProject.
export type ProjectCompensationLedger = {
  // Matches ResearchProject.id.
  projectId: string;
  agreements: CompensationAgreement[];
  // Newest period first.
  periods: CompensationPeriod[];
};
