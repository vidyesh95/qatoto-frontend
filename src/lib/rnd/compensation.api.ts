// TRANSPORT: server-fetch + client-query — every function takes an optional
// `RequestOptions`, so it is callable from BOTH sides.
//
// TWO DIFFERENT AUTHORIZATION SHAPES LIVE HERE, and mixing them up is the mistake this
// header exists to prevent:
//
// - The project-scoped routes are `requireAuth` plus membership and answer **`404`** to
//   everyone else — the same answer a slug that does not exist gets.
// - `GET /governance/summary` is root-mounted and `attachOptionalUser`. It MUST render
//   signed out, and it carries no per-member figure for anyone but the caller.
//
// THE ABSENCES ON THE GOVERNANCE ROUTER ARE DELIBERATE. There is no `/finalize`,
// `/countersign`, `/payments`, `/confirm` or `/export` there. Every one is actor-scoped
// and stays where the actor's role is already resolved from the slug; re-exposing them
// cross-project would mean re-deriving the actor from a body.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CompensationAgreementSchema,
  CompensationPaymentSchema,
  CompensationPeriodDetailSchema,
  CompensationPeriodSummarySchema,
  GovernanceSummarySchema,
  ProjectCompensationSchema,
  StatementChainVerificationSchema,
  type CompensationAgreement,
  type CompensationPayment,
  type CompensationPaymentMethodKey,
  type CompensationPeriodDetail,
  type CompensationPeriodStatus,
  type CompensationPeriodSummary,
  type EngagementKind,
  type GovernanceSummary,
  type ProjectCompensation,
  type StatementChainVerification,
} from "@/lib/rnd/compensation.schemas";

function projectPath(projectSlug: string, suffix: string): string {
  return `/research-projects/${projectSlug}${suffix}`;
}

// --- Reads --------------------------------------------------------------------

/**
 * The full effective-dated agreement history, newest first.
 *
 * `?memberId=` IS A PUBLIC USER ID, not a `project_member.id`. Every other route in this
 * domain addresses a person by their user id, and a filter keyed on the internal
 * membership id would be the only place a client had to know one exists.
 */
