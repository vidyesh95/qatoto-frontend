"use client";

import { useState } from "react";
import { LABEL_CLASS } from "@/components/ui/field-classes";
import { API_BASE_URL } from "@/lib/api";
import { buildCompensationExportPath } from "@/lib/rnd/compensation.api";
import {
  COMPENSATION_PAYMENT_METHOD_KEYS,
  CompensationPaymentMethodKeySchema,
  type CompensationPayment,
  type CompensationPaymentMethodKey,
  type CompensationPeriodLine,
  type CompensationPeriodLineKind,
  type CompensationPeriodStatus,
  type StatementChainVerification,
} from "@/lib/rnd/compensation.schemas";
import {
  formatEffortFromMinutes,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatSignedEquityFromBasisPoints,
  shortenHashForDisplay,
} from "@/lib/rnd/format";
import { ApiRequestError } from "@/lib/http";

const LINE_KIND_LABELS: Record<CompensationPeriodLineKind, string> = {
  cash_retainer: "Cash · retainer",
  cash_hourly: "Cash · hourly",
  equity_delta: "Equity delta",
};

const PAYMENT_METHOD_LABELS: Record<CompensationPaymentMethodKey, string> = {
  bank_transfer: "Bank transfer",
  sepa_transfer: "SEPA transfer",
  upi: "UPI",
  payroll_provider: "Payroll provider",
  cash: "Cash",
  other: "Other",
};

export function StatementChainVerificationView({
  isPending,
  error,
  verification,
}: {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly verification: StatementChainVerification | undefined;
}) {
  if (isPending) {
    return <p className="text-xs text-muted-foreground">Re-walking the statement chain…</p>;
  }

  const verificationError = error instanceof ApiRequestError ? error.apiError : null;

  if (verificationError !== null) {
    return (
      <div className="space-y-1 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
        <p className="font-medium">The statement chain did not verify.</p>
        <p className="text-xs">
          {verificationError.code} · {verificationError.message}
        </p>
        <p className="text-xs">
          This is not a display problem. Report it rather than retrying — a finalized statement is
          never edited, so a break means something changed that should not have.
        </p>
      </div>
    );
  }

  if (verification === undefined) return null;

  return (
    <div className="space-y-1 rounded-2xl border border-primary-imprint/30 bg-primary-imprint/5 p-3 text-sm">
      <p className="font-medium text-primary-imprint">
        {verification.periodsChecked} statement
        {verification.periodsChecked === 1 ? "" : "s"} re-walked, and every one checked out.
      </p>
      <p className="text-xs text-muted-foreground">
        Sequences {verification.firstSequence ?? "—"} to {verification.lastSequence ?? "—"}
        {verification.headStatementHash !== null &&
          ` · head ${shortenHashForDisplay(verification.headStatementHash)}`}
      </p>
    </div>
  );
}

function CompensationRecordPaymentForm({
  onSubmit,
  isPending,
}: {
  readonly onSubmit: (input: {
    readonly paidAmountInCents: string;
    readonly paidOnDate: string;
    readonly methodKey: CompensationPaymentMethodKey;
    readonly referenceNote?: string;
  }) => void;
  readonly isPending: boolean;
}) {
  const [paidAmountInCents, setPaidAmountInCents] = useState("");
  const [paidOnDate, setPaidOnDate] = useState("");
  const [methodKey, setMethodKey] = useState<CompensationPaymentMethodKey>("bank_transfer");
  const [referenceNote, setReferenceNote] = useState("");

  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        onSubmit({
          paidAmountInCents,
          paidOnDate,
          methodKey,
          referenceNote: referenceNote.length > 0 ? referenceNote : undefined,
        });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Amount paid in cents</span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]*"
          value={paidAmountInCents}
          onChange={(changeEvent) => setPaidAmountInCents(changeEvent.target.value)}
          placeholder="Amount in whole cents"
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Paid on</span>
        <input
          required
          type="date"
          value={paidOnDate}
          onChange={(changeEvent) => setPaidOnDate(changeEvent.target.value)}
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Payment method</span>
        <select
          value={methodKey}
          onChange={(changeEvent) => {
            const parsed = CompensationPaymentMethodKeySchema.safeParse(changeEvent.target.value);
            if (parsed.success) setMethodKey(parsed.data);
          }}
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        >
          {COMPENSATION_PAYMENT_METHOD_KEYS.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>Reference (optional)</span>
        <input
          value={referenceNote}
          onChange={(changeEvent) => setReferenceNote(changeEvent.target.value)}
          placeholder="Your own reference (optional)"
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        This records that you paid someone elsewhere. Qatoto moves no money and holds none — never
        enter card, bank or account details here.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
      >
        {isPending ? "Recording…" : "Record it"}
      </button>
    </form>
  );
}

