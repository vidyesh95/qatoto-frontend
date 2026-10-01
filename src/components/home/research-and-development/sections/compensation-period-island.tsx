// TRANSPORT: client-query — "use client" island. Reads GET …/compensation-periods/:periodId
// and GET …/compensation-periods/:periodId/verify on demand, and writes /finalize,
// /countersign, /supersede, the payment attestation and the member's confirmation.
// Needs QueryProvider, which (home)/layout.tsx mounts.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import {
  CompensationLineItem,
  CompensationPeriodActions,
  StatementChainVerificationView,
} from "@/components/home/research-and-development/sections/compensation-period-subviews";
import {
  useCompensationPeriodQuery,
  useConfirmCompensationPaymentMutation,
  useCountersignCompensationPeriodMutation,
  useFinalizeCompensationPeriodMutation,
  useRecordCompensationPaymentMutation,
  useStatementChainVerificationQuery,
  useSupersedeCompensationPeriodMutation,
} from "@/hooks/rnd/compensation";
import { ApiRequestError } from "@/lib/http";
import type { CompensationPeriodStatus } from "@/lib/rnd/compensation.schemas";
import { newIdempotencyKey } from "@/lib/idempotency";

const FOUNDER_ROLE = "founder";
const ADMIN_ROLES = ["founder", "admin"];

export default function CompensationPeriodIsland({
  projectSlug,
  periodId,
  periodStatus,
  isCountersigned,
  viewerProjectRole,
}: {
  readonly projectSlug: string;
  readonly periodId: string;
  readonly periodStatus: CompensationPeriodStatus;
  readonly isCountersigned: boolean;
  readonly viewerProjectRole: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [payingLineId, setPayingLineId] = useState<string | null>(null);
  const [paymentIdempotencyKey] = useState(newIdempotencyKey);
  const [isChainVerificationRequested, setIsChainVerificationRequested] = useState(false);

  const periodQuery = useCompensationPeriodQuery(projectSlug, isOpen ? periodId : undefined);
  const chainVerificationQuery = useStatementChainVerificationQuery(
    projectSlug,
    periodId,
    isChainVerificationRequested,
  );
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
        className="mt-3 cursor-pointer text-xs font-medium text-primary-imprint"
      >
        Open this statement
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 border-t border-outline-variant/40 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        className="cursor-pointer text-xs font-medium text-primary-imprint"
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
          <p className="rounded-xl bg-muted/50 p-3 text-xs">{periodQuery.data.grossOnlyNotice}</p>

          <ul className="space-y-2">
            {periodQuery.data.lines.map((line) => {
              const linePayments = periodQuery.data.payments.filter(
                (payment) => payment.lineId === line.id,
              );

              return (
                <CompensationLineItem
                  key={line.id}
                  line={line}
                  linePayments={linePayments}
                  isAdmin={isAdmin}
                  isPaying={payingLineId === line.id}
                  onTogglePaying={() => setPayingLineId(payingLineId === line.id ? null : line.id)}
                  onRecordPayment={(input) =>
                    recordPaymentMutation.mutate({
                      lineId: line.id,
                      input: {
                        ...input,
                        idempotencyKey: paymentIdempotencyKey,
                      },
                    })
                  }
                  isRecordPaymentPending={recordPaymentMutation.isPending}
                  onConfirmPayment={(paymentId) =>
                    confirmPaymentMutation.mutate({ lineId: line.id, paymentId })
                  }
                  isConfirmPaymentPending={confirmPaymentMutation.isPending}
                />
              );
            })}
          </ul>

          <CompensationPeriodActions
            projectSlug={projectSlug}
            periodId={periodId}
            periodStatus={periodStatus}
            isCountersigned={isCountersigned}
            isFounder={isFounder}
            isAdmin={isAdmin}
            onFinalize={() => finalizeMutation.mutate(periodId)}
            isFinalizePending={finalizeMutation.isPending}
            onCountersign={() => countersignMutation.mutate({ periodId })}
            isCountersignPending={countersignMutation.isPending}
            isChainVerificationRequested={isChainVerificationRequested}
            onRequestChainVerification={() => setIsChainVerificationRequested(true)}
            onSupersede={(reason) => supersedeMutation.mutate({ periodId, reasonNote: reason })}
            isSupersedePending={supersedeMutation.isPending}
          />

          {isChainVerificationRequested && (
            <StatementChainVerificationView
              isPending={chainVerificationQuery.isPending}
              error={chainVerificationQuery.error}
              verification={chainVerificationQuery.data}
            />
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