export function listCompensationAgreements(
  projectSlug: string,
  filter: { readonly memberId?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CompensationAgreement[]>> {
  return getJson(
    projectPath(projectSlug, `/compensation-agreements${buildQueryString({ ...filter })}`),
    CompensationAgreementSchema.array(),
    options,
  );
}

/**
 * A keyset page of statements, newest first.
 *
 * THE CURSOR IS `beforeSequenceNumber`, not a page number: statements are appended
 * monthly and a deep offset over a growing list re-reads rows it has already served.
 * Echo back the last `sequenceNumber` on the page to advance.
 */
export function listCompensationPeriods(
  projectSlug: string,
  filter: {
    readonly status?: CompensationPeriodStatus;
    readonly limit?: number;
    readonly beforeSequenceNumber?: number;
  } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPeriodSummary[]>> {
  return getJson(
    projectPath(projectSlug, `/compensation-periods${buildQueryString({ ...filter })}`),
    CompensationPeriodSummarySchema.array(),
    options,
  );
}

/**
 * One statement, with its lines and every payment attested against them.
 *
 * `lastDraftedAt` on an OPEN period is what stops a client implying a frozen number: the
 * figures move until finalize, and a statement rendered without its draft timestamp
 * asserts a finality it does not have.
 */
export function getCompensationPeriod(
  projectSlug: string,
  periodId: string,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPeriodDetail>> {
  return getJson(
    projectPath(projectSlug, `/compensation-periods/${periodId}`),
    CompensationPeriodDetailSchema,
    options,
  );
}

/**
 * Re-walks the statement chain.
 *
 * A BREAK COMES BACK AS `409 STATEMENT_CHAIN_BROKEN`, never as `200 { valid: false }`. A
 * failed result here is therefore a finding, not a retry.
 */
export function verifyStatementChain(
  projectSlug: string,
  periodId: string,
  options?: RequestOptions,
): Promise<ActionResponse<StatementChainVerification>> {
  return getJson(
    projectPath(projectSlug, `/compensation-periods/${periodId}/verify`),
    StatementChainVerificationSchema,
    options,
  );
}

/** Locked §9 rates, advertised offers, and every attested payment across the project. */
export function getProjectCompensation(
  projectSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ProjectCompensation>> {
  return getJson(projectPath(projectSlug, "/compensation"), ProjectCompensationSchema, options);
}

/**
 * The cross-project accountability rollup. Public aggregates, plus the CALLER'S OWN open
 * lines when signed in and nothing else.
 */
export function getGovernanceSummary(
  filter: { readonly page?: number; readonly limit?: number } = {},
  options?: RequestOptions,
): Promise<ActionResponse<GovernanceSummary>> {
  return getJson(
    `/governance/summary${buildQueryString({ ...filter })}`,
    GovernanceSummarySchema,
    options,
  );
}

/**
 * The export URL for a finalized statement.
 *
 * NOT A `fetch` — the response is a CSV or JSON download rather than an envelope, so this
 * builds the href a link points at. `admin` only: a CSV of every member's gross pay is the
 * whole team's compensation in one file, and reading your own statement does not imply
 * exporting everyone's.
 *
 * The "no withholding computed, not payroll or tax advice" notice travels IN the file,
 * because a CSV that arrives without it is one paste away from being someone's payslip.
 */
export function buildCompensationExportPath(
  projectSlug: string,
  periodId: string,
  format: "csv" | "json" = "csv",
): string {
  return projectPath(projectSlug, `/compensation-periods/${periodId}/export?format=${format}`);
}

// --- Writes -------------------------------------------------------------------

export interface ProposeAgreementInput {
  readonly engagementKind: EngagementKind;
  /** EXACTLY ONE of these two. Sending both, or neither on a paying kind, is a `422`. */
  readonly monthlyAmountInCents?: string;
  readonly hourlyRateCentsPerHour?: string;
  readonly effectiveFrom: string;
  readonly rationaleNote: string;
}

/**
 * The founder proposes.
 *
 * NO `currencyCode` IN THE BODY — it is derived from the project (§4b). A client-chosen
 * currency would let a $4,000/month agreement be re-read as ¥4,000/month.
 */
export function proposeCompensationAgreement(
  projectSlug: string,
  memberUserId: string,
  input: ProposeAgreementInput,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationAgreement>> {
  return sendJson(
    projectPath(projectSlug, `/members/${memberUserId}/compensation-agreement`),
    "POST",
    input,
    CompensationAgreementSchema,
    options,
  );
}

/**
 * THE MEMBER ACCEPTS, and never the proposer — `403` otherwise.
 *
 * Accepting trigger-freezes the numbers, and an hourly rate that disagrees with §9's
 * `paidCashRateCentsPerHour` is a `422`: the two describe the same cash and cannot differ.
 */
export function acceptCompensationAgreement(
  projectSlug: string,
  agreementId: string,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationAgreement>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-agreements/${agreementId}/accept`),
    "POST",
    undefined,
    CompensationAgreementSchema,
    options,
  );
}

/**
 * The member says no.
 *
 * WRITES `withdrawn`, not `declined` — the status enum has four values and `declined` is
 * not one of them. The audit entry `compensation_agreement_declined` is what distinguishes
 * this from a founder retraction, and the note has no column of its own; it lives in that
 * entry's `detailNote`.
 */
export function declineCompensationAgreement(
  projectSlug: string,
  agreementId: string,
  input: { readonly note?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CompensationAgreement>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-agreements/${agreementId}/decline`),
    "POST",
    input,
    CompensationAgreementSchema,
    options,
  );
}

/** The proposer retracts. Refused once `active` — a live agreement is superseded, never
 * withdrawn. */
export function withdrawCompensationAgreement(
  projectSlug: string,
  agreementId: string,
  input: { readonly reasonNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<CompensationAgreement>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-agreements/${agreementId}/withdraw`),
    "POST",
    input,
    CompensationAgreementSchema,
    options,
  );
}

/**
 * Finalize. THE BODY IS AN ACKNOWLEDGEMENT AND NO AMOUNTS.
 *
 * The server recomputes, freezes, hashes and appends one audit entry in the same
 * transaction. A body carrying figures would let the client decide what the statement says
 * — which is the whole thing this design exists to prevent.
 *
 * `409 PERIOD_NOT_READY` when the period has not closed; `409 RATE_NOT_LOCKED` when an
 * hourly line has no locked rate to price against.
 */
export function finalizeCompensationPeriod(
  projectSlug: string,
  periodId: string,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPeriodDetail>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-periods/${periodId}/finalize`),
    "POST",
    { acknowledgement: "FINALIZE" },
    CompensationPeriodDetailSchema,
    options,
  );
}

/**
 * Countersign — A DIFFERENT ADMIN, or a platform auditor.
 *
 * `422 SELF_COUNTERSIGN_FORBIDDEN` even for a founder: a second signature from the person
 * who signed first is not a second signature. `403` if the admin role has no recorded
 * grantor, because an admin who granted themselves the role is not independent either.
 */
export function countersignCompensationPeriod(
  projectSlug: string,
  periodId: string,
  input: { readonly note?: string } = {},
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPeriodDetail>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-periods/${periodId}/countersign`),
    "POST",
    input,
    CompensationPeriodDetailSchema,
    options,
  );
}

/**
 * Supersede — the ONLY way to correct a finalized statement.
 *
 * It creates a NEW period; nothing is ever edited. Editing would invalidate the statement
 * hash and every hash chained after it, which is exactly why there is no `PATCH` on a
 * period or a line anywhere in this file.
 */
export function supersedeCompensationPeriod(
  projectSlug: string,
  periodId: string,
  input: { readonly reasonNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPeriodDetail>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-periods/${periodId}/supersede`),
    "POST",
    input,
    CompensationPeriodDetailSchema,
    options,
  );
}

export interface RecordPaymentInput {
  readonly paidAmountInCents: string;
  readonly paidOnDate: string;
  readonly methodKey: CompensationPaymentMethodKey;
  readonly referenceNote?: string;
  readonly idempotencyKey: string;
}

/**
 * Attest that a payment was made ELSEWHERE.
 *
 * APPEND-ONLY, AND IT CHANGES NO LINE. Qatoto moved no money and holds none; this records
 * that the company says it paid. The endpoint rejects anything resembling a payment
 * instrument — there is no card, account or routing field, and there must never be one.
 */
export function recordCompensationPayment(
  projectSlug: string,
  lineId: string,
  input: RecordPaymentInput,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPayment>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-period-lines/${lineId}/payments`),
    "POST",
    input,
    CompensationPaymentSchema,
    options,
  );
}

/**
 * THE MEMBER CONFIRMS RECEIPT — and only the member, `403` otherwise.
 *
 * Until this lands the UI shows the payment as UNCONFIRMED, never as paid. A payment
 * nobody has acknowledged receiving is one party's claim, not a record.
 */
export function confirmCompensationPayment(
  projectSlug: string,
  lineId: string,
  paymentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<CompensationPayment>> {
  return sendJson(
    projectPath(projectSlug, `/compensation-period-lines/${lineId}/payments/${paymentId}/confirm`),
    "POST",
    undefined,
    CompensationPaymentSchema,
    options,
  );
}
