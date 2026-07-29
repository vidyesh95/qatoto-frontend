// TRANSPORT: props-only — presentational server component. Fetches nothing; agreements,
// statements and the project compensation summary arrive as view states from
// project-detail, which read GET …/compensation-agreements, …/compensation-periods and
// …/compensation. The finalize / countersign / payment controls are client islands below.
import CompensationPeriodIsland from "@/components/home/research-and-development/sections/compensation-period-island";
import RndStatusPanel, {
  RndErrorPanel,
  RndMembersOnlyPanel,
  RndSignInRequiredPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import {
  formatHourlyRateFromCents,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatPeriodRange,
  shortenHashForDisplay,
} from "@/lib/rnd/format";
import type {
  CompensationAgreement,
  CompensationAgreementStatus,
  CompensationPeriodSummary,
  CompensationPeriodStatus,
  EngagementKind,
  ProjectCompensation,
} from "@/lib/rnd/compensation.schemas";
import type { MemberScopedItemViewState, MemberScopedListViewState } from "@/lib/rnd/view-state";

const ENGAGEMENT_KIND_LABELS: Record<EngagementKind, string> = {
  employee: "Employee",
  independent_contractor: "Independent contractor",
  unpaid_founder: "Unpaid founder",
};

/**
 * `withdrawn` is what BOTH endings write — a founder retracting and a member declining.
 * The status enum has no `declined`, so the label says the neutral truth rather than
 * guessing which of the two happened; the audit trail is where that distinction lives.
 */
const AGREEMENT_STATUS_LABELS: Record<CompensationAgreementStatus, string> = {
  proposed: "Proposed — awaiting the member",
  active: "Active",
  superseded: "Superseded by a later agreement",
  withdrawn: "Ended without being accepted",
};

const PERIOD_STATUS_LABELS: Record<CompensationPeriodStatus, string> = {
  open: "Open — figures still moving",
  finalized: "Finalized",
  superseded: "Superseded by a correction",
};

/**
 * The project's compensation surface: what people agreed to, what each month's statement
 * says, and what has actually been paid.
 *
 * THIS TAB REPLACES THE ONE PHASE 2 DELETED. The old Governance tab rendered a retired
 * escrow ledger off a mock shape — nine escrow paths now 404 and the tables survive
 * unreachable — so it was removed rather than left printing figures no mechanism backed.
 * What is here instead is §7A, which is a record of what the company says it owes and
 * what both parties agree it paid.
 *
 * NOTHING ON THIS PAGE IS A BALANCE. Qatoto holds no funds, charges nobody and takes no
 * fee; a payment row is an attestation that money moved somewhere else entirely.
 *
 * TWO TOTALS, AND THE GAP IS THE POINT: everything attested, versus everything a member
 * has confirmed receiving. The difference is exactly the money one side says it sent and
 * nobody has said they got.
 */
export default function CompensationTab({
  agreementsState,
  periodsState,
  compensationState,
  projectSlug,
  viewerProjectRole,
}: {
  agreementsState: MemberScopedListViewState<CompensationAgreement>;
  periodsState: MemberScopedListViewState<CompensationPeriodSummary>;
  compensationState: MemberScopedItemViewState<ProjectCompensation>;
  projectSlug: string;
  viewerProjectRole: string | null;
}) {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">What has been paid</h3>
        {renderPaidOut()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Monthly statements</h3>
        {renderPeriods()}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Cash agreements</h3>
        {renderAgreements()}
      </section>
    </div>
  );

  function renderPaidOut() {
    switch (compensationState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load this project's compensation." />;
      case "restricted":
        return compensationState.isSignInRequired ? (
          <RndSignInRequiredPanel message="Sign in to see this project's compensation." />
        ) : (
          <RndMembersOnlyPanel message="Compensation is visible to this project's team." />
        );
      case "ready": {
        const compensation = compensationState.item;
        return (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="text-xs text-muted-foreground">Attested as paid</p>
                <p className="text-xl font-semibold">
                  {formatMoneyFromCents(
                    BigInt(compensation.totalPaidOutInCents),
                    compensation.currency,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  What the company says it sent, confirmed or not.
                </p>
              </div>
              <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <p className="text-xs text-muted-foreground">Confirmed received</p>
                <p className="text-xl font-semibold">
                  {formatMoneyFromCents(
                    BigInt(compensation.totalConfirmedPaidInCents),
                    compensation.currency,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  What a member has acknowledged receiving. The gap between these two is the number
                  worth watching.
                </p>
              </div>
            </div>

            {compensation.paidOut.length > 0 && (
              <ul className="space-y-2">
                {compensation.paidOut.map((payment) => (
                  <li
                    key={payment.paymentId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{payment.memberName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatPeriodRange(payment.periodStartDate, payment.periodStartDate)} ·{" "}
                        {payment.methodKey.replaceAll("_", " ")} · paid{" "}
                        {formatIsoDate(payment.paidOnDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {formatMoneyFromCents(BigInt(payment.amountInCents), payment.currency)}
                      {/* Unconfirmed is NOT paid. Rendering it as paid would tell a
                          member they were paid on one party's word alone. */}
                      <span className="block text-xs text-muted-foreground">
                        {payment.confirmedByMemberAt === null
                          ? "Not yet confirmed by the member"
                          : `Confirmed ${formatIsoInstant(payment.confirmedByMemberAt)}`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {compensation.members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Locked hourly rates</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {compensation.members.map((member) => (
                    <li
                      key={member.memberId}
                      className="rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
                    >
                      <span className="font-medium">{member.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {/* Null is load-bearing: §9 refuses to price effort without a
                            locked rate, so a proposed one is not binding. */}
                        {member.lockedRate === null
                          ? "No locked rate — effort cannot be priced yet"
                          : `${formatHourlyRateFromCents(
                              BigInt(member.lockedRate.fairMarketRateCentsPerHour),
                              member.lockedRate.currencyCode,
                            )} fair market · ${formatHourlyRateFromCents(
                              BigInt(member.lockedRate.paidCashRateCentsPerHour),
                              member.lockedRate.currencyCode,
                            )} paid in cash`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }
      default: {
        const exhaustiveCheck: never = compensationState;
        return exhaustiveCheck;
      }
    }
  }

  function renderPeriods() {
    switch (periodsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the statements." />;
      case "restricted":
        return <RndMembersOnlyPanel message="Statements are visible to this project's team." />;
      case "empty":
        return <RndStatusPanel message="No statement has been opened yet." />;
      case "ready":
        return (
          <ul className="space-y-3">
            {periodsState.rows.map((period) => (
              <li key={period.id} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {formatPeriodRange(period.periodStartDate, period.periodEndDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Statement #{period.sequenceNumber} · {period.timeZone}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {PERIOD_STATUS_LABELS[period.status]}
                  </span>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {period.status === "open"
                    ? period.lastDraftedAt === null
                      ? "The nightly draft has not run yet — that is not the same as everyone being owed zero."
                      : `Last recomputed ${formatIsoInstant(period.lastDraftedAt)}. These figures still move.`
                    : period.finalizedAt !== null &&
                      `Finalized ${formatIsoInstant(period.finalizedAt)}`}
                  {period.countersignedAt !== null &&
                    ` · countersigned ${formatIsoInstant(period.countersignedAt)}`}
                  {period.statementHash !== null &&
                    ` · ${shortenHashForDisplay(period.statementHash)}`}
                </p>

                {period.supersededByPeriodId !== null && (
                  <p className="mt-1 text-xs text-amber-800">
                    Corrected by a later statement. Nothing here was edited — a correction is always
                    a new statement.
                  </p>
                )}

                <CompensationPeriodIsland
                  projectSlug={projectSlug}
                  periodId={period.id}
                  periodStatus={period.status}
                  isCountersigned={period.countersignedAt !== null}
                  viewerProjectRole={viewerProjectRole}
                />
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = periodsState;
        return exhaustiveCheck;
      }
    }
  }

  function renderAgreements() {
    switch (agreementsState.status) {
      case "error":
        return <RndErrorPanel message="Couldn't load the agreements." />;
      case "restricted":
        return <RndMembersOnlyPanel message="Agreements are visible to this project's team." />;
      case "empty":
        return (
          <RndStatusPanel message="Nobody has a cash agreement on this project. Equity-only teams are normal here — Slicing Pie is the default, not the exception." />
        );
      case "ready":
        return (
          <ul className="space-y-2">
            {agreementsState.rows.map((agreement) => (
              <li
                key={agreement.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">{agreement.memberName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ENGAGEMENT_KIND_LABELS[agreement.engagementKind]} · from{" "}
                    {formatIsoDate(agreement.effectiveFrom)}
                    {agreement.effectiveUntil !== null &&
                      ` to ${formatIsoDate(agreement.effectiveUntil)}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {agreement.rationaleNote}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {/* Exactly one basis is ever set — a DB CHECK enforces it, and the
                      propose endpoint 422s a body that sends both. */}
                  {agreement.monthlyAmountInCents !== null &&
                    `${formatMoneyFromCents(
                      BigInt(agreement.monthlyAmountInCents),
                      agreement.currencyCode,
                    )} / month`}
                  {agreement.hourlyRateCentsPerHour !== null &&
                    formatHourlyRateFromCents(
                      BigInt(agreement.hourlyRateCentsPerHour),
                      agreement.currencyCode,
                    )}
                  <span className="block text-xs text-muted-foreground">
                    {AGREEMENT_STATUS_LABELS[agreement.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = agreementsState;
        return exhaustiveCheck;
      }
    }
  }
}
