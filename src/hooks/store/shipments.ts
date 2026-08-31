"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/shipments.api`.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  appendShipmentEvent,
  createOrderShipment,
  listBuyerShipments,
  listProviderShipments,
} from "@/lib/store/shipments.api";
import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  ListShipmentsFilter,
  WrittenShipment,
} from "@/lib/store/shipments.schemas";

/**
 * The cross-order shipment queue, for whichever side the caller is.
 *
 * `which` PICKS THE ENDPOINT, not a filter — the same shape `useOrderListQuery` uses and for the
 * same reason: two reads with two authorizations, and one organization can legitimately appear in
 * both. Sharing a cache entry would let each overwrite the other.
 *
 * `retry: false` because a 403 here is an answer about the caller's workspace, not a flake.
 */
export function useShipmentQueueQuery(
  which: "buyer" | "provider",
  filter: ListShipmentsFilter = {},
) {
  return useQuery({
    queryKey: storeKeys.shipmentQueue(which, filter.state),
    queryFn: () => (which === "buyer" ? listBuyerShipments(filter) : listProviderShipments(filter)),
    retry: false,
  });
}

/**
 * Creates a shipment on one order.
 *
 * INVALIDATES TWO READS, because one shipment appears in both: the order's own fulfillment panel
 * and the cross-order queue at `/studio/logistics`. Invalidating only the first would leave a
 * seller's queue missing the shipment they just made.
 *
 * The idempotency key is minted per attempt by the form. A fresh key on a retry is a SECOND
 * shipment holding the same order lines — quantities the server has already committed elsewhere.
 */
export function useCreateOrderShipmentMutation(): UseMutationResult<
  ActionResponse<WrittenShipment>,
  Error,
  {
    readonly orderId: string;
    readonly input: CreateShipmentInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, input, idempotencyKey }) =>
      createOrderShipment(orderId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, variables) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({
        queryKey: storeKeys.orderFulfillment(variables.orderId),
      });
      void queryClient.invalidateQueries({ queryKey: storeKeys.shipmentQueues() });
    },
  });
}

/**
 * Records what happened to a shipment.
 *
 * NOT OPTIMISTIC. `delivered` is a claim the buyer reads on their own order, and showing it before
 * the server accepted it would tell both sides the goods arrived on the strength of a click.
 */
export function useAppendShipmentEventMutation(): UseMutationResult<
  ActionResponse<WrittenShipment>,
  Error,
  {
    readonly orderId: string;
    readonly shipmentId: string;
    readonly input: AppendShipmentEventInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shipmentId, input, idempotencyKey }) =>
      appendShipmentEvent(shipmentId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result, variables) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({
        queryKey: storeKeys.orderFulfillment(variables.orderId),
      });
      void queryClient.invalidateQueries({ queryKey: storeKeys.shipmentQueues() });
    },
  });
}
