// TRANSPORT: client-query — "use client" island. Reads GET …/compensation-periods/:periodId
// on demand and writes /finalize, /countersign, /supersede, the payment attestation and
// the member's confirmation. Needs QueryProvider, which (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  useCompensationPeriodQuery,
  useConfirmCompensationPaymentMutation,
  useCountersignCompensationPeriodMutation,
  useFinalizeCompensationPeriodMutation,
  useRecordCompensationPaymentMutation,
  useSupersedeCompensationPeriodMutation,
} from "@/hooks/rnd/compensation";
import { ApiRequestError } from "@/lib/http";
import { API_BASE_URL } from "@/lib/api";
import { buildCompensationExportPath } from "@/lib/rnd/compensation.api";
import {
  COMPENSATION_PAYMENT_METHOD_KEYS,
  CompensationPaymentMethodKeySchema,
  type CompensationPaymentMethodKey,
  type CompensationPeriodLineKind,
  type CompensationPeriodStatus,
} from "@/lib/rnd/compensation.schemas";
import {
  formatEffortFromMinutes,
  formatIsoDate,
  formatIsoInstant,
  formatMoneyFromCents,
  formatSignedEquityFromBasisPoints,
} from "@/lib/rnd/format";
import { newIdempotencyKey } from "@/lib/idempotency";

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

const FOUNDER_ROLE = "founder";
const ADMIN_ROLES = ["founder", "admin"];

/**
 * One statement, opened.
 *
 * FOUR CONTROLS, EACH WITH A DIFFERENT ACTOR, and getting that wrong is the whole risk on
 * this screen:
 *
 * - FINALIZE is the founder's, and its body is an acknowledgement with NO AMOUNTS. The
 *   server recomputes, freezes and hashes in one transaction; a body carrying figures
 *   would let the client decide what the statement says.
 * - COUNTERSIGN is A DIFFERENT ADMIN'S. `422 SELF_COUNTERSIGN_FORBIDDEN` even for a
 *   founder, because a second signature from the first signer is not a second signature.
 * - RECORDING A PAYMENT is the founder's or an admin's, and it is an ATTESTATION about
 *   money that moved elsewhere. It changes no line.
 * - CONFIRMING one is THE MEMBER'S, and only theirs. Until it lands the payment renders as
 *   unconfirmed.
 *
 * THERE IS NO EDIT AND NO "MARK PAID". A finalized statement is corrected by SUPERSEDING
 * it — editing would invalidate the statement hash and every hash chained after it — and
 * no endpoint marks a line paid, because payment is an attestation plus a confirmation or
 * it is not evidence.
 */
