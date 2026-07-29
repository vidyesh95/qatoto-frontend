import { z } from "zod";

// `GET /research-projects/:projectSlug/compensation-agreements`,
// `…/compensation-periods[/:periodId]`, `…/compensation-period-lines/:lineId/payments`,
// `…/compensation` and the root-mounted `GET /governance/summary`.
//
// Shapes mirror `compensation-agreements.service.ts`, `compensation-periods.service.ts`,
// `compensation-payments.service.ts`, `compensation.service.ts` and
// `governance-summary.service.ts`; enums are transcribed from `src/db/schema.ts`.
//
// THREE RULES SHAPE EVERY TYPE HERE, and each of them is a promise the product makes:
//
// 1. QATOTO HOLDS NO FUNDS. Nothing in this file is a balance, a charge, a hold or a fee.
//    `committedFundingInCents` is a sum of pledges someone COMMITTED to; a payment record
//    is an attestation that money moved somewhere else entirely.
// 2. A PAYMENT IS NOT PAID UNTIL BOTH SIDES SAY SO. `confirmedByMemberAt` is nullable and
//    a null renders as UNCONFIRMED — never as paid. There is no endpoint that marks a line
//    paid, deliberately, because payment is an attestation plus a confirmation or it is
//    not evidence.
// 3. EVERY STATEMENT IS GROSS. `grossOnlyNotice` travels IN-BAND with the numbers rather
//    than living in a frontend string table, precisely so no client can drop it and
//    present a statement as a payslip.

// --- Shared enums -------------------------------------------------------------

export const ENGAGEMENT_KINDS = ["employee", "independent_contractor", "unpaid_founder"] as const;
export const EngagementKindSchema = z.enum(ENGAGEMENT_KINDS);
export type EngagementKind = z.infer<typeof EngagementKindSchema>;

/**
 * FOUR values, and `declined` is not one of them.
 *
 * A member declining a proposal writes `withdrawn` — the status the column's own comment
 * defines as "a proposal nobody accepted" — and the audit entry
 * `compensation_agreement_declined` is what distinguishes it from a founder retraction.
 * Do not add a fifth value here to make the UI read better; it would fail the parse.
 */
export const COMPENSATION_AGREEMENT_STATUSES = [
  "proposed",
  "active",
  "superseded",
  "withdrawn",
] as const;
export const CompensationAgreementStatusSchema = z.enum(COMPENSATION_AGREEMENT_STATUSES);
export type CompensationAgreementStatus = z.infer<typeof CompensationAgreementStatusSchema>;

export const COMPENSATION_PERIOD_STATUSES = ["open", "finalized", "superseded"] as const;
export const CompensationPeriodStatusSchema = z.enum(COMPENSATION_PERIOD_STATUSES);
export type CompensationPeriodStatus = z.infer<typeof CompensationPeriodStatusSchema>;

export const COMPENSATION_PERIOD_LINE_KINDS = [
  "cash_retainer",
  "cash_hourly",
  "equity_delta",
] as const;
export const CompensationPeriodLineKindSchema = z.enum(COMPENSATION_PERIOD_LINE_KINDS);
export type CompensationPeriodLineKind = z.infer<typeof CompensationPeriodLineKindSchema>;

export const COMPENSATION_PAYMENT_METHOD_KEYS = [
  "bank_transfer",
  "sepa_transfer",
  "upi",
  "payroll_provider",
  "cash",
  "other",
] as const;
export const CompensationPaymentMethodKeySchema = z.enum(COMPENSATION_PAYMENT_METHOD_KEYS);
export type CompensationPaymentMethodKey = z.infer<typeof CompensationPaymentMethodKeySchema>;

// --- Agreements ---------------------------------------------------------------

/**
 * One effective-dated cash agreement.
 *
 * EXACTLY ONE BASIS IS SET: `monthlyAmountInCents` OR `hourlyRateCentsPerHour`, never
 * both and never neither for a paying engagement. A DB CHECK enforces it, and the propose
 * endpoint answers `422` on a body that sends two.
 *
 * NO `currencyCode` ON THE WAY IN — it is derived from the project. It comes BACK because
 * a reader needs to know what the number means.
 */