export function CompensationLineItem({
  line,
  linePayments,
  isAdmin,
  isPaying,
  onTogglePaying,
  onRecordPayment,
  isRecordPaymentPending,
  onConfirmPayment,
  isConfirmPaymentPending,
}: {
  readonly line: CompensationPeriodLine;
  readonly linePayments: readonly CompensationPayment[];
  readonly isAdmin: boolean;
  readonly isPaying: boolean;
  readonly onTogglePaying: () => void;
  readonly onRecordPayment: (input: {
    readonly paidAmountInCents: string;
    readonly paidOnDate: string;
    readonly methodKey: CompensationPaymentMethodKey;
    readonly referenceNote?: string;
  }) => void;
  readonly isRecordPaymentPending: boolean;
  readonly onConfirmPayment: (paymentId: string) => void;
  readonly isConfirmPaymentPending: boolean;
}) {
  return (
    <li className="space-y-2 rounded-xl border border-outline-variant/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
        <span className="min-w-0">
          <span className="font-medium">{line.memberName}</span>
          <span className="block text-xs text-muted-foreground">
            {LINE_KIND_LABELS[line.kind]}
            {line.effortMinutes !== null && ` · ${formatEffortFromMinutes(line.effortMinutes)}`}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {line.grossAmountInCents !== null && line.currency !== null && (
            <span className="font-medium">
              {formatMoneyFromCents(BigInt(line.grossAmountInCents), line.currency)}
            </span>
          )}
          {line.equityBasisPointsDelta !== null && (
            <span className="block text-xs">
              {formatSignedEquityFromBasisPoints(line.equityBasisPointsDelta)}
            </span>
          )}
        </span>
      </div>

      {line.verificationNote !== null && (
        <p className="text-xs text-muted-foreground">
          Note from verification: {line.verificationNote}. This annotates the line and changes no
          figure on it.
        </p>
      )}

      {linePayments.map((payment) => (
        <div key={payment.id} className="rounded-lg bg-muted/50 p-2 text-xs">
          {formatMoneyFromCents(BigInt(payment.paidAmountInCents), payment.currency)} ·{" "}
          {PAYMENT_METHOD_LABELS[payment.methodKey]} · {formatIsoDate(payment.paidOnDate)}
          {payment.referenceNote !== null && ` · ${payment.referenceNote}`}
          <span className="block">
            {payment.confirmedByMemberAt === null ? (
              <>
                <span className="font-medium">Unconfirmed.</span> Nobody has said they received this
                yet.
                <button
                  type="button"
                  onClick={() => onConfirmPayment(payment.id)}
                  disabled={isConfirmPaymentPending}
                  className="ml-2 cursor-pointer font-medium text-primary-imprint disabled:opacity-50"
                >
                  I received this
                </button>
              </>
            ) : (
              `Confirmed by the member ${formatIsoInstant(payment.confirmedByMemberAt)}`
            )}
          </span>
        </div>
      ))}

      {isAdmin && line.grossAmountInCents !== null && (
        <div>
          <button
            type="button"
            onClick={onTogglePaying}
            className="cursor-pointer text-xs font-medium text-primary-imprint"
          >
            {isPaying ? "Cancel" : "Record a payment you already made"}
          </button>

          {isPaying && (
            <CompensationRecordPaymentForm
              onSubmit={onRecordPayment}
              isPending={isRecordPaymentPending}
            />
          )}
        </div>
      )}
    </li>
  );
}

