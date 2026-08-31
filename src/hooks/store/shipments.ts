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
import type { ShipmentLeg } from "@/lib/store/fulfillment.schemas";
import {
  appendShipmentEvent,
  createOrderShipment,
  executeShipmentLegCommand,
  getShipmentDetail,
  listBuyerShipments,
  listProviderShipments,
  listShipmentLegEvents,
} from "@/lib/store/shipments.api";
import type {
  AppendShipmentEventInput,
  CreateShipmentInput,
  ListShipmentsFilter,
  ShipmentLegCommand,
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

/**
 * One shipment in full, including its legs.
 *
 * `enabled` GUARDS AN UNOPENED ROW. The logistics queue renders many shipments and expands one at
 * a time; without this every row would fetch its own detail on mount, which is the N+1 the queue
 * route exists to avoid.
 *
 * `retry: false` for the same reason as the queue: a 403 is an answer about the caller's
 * workspace, not a flake.
 */
export function useShipmentDetailQuery(shipmentId: string | null) {
  return useQuery({
    queryKey: storeKeys.shipmentDetail(shipmentId ?? ""),
    queryFn: () => getShipmentDetail(shipmentId ?? ""),
    enabled: shipmentId !== null,
    retry: false,
  });
}

/** One leg's history. Same `enabled` guard, same reason. */
export function useShipmentLegEventsQuery(legId: string | null) {
  return useQuery({
    queryKey: storeKeys.shipmentLegEvents(legId ?? ""),
    queryFn: () => listShipmentLegEvents(legId ?? ""),
    enabled: legId !== null,
    retry: false,
  });
}

/**
 * Advances one shipment leg — book, depart, arrive, complete, or report a problem.
 *
 * NOT OPTIMISTIC, AND `retry: false`. Every arm of this command is a claim about physical goods
 * that the buyer reads on their own order, and the response carries the leg's NEW version — which
 * the next command must echo. Painting a state locally would hand the next command a version the
 * server never issued.
 *
 * ⚠️ **A 409 MEANS SOMEBODY ELSE MOVED THIS LEG.** `expectedVersion` was stale. React Query must
 * not retry it: the correct response is to re-read and show what they did, which is why the
 * invalidations below run on the failure path too — the caller needs fresh versions either way.
 *
 * The idempotency key is minted per ATTEMPT by the component, never per render. Replaying a key
 * returns the first call's stored response rather than executing twice.
 */
export function useExecuteShipmentLegCommandMutation(): UseMutationResult<
  ActionResponse<ShipmentLeg>,
  Error,
  {
    readonly shipmentId: string;
    readonly legId: string;
    readonly command: ShipmentLegCommand;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ legId, command, idempotencyKey }) =>
      executeShipmentLegCommand(legId, command, idempotencyKey),
    onSettled: (_result, _error, variables) => {
      // ON SETTLED, NOT ON SUCCESS. A 409 is exactly the case where the cached leg version is
      // wrong, so the refetch matters more on the failure path than on the happy one.
      void queryClient.invalidateQueries({
        queryKey: storeKeys.shipmentDetail(variables.shipmentId),
      });
      void queryClient.invalidateQueries({
        queryKey: storeKeys.shipmentLegEvents(variables.legId),
      });
      void queryClient.invalidateQueries({ queryKey: storeKeys.shipmentQueues() });
    },
  });
}
