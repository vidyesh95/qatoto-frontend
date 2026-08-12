"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/attestations.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import {
  listSettlementAttestations,
  recordSettlementAttestation,
} from "@/lib/store/attestations.api";
import type {
  RecordAttestationInput,
  SettlementAttestationList,
} from "@/lib/store/attestations.schemas";
import type { ActionResponse } from "@/lib/http";

/**
 * Both parties' claims about one order's payment.
 *
 * `retry: false` — a 404 here means the caller is not a party to the order, which is an answer.
 */
export function useOrderSettlementAttestationsQuery(orderId: string) {
  return useQuery({
    queryKey: storeKeys.orderSettlementAttestations(orderId),
    queryFn: () => listSettlementAttestations(orderId),
    retry: false,
  });
}

/**
 * Records this party's claim that money moved.
 *
 * **NOT OPTIMISTIC, AND NOT NEGOTIABLE.** This is an attestation about money — the same class of
 * write as a claim submission or a dispute, and the surface's standing rule is that none of them
 * are optimistic. Painting the claim into the cache before the server accepted it would show a
 * seller their revenue rising on a request that may yet be refused for the rail or as a duplicate.
 *
 * THE RESPONSE IS WRITTEN INTO THE CACHE RATHER THAN INVALIDATED, because the server answers with
 * the whole list — both parties' claims — and that is exactly what this key holds. Invalidating
 * would throw away a payload already in hand to fetch the same bytes again. The same shape
 * `useAddDisputeNote` uses.
 *
 * THE EARNINGS READ IS INVALIDATED, and it must be: a seller's `payment_received` moves
 * `selfReported.attestedReceived` up and `uncounted.offlineOrdersWithNoAttestation` down. The whole
 * `providerEarnings` prefix is cleared rather than one window, since a claim dated last month
 * changes last month's figure as well as the lifetime one.
 *
 * The `idempotencyKey` is minted once per attempt IN THE COMPONENT and passed in, never generated
 * here — a key minted in this hook would be fresh on every call, which is precisely what the
 * uniqueness refusal exists to catch.
 */
export function useRecordSettlementAttestation(): UseMutationResult<
  ActionResponse<SettlementAttestationList>,
  Error,
  {
    readonly orderId: string;
    readonly idempotencyKey: string;
    readonly input: RecordAttestationInput;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, idempotencyKey, input }) =>
      recordSettlementAttestation(orderId, input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: (result, { orderId }) => {
      if (!result.success) return;
      queryClient.setQueryData(storeKeys.orderSettlementAttestations(orderId), result);
      void queryClient.invalidateQueries({ queryKey: ["store", "provider", "earnings"] });
    },
  });
}
