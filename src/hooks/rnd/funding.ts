"use client";

// TRANSPORT: client-query — React Query hooks over `@/lib/rnd/funding.api`.
//
// NOTHING HERE CHARGES ANYBODY. A pledge is a commitment recorded against a round; no
// card is taken, no hold is placed, no funds are held and no fee is charged. Every piece
// of copy a component builds around these hooks has to be true of THAT, and not of a
// checkout.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rndKeys } from "@/hooks/rnd/keys";
import { unwrap } from "@/lib/http";
import {
  cancelPledge,
  closeFundingRound,
  completeMilestone,
  createFundingRound,
  createMilestone,
  createPledge,
  deleteFundingRound,
  deleteMilestone,
  getPledgeOptions,
  listMyPledges,
  openFundingRound,
  putMilestoneVariance,
  updateFundingRound,
  updateMilestone,
  type CreateFundingRoundInput,
  type MilestoneInput,
  type MilestoneVarianceInput,
} from "@/lib/rnd/funding.api";

// --- Queries ------------------------------------------------------------------

/**
 * The advisory bounds for a pledge form.
 *
 * `enabled` on the round id rather than always-on: the options are only wanted once a
 * backer opens the form, and prefetching them for every card on a deal-flow page would be
 * one request per card for a form nobody opened.
 */
export function usePledgeOptionsQuery(roundId: string | undefined) {
  return useQuery({
    queryKey: rndKeys.pledgeOptions(roundId ?? "none"),
    queryFn: async () => {
      if (!roundId) throw new Error("Missing round id");
      return unwrap(await getPledgeOptions(roundId));
    },
    enabled: Boolean(roundId),
  });
}

export function useMyPledgesQuery() {
  return useQuery({
    queryKey: rndKeys.myPledges(),
    queryFn: async () => unwrap(await listMyPledges()),
  });
}

// --- Pledges ------------------------------------------------------------------

/**
 * Record a commitment.
 *
 * Invalidates the round's own key AND the caller's pledge list: the round's
 * `raisedAmountInCents` and `backersCount` move inside the same transaction, so leaving
 * the deal card stale would show a backer their own pledge missing from the total they
 * just changed.
 */
export function useCreatePledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { roundId: string; amountInCents: string }) =>
      unwrap(await createPledge(variables.roundId, { amountInCents: variables.amountInCents })),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.fundingRound(variables.roundId) });
      void queryClient.invalidateQueries({ queryKey: rndKeys.myPledges() });
    },
  });
}

export function useCancelPledgeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pledgeId: string) => unwrap(await cancelPledge(pledgeId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.myPledges() });
    },
  });
}

// --- Rounds (founder) ----------------------------------------------------------

export function useCreateFundingRoundMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFundingRoundInput) =>
      unwrap(await createFundingRound(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.fundingRounds(projectSlug) });
    },
  });
}

/**
 * Edit, delete, open or close.
 *
 * ONE HOOK because all four act on the same round and invalidate the same two keys, and
 * because which of them is legal depends entirely on the round's status — `409
 * ROUND_NOT_EDITABLE` once it has opened, `409 ROUND_HAS_REFERENCES` once it has a
 * pledge. The server owns that decision; the UI only offers the buttons.
 */
export function useFundingRoundLifecycleMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      roundId: string;
      action: "update" | "delete" | "open" | "close";
      input?: Partial<Omit<CreateFundingRoundInput, "type">>;
    }) => {
      if (variables.action === "update") {
        return unwrap(await updateFundingRound(variables.roundId, variables.input ?? {}));
      }
      if (variables.action === "delete") {
        return unwrap(await deleteFundingRound(variables.roundId));
      }
      if (variables.action === "open") {
        return unwrap(await openFundingRound(variables.roundId));
      }
      return unwrap(await closeFundingRound(variables.roundId));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.fundingRounds(projectSlug) });
      void queryClient.invalidateQueries({ queryKey: rndKeys.fundingRound(variables.roundId) });
    },
  });
}

// --- Milestones ----------------------------------------------------------------

export function useCreateMilestoneMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MilestoneInput) => unwrap(await createMilestone(projectSlug, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.milestones(projectSlug) });
    },
  });
}

/**
 * Edit, delete, complete, or record variance.
 *
 * COMPLETING IS ITS OWN ACTION and not a `status` field on the edit: there is no `status`
 * on the PATCH body at all, because "done" is an event with a timestamp rather than an
 * attribute someone sets.
 */
export function useMilestoneLifecycleMutation(projectSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: {
      milestoneId: string;
      action: "update" | "delete" | "complete" | "variance";
      input?: Partial<MilestoneInput>;
      variance?: MilestoneVarianceInput;
    }) => {
      if (variables.action === "update") {
        return unwrap(await updateMilestone(variables.milestoneId, variables.input ?? {}));
      }
      if (variables.action === "delete") {
        return unwrap(await deleteMilestone(variables.milestoneId));
      }
      if (variables.action === "complete") {
        return unwrap(await completeMilestone(variables.milestoneId));
      }
      if (!variables.variance) throw new Error("Missing variance input");
      return unwrap(await putMilestoneVariance(variables.milestoneId, variables.variance));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rndKeys.milestones(projectSlug) });
    },
  });
}
