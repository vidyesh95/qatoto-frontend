"use client";

// TRANSPORT: client-query — React Query over `@/lib/store/sourcing.api`.

import { useQuery } from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import { listSourcingQuoteLines } from "@/lib/store/sourcing.api";
import type { ListSourcingQuoteLinesFilter } from "@/lib/store/sourcing.schemas";

/**
 * The caller's accepted quote product lines — cost-basis candidates for a listing.
 *
 * `retry: false` because a 403 here is an answer about the caller's workspace rather than a flake,
 * the same reason the other organization-scoped store reads set it.
 *
 * AN EMPTY LIST IS THE ORDINARY CASE, not an error: almost nobody has sourced a listing through a
 * Qatoto quote yet. The picker renders a sentence for it.
 */
export function useSourcingQuoteLinesQuery(filter: ListSourcingQuoteLinesFilter = {}) {
  return useQuery({
    queryKey: storeKeys.sourcingQuoteLines(filter.cursor),
    queryFn: () => listSourcingQuoteLines(filter),
    retry: false,
  });
}
