"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/compensation.api`.
//
// NONE OF THESE MUTATIONS IS OPTIMISTIC, and that is a policy rather than a shortcut. A
// finalized statement, a countersignature and a confirmed payment are all attestations
// about money; showing one as done before the server agreed would put a claim in front of
// a member that nobody has actually made.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  acceptCompensationAgreement,
  confirmCompensationPayment,
  countersignCompensationPeriod,
  declineCompensationAgreement,
  finalizeCompensationPeriod,
  getCompensationPeriod,
  proposeCompensationAgreement,
  recordCompensationPayment,
  supersedeCompensationPeriod,
  withdrawCompensationAgreement,
  type ProposeAgreementInput,
  type RecordPaymentInput,
} from "@/lib/rnd/compensation.api";

// --- Queries ------------------------------------------------------------------

// THE AGREEMENT AND PERIOD LIST HOOKS WERE DELETED. Both duplicated a read the project
// detail page already makes server-side, so they were two ways to fetch one thing — and
// the unused one would have drifted. The lists arrive as props; only the PERIOD DETAIL is
// fetched on demand, because it is opened one at a time.

export function useCompensationPeriodQuery(projectSlug: string, periodId: string | undefined) {
  return useQuery({
    queryKey: rndKeys.compensationPeriod(projectSlug, periodId ?? "none"),
    queryFn: async () => {
      if (!periodId) throw new Error("Missing period id");
      return unwrap(await getCompensationPeriod(projectSlug, periodId));
    },
    enabled: Boolean(periodId),
  });
}

// --- Agreements ---------------------------------------------------------------

export function useProposeCompensationAgreementMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { memberUserId: string; input: ProposeAgreementInput }) =>
      unwrap(
        await proposeCompensationAgreement(projectSlug, variables.memberUserId, variables.input),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationAgreements(projectSlug, undefined),
      });
    },
  });
}

/**
 * Accept, decline or withdraw.
 *
 * ONE HOOK FOR THREE VERBS because they are one decision with three outcomes, and the
 * caller's authorization differs per outcome rather than per endpoint: the MEMBER accepts
 * or declines, the PROPOSER withdraws. Splitting them into three hooks would triple the
 * invalidation surface for no gain.
 */
export function useDecideCompensationAgreementMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      agreementId: string;
      decision: "accept" | "decline" | "withdraw";
      note?: string;
    }) => {
      if (variables.decision === "accept") {
        return unwrap(await acceptCompensationAgreement(projectSlug, variables.agreementId));
      }
      if (variables.decision === "decline") {
        return unwrap(
          await declineCompensationAgreement(projectSlug, variables.agreementId, {
            note: variables.note,
          }),
        );
      }
      return unwrap(
        await withdrawCompensationAgreement(projectSlug, variables.agreementId, {
          reasonNote: variables.note ?? "",
        }),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationAgreements(projectSlug, undefined),
      });
    },
  });
}

// --- Periods ------------------------------------------------------------------

/** Founder. Recomputes, freezes, hashes and audits in one transaction. */
export function useFinalizeCompensationPeriodMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) =>
      unwrap(await finalizeCompensationPeriod(projectSlug, periodId)),
    onSuccess: (_data, periodId) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriod(projectSlug, periodId),
      });
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriods(projectSlug, undefined, 1),
      });
    },
  });
}

/** A DIFFERENT admin, or a platform auditor. Never the person who finalized. */
export function useCountersignCompensationPeriodMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { periodId: string; note?: string }) =>
      unwrap(
        await countersignCompensationPeriod(projectSlug, variables.periodId, {
          note: variables.note,
        }),
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriod(projectSlug, variables.periodId),
      });
    },
  });
}

/**
 * Supersede — creates a NEW period rather than editing this one.
 *
 * Invalidates the whole list, not just the source period: the correction is a new row and
 * the old one gains a `supersededByPeriodId`, so both change.
 */
export function useSupersedeCompensationPeriodMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { periodId: string; reasonNote: string }) =>
      unwrap(
        await supersedeCompensationPeriod(projectSlug, variables.periodId, {
          reasonNote: variables.reasonNote,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriods(projectSlug, undefined, 1),
      });
    },
  });
}

// --- Payments -----------------------------------------------------------------

/** An attestation that money moved elsewhere. It changes no line and settles nothing. */
export function useRecordCompensationPaymentMutation(projectSlug: string, periodId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { lineId: string; input: RecordPaymentInput }) =>
      unwrap(await recordCompensationPayment(projectSlug, variables.lineId, variables.input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriod(projectSlug, periodId),
      });
    },
  });
}

/** THE MEMBER confirms receipt. Until this lands the payment renders as unconfirmed. */
export function useConfirmCompensationPaymentMutation(projectSlug: string, periodId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { lineId: string; paymentId: string }) =>
      unwrap(await confirmCompensationPayment(projectSlug, variables.lineId, variables.paymentId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: rndKeys.compensationPeriod(projectSlug, periodId),
      });
    },
  });
}
