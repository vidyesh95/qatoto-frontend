"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/shipments.api`.

import { useQuery } from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { listBuyerShipments, listProviderShipments } from "@/lib/store/shipments.api";
import type { ListShipmentsFilter } from "@/lib/store/shipments.schemas";

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