export default function CompensationPeriodIsland({
  projectSlug,
  periodId,
  periodStatus,
  isCountersigned,
  viewerProjectRole,
}: {
  projectSlug: string;
  periodId: string;
  periodStatus: CompensationPeriodStatus;
  isCountersigned: boolean;
  viewerProjectRole: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [payingLineId, setPayingLineId] = useState<string | null>(null);
  const [paidAmountInCents, setPaidAmountInCents] = useState("");
  const [paidOnDate, setPaidOnDate] = useState("");
  const [methodKey, setMethodKey] = useState<CompensationPaymentMethodKey>("bank_transfer");
  const [referenceNote, setReferenceNote] = useState("");
  const [paymentIdempotencyKey] = useState(newIdempotencyKey);
  const [supersedeReason, setSupersedeReason] = useState("");

  const periodQuery = useCompensationPeriodQuery(projectSlug, isOpen ? periodId : undefined);
  const finalizeMutation = useFinalizeCompensationPeriodMutation(projectSlug);
  const countersignMutation = useCountersignCompensationPeriodMutation(projectSlug);
  const supersedeMutation = useSupersedeCompensationPeriodMutation(projectSlug);
  const recordPaymentMutation = useRecordCompensationPaymentMutation(projectSlug, periodId);
  const confirmPaymentMutation = useConfirmCompensationPaymentMutation(projectSlug, periodId);

  const firstError = [
    finalizeMutation.error,
    countersignMutation.error,
    supersedeMutation.error,
    recordPaymentMutation.error,
    confirmPaymentMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  const isFounder = viewerProjectRole === FOUNDER_ROLE;
  const isAdmin = viewerProjectRole !== null && ADMIN_ROLES.includes(viewerProjectRole);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-3 cursor-pointer text-xs font-medium text-[#00696E]"
      >
        Open this statement
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-[#CAC4D0]/40 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="cursor-pointer text-xs font-medium text-[#00696E]"
      >
        Close this statement
      </button>

      {periodQuery.isPending && (
        <p className="text-xs text-muted-foreground">Loading the statement…</p>
      )}
      {periodQuery.isError && (
        <p className="text-xs text-muted-foreground">Couldn&apos;t load this statement.</p>
      )}

      {periodQuery.data && (
        <div className="space-y-3">
          {/* The notice travels with the numbers rather than living in a client string
              table, so a statement can never be rendered as a payslip. */}
          <p className="rounded-xl bg-muted/50 p-3 text-xs">{periodQuery.data.grossOnlyNotice}</p>

          <ul className="space-y-2">
            {periodQuery.data.lines.map((line) => {
              const linePayments = periodQuery.data.payments.filter(
                (payment) => payment.lineId === line.id,
              );

              return (
                <li key={line.id} className="space-y-2 rounded-xl border border-[#CAC4D0]/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{line.memberName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {LINE_KIND_LABELS[line.kind]}
                        {line.effortMinutes !== null &&
                          ` · ${formatEffortFromMinutes(line.effortMinutes)}`}
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

                  {/* The one place a verdict touches a cash line, and it changes no
                      number. Rendered as an annotation, never as a reason the amount is
                      lower — verification never reduces cash. */}
                  {line.verificationNote !== null && (
                    <p className="text-xs text-muted-foreground">
                      Note from verification: {line.verificationNote}. This annotates the line and
                      changes no figure on it.
                    </p>
                  )}

                  {linePayments.map((payment) => (
                    <div key={payment.id} className="rounded-lg bg-muted/50 p-2 text-xs">
                      {formatMoneyFromCents(BigInt(payment.paidAmountInCents), payment.currency)} ·{" "}
                      {PAYMENT_METHOD_LABELS[payment.methodKey]} ·{" "}
                      {formatIsoDate(payment.paidOnDate)}
                      {payment.referenceNote !== null && ` · ${payment.referenceNote}`}
                      <span className="block">
                        {payment.confirmedByMemberAt === null ? (
                          <>
                            <span className="font-medium">Unconfirmed.</span> Nobody has said they
                            received this yet.
                            <button
                              type="button"
                              onClick={() =>
                                confirmPaymentMutation.mutate({
                                  lineId: line.id,
                                  paymentId: payment.id,
                                })
                              }
                              disabled={confirmPaymentMutation.isPending}
                              className="ml-2 cursor-pointer font-medium text-[#00696E] disabled:opacity-50"
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
                        onClick={() => setPayingLineId(payingLineId === line.id ? null : line.id)}
                        className="cursor-pointer text-xs font-medium text-[#00696E]"
                      >
                        {payingLineId === line.id ? "Cancel" : "Record a payment you already made"}
                      </button>

                      {payingLineId === line.id && (
                        <form
                          className="mt-2 space-y-2"
                          onSubmit={(submitEvent) => {
                            submitEvent.preventDefault();
                            recordPaymentMutation.mutate({
                              lineId: line.id,
                              input: {
                                paidAmountInCents,
                                paidOnDate,
                                methodKey,
                                referenceNote: referenceNote.length > 0 ? referenceNote : undefined,
                                idempotencyKey: paymentIdempotencyKey,
                              },
                            });
                          }}
                        >
                          <input
                            required
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={paidAmountInCents}
                            onChange={(changeEvent) =>
                              setPaidAmountInCents(changeEvent.target.value)
                            }
                            placeholder="Amount in whole cents"
                            className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                          />
                          <input
                            required
                            type="date"
                            value={paidOnDate}
                            onChange={(changeEvent) => setPaidOnDate(changeEvent.target.value)}
                            className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                          />
                          <select
                            value={methodKey}
                            onChange={(changeEvent) => {
                              const parsed = CompensationPaymentMethodKeySchema.safeParse(
                                changeEvent.target.value,
                              );
                              if (parsed.success) setMethodKey(parsed.data);
                            }}
                            className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                          >
                            {COMPENSATION_PAYMENT_METHOD_KEYS.map((method) => (
                              <option key={method} value={method}>
                                {PAYMENT_METHOD_LABELS[method]}
                              </option>
                            ))}
                          </select>
                          <input
                            value={referenceNote}
                            onChange={(changeEvent) => setReferenceNote(changeEvent.target.value)}
                            placeholder="Your own reference (optional)"
                            className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                          />
                          {/* Said plainly, because the form looks like a payment form and
                              is not one. */}
                          <p className="text-xs text-muted-foreground">
                            This records that you paid someone elsewhere. Qatoto moves no money and
                            holds none — never enter card, bank or account details here.
                          </p>
                          <button
                            type="submit"
                            disabled={recordPaymentMutation.isPending}
                            className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {recordPaymentMutation.isPending ? "Recording…" : "Record it"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            {isFounder && periodStatus === "open" && (
              <button
                type="button"
                onClick={() => finalizeMutation.mutate(periodId)}
                disabled={finalizeMutation.isPending}
                className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              >
                {finalizeMutation.isPending ? "Finalizing…" : "Finalize this statement"}
              </button>
            )}

            {isAdmin && periodStatus === "finalized" && !isCountersigned && (
              <button
                type="button"
                onClick={() => countersignMutation.mutate({ periodId })}
                disabled={countersignMutation.isPending}
                className="cursor-pointer rounded-full border border-[#00696E]/40 px-3 py-1.5 text-xs font-medium text-[#00696E] disabled:opacity-50"
              >
                {countersignMutation.isPending ? "Signing…" : "Countersign it"}
              </button>
            )}

            {isAdmin && periodStatus === "finalized" && (
              <a
                href={`${API_BASE_URL}${buildCompensationExportPath(projectSlug, periodId, "csv")}`}
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium"
              >
                Export CSV for payroll
              </a>
            )}
          </div>

          {isFounder && periodStatus === "finalized" && (
            <form
              className="space-y-2 rounded-xl bg-muted/50 p-3"
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                supersedeMutation.mutate({ periodId, reasonNote: supersedeReason });
              }}
            >
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">
                  Correct this statement — it creates a new one; nothing here is ever edited
                </span>
                <input
                  required
                  value={supersedeReason}
                  onChange={(changeEvent) => setSupersedeReason(changeEvent.target.value)}
                  placeholder="What was wrong?"
                  className="w-full rounded-lg border border-[#CAC4D0] p-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={supersedeMutation.isPending}
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                {supersedeMutation.isPending ? "Superseding…" : "Supersede with a correction"}
              </button>
            </form>
          )}

          {finalizeMutation.isSuccess && (
            <MutationSuccessNotice message="Finalized, hashed and recorded in the audit trail. It can only be corrected by superseding it now." />
          )}
          {confirmPaymentMutation.isSuccess && (
            <MutationSuccessNotice message="Confirmed. Both sides now agree this payment was received." />
          )}
        </div>
      )}

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </div>
  );
}
