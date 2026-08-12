"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/earnings.api`.

import { useQuery } from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { getSellerEarnings } from "@/lib/store/earnings.api";
import type { SellerEarningsFilter } from "@/lib/store/earnings.schemas";

/**
 * What this organization has been paid.
 *
 * `retry: false`, matching `useShipmentQueueQuery`: a 403 here is an answer about the caller's
 * workspace — no active commerce organization — rather than a flake worth retrying. A seller who
 * has not finished setting up should read that sentence, not watch a spinner three times.
 *
 * NO `refetchInterval`. Revenue is not a state machine being polled to a verdict, the way a payment
 * intent is; nothing on this page is waiting for a value to arrive. Refetching on window focus,
 * which is the shared client default, is the right cadence for a figure that changes when an order
 * settles.
 */
export function useProviderEarningsQuery(filter: SellerEarningsFilter = {}) {
  return useQuery({
    queryKey: storeKeys.providerEarnings(filter.from, filter.to),
    queryFn: () => getSellerEarnings(filter),
    retry: false,
  });
}
