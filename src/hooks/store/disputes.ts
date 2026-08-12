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
import { addDisputeNote, getDispute, listDisputes } from "@/lib/store/disputes.api";
import type { DisputeDetail, ListDisputesFilter } from "@/lib/store/disputes.schemas";

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
