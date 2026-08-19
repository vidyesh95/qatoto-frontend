"use client";

// TRANSPORT: client-query — React Query over `@/lib/account/account-deletion.api`.

import { useMutation } from "@tanstack/react-query";

import { requestAccountDeletion } from "@/lib/account/account-deletion.api";
import { unwrap } from "@/lib/http";
import type { AccountDeletionRequest } from "@/lib/account/account-deletion.schemas";

/**
 * Closes the account. The last thing this session gets to do.
 *
 * NO `onSuccess` CACHE WORK, DELIBERATELY. Every other mutation in this app invalidates
 * something; there is nothing to invalidate here, because the session that owns every
 * cached read has just been destroyed server-side. The caller handles it by leaving —
 * clearing device preferences, signing out and hard-navigating — and a full reload is what
 * actually discards the cache (there are three React Query clients, one per route group,
 * and `useQueryClient()` reaches only one of them).
 *
 * `unwrap` so the component branches on `ApiRequestError` and can render the backend's own
 * message: a `403` naming who closes a staff account is information the user needs, not a
 * generic failure to retry.
 */
export function useRequestAccountDeletionMutation() {
  return useMutation<AccountDeletionRequest>({
    mutationFn: async () => unwrap(await requestAccountDeletion()),
    // A deletion that failed to send is not a flake to paper over — the account is
    // untouched and the person needs to know that, not to have it silently retried.
    retry: false,
  });
}
