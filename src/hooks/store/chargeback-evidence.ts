"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/chargeback-evidence.api`, which is
// itself TRANSPORT: mock until the backend route exists.
//
// THIS IS A MUTATION, NOT A QUERY, following `useRevealDeliveryAddress` in
// `src/hooks/store/orders.ts`: the (future) backend route writes an audit entry on every call,
// so a `useQuery` that refetched on window focus or remount would log a PII/chat access nobody
// asked for. No entry exists in `storeKeys` for this read for the same reason the delivery
// address reveal has none — caching a full order+chat+shipment PII bundle under an order id is
// how it ends up sitting in a devtools panel or a persisted cache.

import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import { getChargebackEvidenceBundle } from "@/lib/store/chargeback-evidence.api";
import type { ChargebackEvidenceBundle } from "@/lib/store/chargeback-evidence.schemas";

export function useExportChargebackEvidence(): UseMutationResult<
  ActionResponse<ChargebackEvidenceBundle>,
  Error,
  { readonly orderId: string }
> {
  return useMutation({
    mutationFn: ({ orderId }) => getChargebackEvidenceBundle(orderId),
  });
}
