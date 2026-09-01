"use client";

// TRANSPORT: client-query — React Query over `@/lib/support/api`, the opener's half.
//
// NOTHING IS OPTIMISTIC. A support case is somebody's account of a problem and a reply is
// something they are asking a person to read; neither is a place for a rollback. Every write
// here renders only what the server sent back.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import { supportKeys } from "@/hooks/support/keys";
import { unwrap, type ApiRequestError } from "@/lib/http";
import {
  addOwnSupportCaseMessage,
  getOwnSupportCase,
  listOwnSupportCases,
  openSupportCase,
} from "@/lib/support/api";
import type {
  OpenSupportCaseInput,
  SupportCaseDetail,
  SupportCaseState,
  SupportCaseSummary,
} from "@/lib/support/schemas";

interface SupportCasePage {
  readonly rows: SupportCaseSummary[];
  readonly nextCursor: string | null;
}

/**
 * The caller's own cases.
 *
 * `isEnabled` IS THREADED FROM THE SESSION SEED, not defaulted to true, so a signed-out
 * visitor — who reaches `/customer-service` freely, the sidebar row has no session
 * requirement — never fires a request that can only 401. The island turns the same boolean
 * into a `signedOut` view state and checks it BEFORE `isPending`, because a disabled query
 * sits pending forever and would otherwise spin for everybody who is not signed in.
 */
export function useOwnSupportCasesQuery(
  stateFilter: SupportCaseState | undefined,
  isEnabled: boolean,
) {
  return useInfiniteQuery<
    SupportCasePage,
    ApiRequestError,
    InfiniteData<SupportCasePage, string | null>,
    ReturnType<typeof supportKeys.myCases>,
    string | null
  >({
    queryKey: supportKeys.myCases(stateFilter),
    queryFn: async ({ pageParam }) =>
      unwrap(
        await listOwnSupportCases({
          ...(stateFilter === undefined ? {} : { state: stateFilter }),
          ...(pageParam === null ? {} : { cursor: pageParam }),
        }),
      ),
    initialPageParam: null,
    // `?? undefined` — React Query reads undefined as "no more pages"; a null would be sent
    // back as a cursor.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
    // A 401 is an answer, not a flake — retrying it three times only delays the message.
    retry: false,
  });
}

/** One case with its thread. A 404 means "no such case, or not yours" and is a real answer. */
export function useOwnSupportCaseQuery(caseId: string) {
  return useQuery<SupportCaseDetail, ApiRequestError>({
    queryKey: supportKeys.caseDetail(caseId),
    queryFn: async () => unwrap(await getOwnSupportCase(caseId)),
    enabled: caseId.length > 0,
    retry: false,
  });
}

/**
 * Opens a case.
 *
 * INVALIDATES THE ROOT, not one filter: a new case belongs to "all" and to "open", and both
 * lists are now wrong.
 */
export function useOpenSupportCaseMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    SupportCaseDetail,
    ApiRequestError,
    { readonly input: OpenSupportCaseInput; readonly idempotencyKey: string }
  >({
    mutationFn: async (variables) =>
      unwrap(await openSupportCase(variables.input, variables.idempotencyKey)),
    onSuccess: (createdCase) => {
      queryClient.setQueryData(supportKeys.caseDetail(createdCase.id), createdCase);
      void queryClient.invalidateQueries({ queryKey: supportKeys.myCasesRoot() });
    },
  });
}

/**
 * The person's reply on their own case.
 *
 * THE RESPONSE IS THE CACHE. The route answers the whole updated case, so writing that into
 * the detail key is both cheaper and more honest than a refetch — the thread the person sees
 * is exactly the one the server has. The list is invalidated rather than patched because a
 * reply can move the case's state (a reply to a resolved case reopens it), and which filtered
 * lists it now belongs to is the server's answer to give.
 */
export function useAddOwnSupportCaseMessageMutation(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    SupportCaseDetail,
    ApiRequestError,
    { readonly body: string; readonly idempotencyKey: string }
  >({
    mutationFn: async (variables) =>
      unwrap(
        await addOwnSupportCaseMessage(caseId, { body: variables.body }, variables.idempotencyKey),
      ),
    onSuccess: (updatedCase) => {
      queryClient.setQueryData(supportKeys.caseDetail(caseId), updatedCase);
      void queryClient.invalidateQueries({ queryKey: supportKeys.myCasesRoot() });
    },
  });
}
