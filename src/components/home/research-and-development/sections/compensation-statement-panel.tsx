// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import { useState } from "react";

import {
  derivePaymentState,
  formatEffortFromMinutes,
  formatEquityFromBasisPoints,
  formatHourlyRateFromCents,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatPeriodRange,
  formatSignedEquityFromBasisPoints,
  shortenHashForDisplay,
  PAYMENT_STATE_BADGES,
} from "@/components/home/research-and-development/sections/compensation-format";
import type {
  CompensationPaymentRecord,
  CompensationPeriod,
  CompensationPeriodLine,
  CompensationPeriodStatus,
  TeamMember,
} from "@/types/research-and-development";

// Who the viewer is acting as. Finalizing, countersigning and recording a
// payment are founder/admin powers; confirming that a payment actually arrived
// is the member's alone, and nobody can confirm on their behalf. In the mock
// phase there is no session, so the role is switchable to make all four
// capabilities reachable.
type StatementViewerRole = "founder" | "second_admin" | "member";

const VIEWER_ROLE_LABELS: Record<StatementViewerRole, string> = {
  founder: "Founder",
  second_admin: "Second admin",
  member: "Member",
};

const VIEWER_ROLE_ORDER: StatementViewerRole[] = ["founder", "second_admin", "member"];

const PERIOD_STATUS_BADGES: Record<CompensationPeriodStatus, { label: string; className: string }> =
  {
    open: { label: "Open — still moving", className: "bg-blue-100 text-blue-800" },
    finalized: { label: "Finalized", className: "bg-[#00696E]/10 text-[#00696E]" },
    superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
  };

const LINE_KIND_LABELS: Record<CompensationPeriodLine["kind"], string> = {
  cash_retainer: "Cash · retainer",
  cash_hourly: "Cash · hourly",
  equity_delta: "Equity delta",
};

type CompensationStatementPanelProps = {
  projectName: string;
  periods: CompensationPeriod[];
  teamMembers: TeamMember[];
};

