"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/declarations.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  listOrderDeclarations,
  recordOrderDeclaration,
  withdrawOrderDeclaration,
} from "@/lib/store/declarations.api";
import type {
  OrderDeclarationList,
  RecordDeclarationInput,
} from "@/lib/store/declarations.schemas";

/** `retry: false` — a 404 means the caller is not a party to the order, which is an answer. */
export function useOrderDeclarationsQuery(orderId: string) {
  return useQuery({
    queryKey: storeKeys.orderDeclarations(orderId),
    queryFn: () => listOrderDeclarations(orderId),
    retry: false,
  });
}

/**
 * Records this party's declaration.
 *
 * NOT OPTIMISTIC. A declaration is an attestation about cover or a test, read by the other party,
 * and painting it in before the server accepted it would show them a record that may yet be refused
 * (a stale disclaimer, a cancelled order, an unscanned document). The response is the whole list,
 * so it is written into the cache rather than refetched.
 *
 * The `idempotencyKey` is minted once per attempt in the component and passed in.
 */
export function useRecordOrderDeclaration(): UseMutationResult<
  ActionResponse<OrderDeclarationList>,
  Error,
  {
    readonly orderId: string;
    readonly idempotencyKey: string;
    readonly input: RecordDeclarationInput;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, idempotencyKey, input }) =>
      recordOrderDeclaration(orderId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      queryClient.setQueryData(storeKeys.orderDeclarations(orderId), result);
    },
  });
}

/** Withdraws one of this party's own declarations. Same cache write as the record mutation. */
export function useWithdrawOrderDeclaration(): UseMutationResult<
  ActionResponse<OrderDeclarationList>,
  Error,
  { readonly orderId: string; readonly declarationId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, declarationId }) => withdrawOrderDeclaration(orderId, declarationId),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      queryClient.setQueryData(storeKeys.orderDeclarations(orderId), result);
    },
  });
}