function AdminPeriodActionButtons({
  projectSlug,
  periodId,
  isCountersigned,
  onCountersign,
  isCountersignPending,
  isChainVerificationRequested,
  onRequestChainVerification,
}: {
  projectSlug: string;
  periodId: string;
  isCountersigned: boolean;
  onCountersign: () => void;
  isCountersignPending: boolean;
  isChainVerificationRequested: boolean;
  onRequestChainVerification: () => void;
}) {
  return (
    <>
      {!isCountersigned && (
        <button
          type="button"
          onClick={onCountersign}
          disabled={isCountersignPending}
          className="cursor-pointer rounded-full border border-primary-imprint/40 px-3 py-1.5 text-xs font-medium text-primary-imprint disabled:opacity-50"
        >
          {isCountersignPending ? "Signing…" : "Countersign it"}
        </button>
      )}

      <a
        href={`${API_BASE_URL}${buildCompensationExportPath(projectSlug, periodId, "csv")}`}
        className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium"
      >
        Export CSV for payroll
      </a>

      <a
        href={`${API_BASE_URL}${buildCompensationExportPath(projectSlug, periodId, "json")}`}
        className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium"
      >
        Export JSON
      </a>

      {!isChainVerificationRequested && (
        <button
          type="button"
          onClick={onRequestChainVerification}
          className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium"
        >
          Verify the statement chain
        </button>
      )}
    </>
  );
}

function FounderSupersedeForm({
  onSupersede,
  isSupersedePending,
}: {
  onSupersede: (reason: string) => void;
  isSupersedePending: boolean;
}) {
  const [supersedeReason, setSupersedeReason] = useState("");

  const handleSubmit = (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    onSupersede(supersedeReason);
  };

  return (
    <form className="space-y-2 rounded-xl bg-muted/50 p-3" onSubmit={handleSubmit}>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          Correct this statement — it creates a new one; nothing here is ever edited
        </span>
        <input
          required
          value={supersedeReason}
          onChange={(changeEvent) => setSupersedeReason(changeEvent.target.value)}
          placeholder="What was wrong?"
          className="w-full rounded-lg border border-outline-variant p-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={isSupersedePending}
        className="cursor-pointer rounded-full border border-outline-variant px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {isSupersedePending ? "Superseding…" : "Supersede with a correction"}
      </button>
    </form>
  );
}

export function CompensationPeriodActions({
  projectSlug,
  periodId,
  periodStatus,
  isCountersigned,
  isFounder,
  isAdmin,
  onFinalize,
  isFinalizePending,
  onCountersign,
  isCountersignPending,
  isChainVerificationRequested,
  onRequestChainVerification,
  onSupersede,
  isSupersedePending,
}: {
  readonly projectSlug: string;
  readonly periodId: string;
  readonly periodStatus: CompensationPeriodStatus;
  readonly isCountersigned: boolean;
  readonly isFounder: boolean;
  readonly isAdmin: boolean;
  readonly onFinalize: () => void;
  readonly isFinalizePending: boolean;
  readonly onCountersign: () => void;
  readonly isCountersignPending: boolean;
  readonly isChainVerificationRequested: boolean;
  readonly onRequestChainVerification: () => void;
  readonly onSupersede: (reason: string) => void;
  readonly isSupersedePending: boolean;
}) {
  const showFounderFinalize = isFounder && periodStatus === "open";
  const showAdminActions = isAdmin && periodStatus === "finalized";
  const showFounderSupersede = isFounder && periodStatus === "finalized";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {showFounderFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            disabled={isFinalizePending}
            className="cursor-pointer rounded-full bg-primary-imprint px-3 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-50"
          >
            {isFinalizePending ? "Finalizing…" : "Finalize this statement"}
          </button>
        )}

        {showAdminActions && (
          <AdminPeriodActionButtons
            projectSlug={projectSlug}
            periodId={periodId}
            isCountersigned={isCountersigned}
            onCountersign={onCountersign}
            isCountersignPending={isCountersignPending}
            isChainVerificationRequested={isChainVerificationRequested}
            onRequestChainVerification={onRequestChainVerification}
          />
        )}
      </div>

      {showFounderSupersede && (
        <FounderSupersedeForm onSupersede={onSupersede} isSupersedePending={isSupersedePending} />
      )}
    </>
  );
}