// Month-end compensation statement (§5.5). Every action below mutates local
// state only — Qatoto holds no funds, charges nobody, and moves no money in this
// domain. "Record a payment" writes an attestation that the two parties settled
// it between themselves; it is not a transfer.
export default function CompensationStatementPanel({
  projectName,
  periods,
  teamMembers,
}: CompensationStatementPanelProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [viewerRole, setViewerRole] = useState<StatementViewerRole>("founder");
  const [recordedPayments, setRecordedPayments] = useState<CompensationPaymentRecord[]>([]);
  const [confirmedPaymentIds, setConfirmedPaymentIds] = useState<string[]>([]);
  const [finalizedPeriodIds, setFinalizedPeriodIds] = useState<string[]>([]);
  const [countersignedPeriodIds, setCountersignedPeriodIds] = useState<string[]>([]);

  const selectedPeriod = periods.find((period) => period.id === selectedPeriodId) ?? periods[0];
  if (!selectedPeriod) {
    return (
      <p className="rounded-2xl border border-[#CAC4D0]/60 p-4 text-sm text-muted-foreground">
        No compensation period has been computed for {projectName} yet.
      </p>
    );
  }

  const findMember = (memberId: string) =>
    teamMembers.find((teamMember) => teamMember.id === memberId);

  // The member whose confirmations the viewer can give — the first member on
  // the statement with a cash line, since equity lines are never "paid".
  const viewerMemberId =
    selectedPeriod.lines.find((line) => line.kind !== "equity_delta")?.memberId ?? null;
  const viewerMember = viewerMemberId ? findMember(viewerMemberId) : undefined;

  const isLocallyFinalized = finalizedPeriodIds.includes(selectedPeriod.id);
  const isLocallyCountersigned = countersignedPeriodIds.includes(selectedPeriod.id);
  const effectiveStatus: CompensationPeriodStatus =
    selectedPeriod.status === "open" && isLocallyFinalized ? "finalized" : selectedPeriod.status;
  const finalizedByName = selectedPeriod.finalizedByName ?? (isLocallyFinalized ? "You" : null);
  const countersignedByName =
    selectedPeriod.countersignedByName ?? (isLocallyCountersigned ? "You" : null);

  const periodPayments = [
    ...selectedPeriod.payments,
    ...recordedPayments.filter((payment) =>
      selectedPeriod.lines.some((line) => line.id === payment.lineId),
    ),
  ].map((payment) =>
    confirmedPaymentIds.includes(payment.id) && payment.confirmedByMemberAt === null
      ? { ...payment, confirmedByMemberAt: new Date().toISOString() }
      : payment,
  );

  const findPaymentForLine = (lineId: string) =>
    periodPayments.find((payment) => payment.lineId === lineId);

  const handleRecordPaymentClick = (line: CompensationPeriodLine) => {
    if (line.kind === "equity_delta") return;
    setRecordedPayments((currentPayments) => [
      ...currentPayments,
      {
        id: `local-payment-${line.id}`,
        lineId: line.id,
        paidAmountInCents: line.grossAmountInCents,
        currency: line.currency,
        paidOnDate: new Date().toISOString().slice(0, 10),
        methodKey: "bank_transfer",
        recordedByName: "You",
        recordedAt: new Date().toISOString(),
        confirmedByMemberAt: null,
      },
    ]);
  };

  const handleConfirmPaymentClick = (paymentId: string) =>
    setConfirmedPaymentIds((currentIds) =>
      currentIds.includes(paymentId) ? currentIds : [...currentIds, paymentId],
    );

  const handleFinalizeClick = () =>
    setFinalizedPeriodIds((currentIds) => [...currentIds, selectedPeriod.id]);

  const handleCountersignClick = () =>
    setCountersignedPeriodIds((currentIds) => [...currentIds, selectedPeriod.id]);

  const buildExportRows = () =>
    selectedPeriod.lines.map((line) => {
      const member = findMember(line.memberId);
      const payment = findPaymentForLine(line.id);
      const sharedFields = {
        periodStartDate: selectedPeriod.periodStartDate,
        periodEndDate: selectedPeriod.periodEndDate,
        timeZone: selectedPeriod.timeZone,
        memberName: member?.name ?? line.memberId,
        lineKind: line.kind,
        paymentState: derivePaymentState(line, periodPayments),
        paidOnDate: payment?.paidOnDate ?? "",
        confirmedByMemberAt: payment?.confirmedByMemberAt ?? "",
      };
      if (line.kind === "equity_delta") {
        return {
          ...sharedFields,
          grossAmountInCents: "",
          currency: "",
          verifiedEffortMinutes: "",
          openingEquityBasisPoints: line.openingEquityBasisPoints,
          closingEquityBasisPoints: line.closingEquityBasisPoints,
          deltaBasisPoints: line.deltaBasisPoints,
        };
      }
      return {
        ...sharedFields,
        grossAmountInCents: line.grossAmountInCents,
        currency: line.currency,
        verifiedEffortMinutes: line.kind === "cash_hourly" ? line.verifiedEffortMinutes : "",
        openingEquityBasisPoints: "",
        closingEquityBasisPoints: "",
        deltaBasisPoints: "",
      };
    });

  // Exports carry the raw integers, not the formatted labels — a payroll
  // provider needs cents, not "$1,980".
  const downloadExport = (fileExtension: "csv" | "json") => {
    const exportRows = buildExportRows();
    const fileText =
      fileExtension === "json"
        ? JSON.stringify(exportRows, null, 2)
        : [
            Object.keys(exportRows[0] ?? {}).join(","),
            ...exportRows.map((exportRow) =>
              Object.values(exportRow)
                .map((cellValue) => `"${String(cellValue).replaceAll('"', '""')}"`)
                .join(","),
            ),
          ].join("\n");
    const downloadUrl = URL.createObjectURL(
      new Blob([fileText], { type: fileExtension === "json" ? "application/json" : "text/csv" }),
    );
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = `${selectedPeriod.id}-statement.${fileExtension}`;
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const cashTotalsByCurrency = selectedPeriod.lines.reduce<Record<string, number>>(
    (runningTotals, line) => {
      if (line.kind === "equity_delta") return runningTotals;
      return {
        ...runningTotals,
        [line.currency]: (runningTotals[line.currency] ?? 0) + line.grossAmountInCents,
      };
    },
    {},
  );

  const supersedingPeriod = selectedPeriod.supersededByPeriodId
    ? periods.find((period) => period.id === selectedPeriod.supersededByPeriodId)
    : undefined;

  const statusBadge = PERIOD_STATUS_BADGES[effectiveStatus];
  const canFinalize = viewerRole === "founder" && effectiveStatus === "open";
  const canCountersign =
    viewerRole === "second_admin" &&
    effectiveStatus === "finalized" &&
    countersignedByName === null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((period) => {
          const isSelected = period.id === selectedPeriod.id;
          return (
            <button
              key={period.id}
              type="button"
              onClick={() => setSelectedPeriodId(period.id)}
              aria-pressed={isSelected}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              {formatPeriodRange(period.periodStartDate, period.periodEndDate)}
              {period.status === "superseded" ? " · superseded" : ""}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/40 p-3">
        <span className="text-xs text-muted-foreground">Mock role switch — acting as:</span>
        {VIEWER_ROLE_ORDER.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setViewerRole(role)}
            aria-pressed={viewerRole === role}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              viewerRole === role ? "bg-[#00696E] text-white" : "bg-background hover:bg-muted"
            }`}
          >
            {VIEWER_ROLE_LABELS[role]}
            {role === "member" && viewerMember ? ` · ${viewerMember.name}` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold">
            {formatPeriodRange(selectedPeriod.periodStartDate, selectedPeriod.periodEndDate)}{" "}
            statement
          </h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
            {statusBadge.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatIsoDate(selectedPeriod.periodStartDate)} –{" "}
          {formatIsoDate(selectedPeriod.periodEndDate)} · month boundary in{" "}
          {selectedPeriod.timeZone}
        </p>
        {effectiveStatus === "open" ? (
          <p className="text-xs text-muted-foreground">
            Nothing is frozen. Figures as of{" "}
            {selectedPeriod.asOf ? formatIsoInstant(selectedPeriod.asOf) : "—"} and they may still
            move before finalization.
          </p>
        ) : (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Finalized by {finalizedByName ?? "—"}
              {selectedPeriod.finalizedAt
                ? ` · ${formatIsoInstant(selectedPeriod.finalizedAt)}`
                : ""}
            </p>
            <p>
              {countersignedByName
                ? `Countersigned by ${countersignedByName}${
                    selectedPeriod.countersignedAt
                      ? ` · ${formatIsoInstant(selectedPeriod.countersignedAt)}`
                      : ""
                  }`
                : "Awaiting countersignature from a second admin."}
            </p>
            {selectedPeriod.statementHash && (
              <p className="font-mono">
                Statement hash {shortenHashForDisplay(selectedPeriod.statementHash)}
                <span className="ml-2 font-sans">
                  (display only — the full 64-char hash is the identity)
                </span>
              </p>
            )}
          </div>
        )}
        {selectedPeriod.supersedeReason && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            {selectedPeriod.supersedeReason}
            {supersedingPeriod && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setSelectedPeriodId(supersedingPeriod.id)}
                  className="cursor-pointer font-medium underline"
                >
                  Open the correction
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {Object.entries(cashTotalsByCurrency).map(([currency, totalInCents]) => (
          <div key={currency} className="rounded-2xl border border-[#CAC4D0]/60 p-4">
            <p className="text-xs text-muted-foreground">Gross cash owed · {currency}</p>
            <p className="text-xl font-semibold">{formatMoneyFromCents(totalInCents, currency)}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <p className="text-xs text-muted-foreground">Statement lines</p>
          <p className="text-xl font-semibold">{selectedPeriod.lines.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-200 text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Member</th>
              <th className="py-2 pr-4 font-medium">Line</th>
              <th className="py-2 pr-4 font-medium">Basis</th>
              <th className="py-2 pr-4 font-medium">Owed</th>
              <th className="py-2 pr-4 font-medium">Payment</th>
              <th className="py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {selectedPeriod.lines.map((line) => {
              const member = findMember(line.memberId);
              const payment = findPaymentForLine(line.id);
              const paymentState = derivePaymentState(line, periodPayments);
              const paymentBadge = PAYMENT_STATE_BADGES[paymentState];
              const isEquityLine = line.kind === "equity_delta";
              const canRecordPayment =
                !isEquityLine &&
                paymentState === "unpaid" &&
                (viewerRole === "founder" || viewerRole === "second_admin");
              const canConfirmPayment =
                !isEquityLine &&
                paymentState === "recorded" &&
                viewerRole === "member" &&
                line.memberId === viewerMemberId &&
                payment !== undefined;

              return (
                <tr key={line.id} className="border-b border-border/50 align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">{member?.name ?? line.memberId}</td>
                  <td className="py-3 pr-4 whitespace-nowrap">{LINE_KIND_LABELS[line.kind]}</td>
                  <td className="py-3 pr-4">
                    {line.kind === "cash_hourly" && (
                      <span className="text-muted-foreground">
                        {formatEffortFromMinutes(line.verifiedEffortMinutes)} verified ×{" "}
                        {formatHourlyRateFromCents(line.hourlyRateInCents, line.currency)}
                      </span>
                    )}
                    {line.kind === "cash_retainer" && (
                      <span className="text-muted-foreground">Flat monthly retainer</span>
                    )}
                    {line.kind === "equity_delta" && (
                      <span className="text-muted-foreground">
                        {formatEquityFromBasisPoints(line.openingEquityBasisPoints)} →{" "}
                        {formatEquityFromBasisPoints(line.closingEquityBasisPoints)}
                      </span>
                    )}
                    {line.verificationNote && (
                      <p className="mt-1 text-xs text-amber-800">{line.verificationNote}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 font-medium whitespace-nowrap">
                    {isEquityLine
                      ? formatSignedEquityFromBasisPoints(line.deltaBasisPoints)
                      : formatMoneyFromCents(line.grossAmountInCents, line.currency)}
                  </td>
                  <td className="py-3 pr-4">
                    {isEquityLine ? (
                      <span className="text-xs text-muted-foreground">Not a payment</span>
                    ) : (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${paymentBadge.className}`}
                      >
                        {paymentBadge.label}
                      </span>
                    )}
                    {payment?.confirmedByMemberAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Paid {formatIsoDate(payment.paidOnDate)}
                      </p>
                    )}
                  </td>
                  <td className="py-3">
                    {canRecordPayment && (
                      <button
                        type="button"
                        onClick={() => handleRecordPaymentClick(line)}
                        className="cursor-pointer rounded-full border border-[#6F7979] px-3 py-1.5 text-xs font-medium text-[#00696E]"
                      >
                        Record payment
                      </button>
                    )}
                    {canConfirmPayment && payment && (
                      <button
                        type="button"
                        onClick={() => handleConfirmPaymentClick(payment.id)}
                        className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Confirm receipt
                      </button>
                    )}
                    {!canRecordPayment && !canConfirmPayment && (
                      <span className="text-xs text-muted-foreground">
                        {isEquityLine
                          ? "—"
                          : paymentState === "recorded"
                            ? "Awaiting the member"
                            : paymentState === "confirmed"
                              ? "Settled"
                              : "Founder records this"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canFinalize}
          onClick={handleFinalizeClick}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          Finalize period
        </button>
        <button
          type="button"
          disabled={!canCountersign}
          onClick={handleCountersignClick}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Countersign
        </button>
        <button
          type="button"
          onClick={() => downloadExport("csv")}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => downloadExport("json")}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium"
        >
          Export JSON
        </button>
      </div>

      <div className="space-y-1 rounded-2xl bg-[#00696E]/5 p-4 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Gross only.</span> No tax, withholding or
          social contribution is calculated anywhere on this statement — Qatoto is not a payroll
          processor. Export the raw figures to your own provider.
        </p>
        <p>
          <span className="font-medium text-foreground">Qatoto holds no funds.</span> Recording a
          payment is an attestation that the two parties settled it between themselves. Nothing is
          charged, held or transferred by the platform.
        </p>
        <p>
          <span className="font-medium text-foreground">A flag never reduces a wage.</span>{" "}
          Verification annotates a cash line and changes no number; it gates equity only.
        </p>
        <p>
          Corrections supersede — a finalized statement is never edited. Every figure here is a
          static mock this phase.
        </p>
      </div>
    </section>
  );
}