export const CompensationAgreementSchema = z
  .object({
    id: z.string(),
    memberId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    engagementKind: EngagementKindSchema,
    monthlyAmountInCents: z.string().nullable(),
    hourlyRateCentsPerHour: z.string().nullable(),
    currencyCode: z.string(),
    status: CompensationAgreementStatusSchema,
    effectiveFrom: z.string(),
    effectiveUntil: z.string().nullable(),
    rationaleNote: z.string(),
    proposedByUserId: z.string(),
    acceptedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type CompensationAgreement = z.infer<typeof CompensationAgreementSchema>;

// --- Periods, lines and payments ----------------------------------------------

/**
 * One line of a statement.
 *
 * `equityBasisPointsDelta` IS SIGNED, and a negative delta is the model working rather
 * than a bug: a member's share falls when others out-contribute them in that period.
 * Rendering it unsigned, or hiding negatives, would misreport the one number Slicing Pie
 * exists to compute.
 *
 * `verificationNote` is the ONLY place a verification verdict touches a cash line, and it
 * changes no number. Render it as an annotation beside the amount — never as the reason
 * the amount is lower, because it never is: verification does not reduce cash.
 */
export const CompensationPeriodLineSchema = z
  .object({
    id: z.string(),
    kind: CompensationPeriodLineKindSchema,
    memberId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    grossAmountInCents: z.string().nullable(),
    currency: z.string().nullable(),
    effortMinutes: z.number().nullable(),
    sourceAgreementId: z.string().nullable(),
    sourceRateId: z.string().nullable(),
    equityBasisPointsAtStart: z.number().nullable(),
    equityBasisPointsAtEnd: z.number().nullable(),
    equityBasisPointsDelta: z.number().nullable(),
    verificationNote: z.string().nullable(),
  })
  .strip();
export type CompensationPeriodLine = z.infer<typeof CompensationPeriodLineSchema>;

/**
 * One attested payment.
 *
 * `confirmedByMemberAt` IS NULL UNTIL THE MEMBER CONFIRMS RECEIPT, and every UI reading
 * this must render that null as UNCONFIRMED. A client showing an unconfirmed payment as
 * "paid" is telling someone they were paid on one party's word alone.
 */
export const CompensationPaymentSchema = z
  .object({
    id: z.string(),
    lineId: z.string(),
    paidAmountInCents: z.string(),
    currency: z.string(),
    paidOnDate: z.string(),
    methodKey: CompensationPaymentMethodKeySchema,
    referenceNote: z.string().nullable(),
    recordedByUserId: z.string(),
    confirmedByMemberAt: z.string().nullable(),
    confirmedByUserId: z.string().nullable(),
    createdAt: z.string(),
  })
  .strip();
export type CompensationPayment = z.infer<typeof CompensationPaymentSchema>;

/**
 * A period as it appears in the LIST — no lines.
 *
 * `lastDraftedAt` is returned on an open period so no client can imply a frozen number,
 * and NULL means the nightly draft has not run yet. That is different from "everyone is
 * owed zero", and the two must not render the same way.
 *
 * `statementHash` is null until finalize. Once set it is the full 64 hex characters; the
 * short form a UI shows is a rendering, never an identity.
 */
export const CompensationPeriodSummarySchema = z
  .object({
    id: z.string(),
    sequenceNumber: z.number(),
    periodStartDate: z.string(),
    periodEndDate: z.string(),
    timeZone: z.string(),
    status: CompensationPeriodStatusSchema,
    lastDraftedAt: z.string().nullable(),
    finalizedAt: z.string().nullable(),
    finalizedByUserId: z.string().nullable(),
    countersignedAt: z.string().nullable(),
    countersignedByUserId: z.string().nullable(),
    statementHash: z.string().nullable(),
    previousStatementHash: z.string().nullable(),
    hashVersion: z.string().nullable(),
    supersededByPeriodId: z.string().nullable(),
    grossOnlyNotice: z.string(),
  })
  .strip();
export type CompensationPeriodSummary = z.infer<typeof CompensationPeriodSummarySchema>;

/** The detail read: the same period plus its lines and every payment against them. */
export const CompensationPeriodDetailSchema = CompensationPeriodSummarySchema.extend({
  lines: CompensationPeriodLineSchema.array(),
  payments: CompensationPaymentSchema.array(),
}).strip();
export type CompensationPeriodDetail = z.infer<typeof CompensationPeriodDetailSchema>;

/**
 * The statement chain verifier.
 *
 * A BREAK IS `409 STATEMENT_CHAIN_BROKEN`, never a `200` carrying `valid: false` — the
 * same rule §9's audit verifier follows, and the reason there is no boolean here to render.
 */
export const StatementChainVerificationSchema = z
  .object({
    periodsChecked: z.number(),
    firstSequence: z.number().nullable(),
    lastSequence: z.number().nullable(),
    headStatementHash: z.string().nullable(),
  })
  .strip();
export type StatementChainVerification = z.infer<typeof StatementChainVerificationSchema>;

// --- The project compensation summary (`GET …/compensation`) -------------------

export const MemberCompensationRateSchema = z
  .object({
    rateId: z.string(),
    fairMarketRateCentsPerHour: z.string(),
    paidCashRateCentsPerHour: z.string(),
    currencyCode: z.string(),
    status: z.string(),
    effectiveFrom: z.string(),
    acceptedAt: z.string().nullable(),
    lockedAt: z.string().nullable(),
  })
  .strip();
export type MemberCompensationRate = z.infer<typeof MemberCompensationRateSchema>;

/**
 * One member's compensation position.
 *
 * `lockedRate` IS NULL WHEN NOTHING IS LOCKED, and that null is load-bearing rather than a
 * gap: §9 refuses to price effort without a locked rate (`409 RATE_NOT_LOCKED`), so
 * rendering a merely proposed rate as though it were binding would contradict the endpoint
 * that enforces it.
 */
export const MemberCompensationSchema = z
  .object({
    memberId: z.string(),
    userId: z.string(),
    name: z.string(),
    projectRole: z.string(),
    roleTitle: z.string().nullable(),
    lockedRate: MemberCompensationRateSchema.nullable(),
    rateHistory: MemberCompensationRateSchema.array(),
  })
  .strip();
export type MemberCompensation = z.infer<typeof MemberCompensationSchema>;

/**
 * What an open role advertises.
 *
 * `earnedAsPolicy` IS AN ENUM, not the free prose an earlier draft shipped as
 * `earnedAsLabel`. English sentences from the server force three native clients to render
 * un-localizable strings, and would let a founder write a payout promise no mechanism
 * honours. Two of its values are RETIRED — readable on old rows, never writable.
 */
export const AdvertisedCompensationSchema = z
  .object({
    openRoleId: z.string(),
    roleTitle: z.string(),
    kind: z.string(),
    salaryMinInCentsPerMonth: z.number().nullable(),
    salaryMaxInCentsPerMonth: z.number().nullable(),
    oneTimeMinInCents: z.number().nullable(),
    oneTimeMaxInCents: z.number().nullable(),
    equityBasisPointsMin: z.number().nullable(),
    equityBasisPointsMax: z.number().nullable(),
    earnedAsPolicy: z.string(),
  })
  .strip();
export type AdvertisedCompensation = z.infer<typeof AdvertisedCompensationSchema>;

export const PaidOutCompensationSchema = z
  .object({
    paymentId: z.string(),
    memberUserId: z.string(),
    memberName: z.string(),
    lineKind: z.string(),
    periodStartDate: z.string(),
    amountInCents: z.string(),
    currency: z.string(),
    /** The calendar day the payer says the money left. Never an invented instant. */
    paidOnDate: z.string(),
    methodKey: z.string(),
    confirmedByMemberAt: z.string().nullable(),
  })
  .strip();
export type PaidOutCompensation = z.infer<typeof PaidOutCompensationSchema>;

/**
 * `GET …/compensation` — rates, advertised offers and every attested payment.
 *
 * TWO TOTALS, AND THE GAP BETWEEN THEM IS THE POINT. `totalPaidOutInCents` counts every
 * attestation; `totalConfirmedPaidInCents` counts only what a member has acknowledged
 * receiving. The difference is exactly the money a founder says they sent and nobody has
 * said they received — which is why showing only the first would be the most misleading
 * number on the page.
 */
export const ProjectCompensationSchema = z
  .object({
    currency: z.string(),
    members: MemberCompensationSchema.array(),
    advertised: AdvertisedCompensationSchema.array(),
    paidOut: PaidOutCompensationSchema.array(),
    totalPaidOutInCents: z.string(),
    totalConfirmedPaidInCents: z.string(),
  })
  .strip();
export type ProjectCompensation = z.infer<typeof ProjectCompensationSchema>;

// --- Governance summary (`GET /governance/summary`) ---------------------------

/**
 * KEYS, NOT SENTENCES. The backend ships these three so every client localizes the same
 * three promises itself — prose from the server would force un-localizable strings on
 * three native clients, and would let the wording drift between them.
 */
export const GOVERNANCE_DISCLOSURE_KEYS = [
  "platform_holds_no_funds",
  "verification_never_reduces_cash",
  "statement_is_gross_only",
] as const;
export const GovernanceDisclosureKeySchema = z.enum(GOVERNANCE_DISCLOSURE_KEYS);
export type GovernanceDisclosureKey = z.infer<typeof GovernanceDisclosureKeySchema>;

export const GovernancePeriodCountsSchema = z
  .object({
    openPeriodCount: z.number(),
    finalizedPeriodCount: z.number(),
    supersededPeriodCount: z.number(),
    /** Orthogonal to status: a finalized period may or may not be countersigned yet. */
    countersignedPeriodCount: z.number(),
  })
  .strip();
export type GovernancePeriodCounts = z.infer<typeof GovernancePeriodCountsSchema>;

/**
 * One project's public rollup. COUNTS AND MECHANICS, NEVER PEOPLE.
 *
 * A statement line names a person and what they are owed, and pay is personal data under
 * the GDPR — so the cross-project surface carries no member id, no name and no per-member
 * amount. Those stay on the per-project tab, behind membership.
 *
 * `committedFundingInCents` IS COMMITTED, not collected, held or charged. Qatoto operates
 * no money rail, and no label built from this field may imply one.
 *
 * `investorConfidenceBasisPoints` is NULL when no snapshot was ever computed — never a
 * fabricated zero, which would publish "no confidence" as a finding about the project
 * rather than about the job that has not run.
 */
export const GovernanceProjectRollupSchema = GovernancePeriodCountsSchema.extend({
  projectSlug: z.string(),
  projectName: z.string(),
  projectCoverImageUrl: z.string().nullable(),
  projectStage: z.string(),
  currency: z.string(),
  committedFundingInCents: z.string(),
  investorConfidenceBasisPoints: z.number().nullable(),
  investorConfidenceAsOf: z.string().nullable(),
}).strip();
export type GovernanceProjectRollup = z.infer<typeof GovernanceProjectRollupSchema>;

/** One of the CALLER'S OWN lines. No other member's line is ever shaped into this. */
export const GovernanceCallerLineSchema = z
  .object({
    projectSlug: z.string(),
    periodId: z.string(),
    periodStartDate: z.string(),
    periodEndDate: z.string(),
    kind: CompensationPeriodLineKindSchema,
    /** Null on an equity line — equity is not money and is never summed with it. */
    grossAmountInCents: z.string().nullable(),
    currency: z.string().nullable(),
    effortMinutes: z.number().nullable(),
    equityBasisPointsDelta: z.number().nullable(),
  })
  .strip();
export type GovernanceCallerLine = z.infer<typeof GovernanceCallerLineSchema>;

/**
 * The public accountability rollup.
 *
 * `attachOptionalUser`, NOT `requireAuth` — this page publishes the three disclosure rules
 * and must render signed out. `callerOpenLines` is EMPTY for a signed-out caller and is
 * never populated from anyone else's membership.
 *
 * `asOf` exists because every count is as of that instant rather than "now". A rollup
 * presented as live would be asserting freshness it does not have.
 */
export const GovernanceSummarySchema = z
  .object({
    asOf: z.string(),
    platformTotals: GovernancePeriodCountsSchema,
    projects: GovernanceProjectRollupSchema.array(),
    projectsTotal: z.number(),
    callerOpenLines: GovernanceCallerLineSchema.array(),
    disclosureKeys: GovernanceDisclosureKeySchema.array(),
    grossOnlyNotice: z.string(),
  })
  .strip();
export type GovernanceSummary = z.infer<typeof GovernanceSummarySchema>;
