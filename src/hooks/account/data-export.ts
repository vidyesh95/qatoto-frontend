"use client";

// TRANSPORT: client-query — React Query over `@/lib/account/data-export.api`. THE 202 IS
// NOT THE ANSWER: the mutation invalidates and the self-polling query below carries the
// verdict.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { accountKeys, DATA_EXPORT_POLL_INTERVAL_MS } from "@/hooks/account/keys";
import { getDataExportStatus, requestDataExport } from "@/lib/account/data-export.api";
import { unwrap } from "@/lib/http";
import type { DataExportStatus } from "@/lib/account/data-export.schemas";

/**
 * The latest export, self-polling while one is building.
 *
 * `gcTime: 0` IS THE ONE THAT MATTERS AND THIS IS THE ONE PLACE IT IS RIGHT. This panel
 * lives three levels inside a dropdown that unmounts every time it closes, and the payload
 * carries a presigned URL that dies after five minutes. Cached, a reopened panel would
 * render a download button that looks live and 403s — worse than no button, because the
 * user reasonably concludes their data is being withheld. `staleTime: 0` for the same
 * reason: never serve this from memory.
 *
 * `retry: false` — a 401 here is an answer about the session, not a flake.
 *
 * WHEN IT STOPS. Only `pending` and `running` keep it going, so it ends on `ready`,
 * `failed` and `expired`. A failed fetch also stops it: hammering a route that just refused
 * spends the caller's status allowance re-reading the same refusal.
 */
export function useDataExportQuery() {
  return useQuery({
    queryKey: accountKeys.dataExport(),
    queryFn: () => getDataExportStatus(),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      const result = query.state.data;
      if (result === undefined || !result.success || result.data === null) return false;
      return result.data.state === "pending" || result.data.state === "running"
        ? DATA_EXPORT_POLL_INTERVAL_MS
        : false;
    },
  });
}

/**
 * Asks for a new archive.
 *
 * WRITES NOTHING TO THE CACHE. No `setQueryData`, no optimistic `pending` — the mutation's
 * own return value is a receipt, and letting it seed the cache would put a client's guess
 * where the server's state belongs. It invalidates instead, and the query above is the
 * single source of what is happening.
 */
export function useRequestDataExportMutation() {
  const queryClient = useQueryClient();

  return useMutation<DataExportStatus>({
    mutationFn: async () => unwrap(await requestDataExport()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.dataExport() });
    },
    retry: false,
  });
}
