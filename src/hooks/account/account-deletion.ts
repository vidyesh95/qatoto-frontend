"use client";

// TRANSPORT: client-query — React Query over `@/lib/account/account-deletion.api`.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { requestAccountDeletion } from "@/lib/account/account-deletion.api";
import { unwrap } from "@/lib/http";
import type { AccountDeletionRequest } from "@/lib/account/account-deletion.schemas";

/**
 * Closes the account. The last thing this session gets to do.
 *
 * `unwrap` so the component branches on `ApiRequestError` and can render the backend's own
 * message: a `403` naming who closes a staff account is information the user needs, not a
 * generic failure to retry.
 */
export function useRequestAccountDeletionMutation() {
  const queryClient = useQueryClient();
  return useMutation<AccountDeletionRequest>({
    mutationFn: async () => unwrap(await requestAccountDeletion()),
    onSuccess: () => {
      queryClient.clear();
    },
    // A deletion that failed to send is not a flake to paper over — the account is
    // untouched and the person needs to know that, not to have it silently retried.
    retry: false,
  });
}
