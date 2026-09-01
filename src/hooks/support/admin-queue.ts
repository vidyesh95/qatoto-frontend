"use client";

// TRANSPORT: client-query — React Query over `@/lib/support/admin.api`, the staff half.
//
// SAME KEY FACTORY AS THE MEMBER HOOKS, different keys inside it. One factory per domain is
// what lets a staff reply invalidate the queue and rewrite that case's staff detail without
// either spelling being restated here.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supportKeys } from "@/hooks/support/keys";
import { unwrap, type ApiRequestError } from "@/lib/http";
import {
  addStaffSupportCaseMessage,
  decideSupportCase,
  getSupportCaseAsStaff,
  listSupportCaseQueue,
} from "@/lib/support/admin.api";
import type {
  ListSupportCaseQueueFilter,
  StaffSupportCaseDetail,
  StaffSupportCaseSummary,
} from "@/lib/support/schemas";

/**
 * The queue.
 *
 * `isEnabled` IS THREADED FROM THE CAPABILITY CHECK so a viewer without
 * `handle_support_cases` never fires a speculative request that can only 403.
 */
export function useSupportCaseQueueQuery(
  filter: Pick<ListSupportCaseQueueFilter, "state" | "category">,
  isEnabled: boolean,
) {
  return useQuery<{ rows: StaffSupportCaseSummary[]; nextCursor: string | null }, ApiRequestError>({
    queryKey: supportKeys.queue(filter),
    queryFn: async () =>
      unwrap(
        await listSupportCaseQueue({
          ...(filter.state === undefined ? {} : { state: filter.state }),
          ...(filter.category === undefined ? {} : { category: filter.category }),
        }),
      ),
    enabled: isEnabled,
    retry: false,
  });
}

/** One case as staff see it. Only fetched for the card a staff member actually opened. */
export function useStaffSupportCaseQuery(caseId: string, isEnabled: boolean) {
  return useQuery<StaffSupportCaseDetail, ApiRequestError>({
    queryKey: supportKeys.queueCaseDetail(caseId),
    queryFn: async () => unwrap(await getSupportCaseAsStaff(caseId)),
    enabled: isEnabled && caseId.length > 0,
    retry: false,
  });
}

/**
 * The staff reply.
 *
 * INVALIDATES THE QUEUE ROOT, not one filter: answering moves the case out of "needs an
 * answer" and into "waiting on them", so both of those lists are now wrong.
 */
export function useAddStaffSupportCaseMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    StaffSupportCaseDetail,
    ApiRequestError,
    { readonly caseId: string; readonly body: string; readonly idempotencyKey: string }
  >({
    mutationFn: async (variables) =>
      unwrap(
        await addStaffSupportCaseMessage(
          variables.caseId,
          { body: variables.body },
          variables.idempotencyKey,
        ),
      ),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(supportKeys.queueCaseDetail(updatedCase.id), updatedCase);
      void queryClient.invalidateQueries({ queryKey: supportKeys.queueRoot() });
    },
  });
}

/**
 * Resolve or close.
 *
 * A FRESH KEY PER PRESS is minted by the caller, not here: each decision appends a
 * hash-chained audit entry, and a retry carrying a fresh key would make the chain claim two
 * decisions were taken. One key per attempt, held across every retry of that attempt.
 */
export function useDecideSupportCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    StaffSupportCaseDetail,
    ApiRequestError,
    {
      readonly caseId: string;
      readonly decision: "resolved" | "closed";
      readonly note: string;
      readonly idempotencyKey: string;
    }
  >({
    mutationFn: async (variables) =>
      unwrap(
        await decideSupportCase(
          variables.caseId,
          { decision: variables.decision, note: variables.note },
          variables.idempotencyKey,
        ),
      ),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(supportKeys.queueCaseDetail(updatedCase.id), updatedCase);
      void queryClient.invalidateQueries({ queryKey: supportKeys.queueRoot() });
    },
  });
}
