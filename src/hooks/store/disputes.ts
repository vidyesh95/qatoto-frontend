"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/disputes.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  addDisputeNote,
  getDispute,
  listDisputes,
  openOrderDispute,
} from "@/lib/store/disputes.api";
import type {
  Dispute,
  DisputeDetail,
  ListDisputesFilter,
  OpenDisputeInput,
} from "@/lib/store/disputes.schemas";

/**
 * One dispute and its timeline.
 *
 * `retry: false` because every refusal this route gives is an answer: a 404 means "not yours or not
 * there" and a 403 means the caller's workspace is not active. Retrying either just spends the
 * allowance to be told the same thing.
 */
export function useDisputeQuery(disputeId: string) {
  return useQuery({
    queryKey: storeKeys.dispute(disputeId),
    queryFn: () => getDispute(disputeId),
    enabled: disputeId.length > 0,
    retry: false,
  });
}

export function useDisputeListQuery(filter: ListDisputesFilter = {}) {
  return useQuery({
    queryKey: storeKeys.disputeList(filter.state),
    queryFn: () => listDisputes(filter),
    retry: false,
  });
}

/**
 * Adds a note to an open dispute.
 *
 * THE RESPONSE *IS* THE CACHE. The write answers the whole updated timeline, so `setQueryData`
 * writes it straight in — a refetch would ask for something the server just handed us, and on an
 * append-only record the two could only ever differ by a race.
 *
 * NOTHING OPTIMISTIC. A note on a dispute is a statement one party makes to another and to whoever
 * decides it; rendering it before the server has it risks showing somebody their own note in a
 * record that never received it.
 */
export function useAddDisputeNote(): UseMutationResult<
  ActionResponse<DisputeDetail>,
  Error,
  { readonly disputeId: string; readonly note: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ disputeId, note, idempotencyKey }) =>
      addDisputeNote(disputeId, { note }, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, { disputeId }) => {
      if (!result.success) return;
      queryClient.setQueryData(storeKeys.dispute(disputeId), result);
    },
  });
}

/**
 * Opens a dispute on one order.
 *
 * ⚠️ **THIS CHANGES THE ORDER'S STATE**, so the order read is invalidated alongside the dispute
 * list: the order becomes `disputed` and its previous state is frozen on the dispute. A UI still
 * showing `in_fulfillment` beside a live dispute would be showing two contradictory facts about
 * one order.
 *
 * NOT OPTIMISTIC, and the response is not necessarily new: an order already carrying an open
 * dispute answers THAT one instead of creating a second, so the caller renders what came back.
 *
 * The idempotency key is minted per attempt by the form.
 */
export function useOpenOrderDisputeMutation(): UseMutationResult<
  ActionResponse<Dispute>,
  Error,
  {
    readonly orderId: string;
    readonly input: OpenDisputeInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input, idempotencyKey }) =>
      openOrderDispute(orderId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, variables) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.order(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.disputeLists() });
    },
  });
}
