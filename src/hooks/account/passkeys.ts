"use client";

// TRANSPORT: client-query — React Query over the Better Auth SDK's `passkey.listUserPasskeys()`.
//
// NOT OUR TRANSPORT, DELIBERATELY. Every other read on this surface goes through `@/lib/http`, but
// the passkey list is served by Better Auth's own route (`/api/auth/passkey/list-user-passkeys`)
// and the SDK already returns `{ data, error }` — putting a second HTTP client in front of it would
// mean re-declaring a schema for rows the SDK types for us. What this file adds is the two things
// the SDK does not: a cache entry the "Your account" panel can read without a request per open, and
// the `ActionResponse` shape the rest of the account surface branches on (CLAUDE.md Pattern 3).
//
// `PasskeysPanel` keeps its own `useState` list. It owns add/rename/delete and refetches after each
// one; this query exists for READERS that only need the count.

import type { Passkey } from "@better-auth/passkey/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/hooks/account/keys";
import { authClient } from "@/lib/auth-client";
import type { ActionResponse } from "@/lib/http";

/**
 * The passkeys registered on the signed-in account.
 *
 * `retry: false` — a 401 here is an answer about the session, not a flake, exactly as in
 * `useLinkedAccountsQuery`.
 */
export function usePasskeysQuery() {
  return useQuery({
    queryKey: accountKeys.passkeys(),
    queryFn: listUserPasskeys,
    retry: false,
    // The count changes only when someone adds or removes a passkey, which happens in a panel that
    // invalidates this key. A minute of staleness costs nothing and saves a request per panel open.
    staleTime: 60_000,
  });
}

/**
 * Marks the passkey list stale, for a caller that has just added or removed one.
 *
 * Those writes go through the Better Auth SDK rather than our own transport, so nothing else in the
 * cache knows they happened.
 */
export function useInvalidatePasskeys() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: accountKeys.passkeys() });
}

/** SDK result → tagged result. A failed read is an error value, never a silently empty list. */
async function listUserPasskeys(): Promise<ActionResponse<Passkey[]>> {
  const { data: passkeys, error } = await authClient.passkey.listUserPasskeys();

  if (error || !passkeys) {
    return {
      success: false,
      error: {
        code: error?.status ? String(error.status) : "NETWORK",
        message: error?.message ?? "Couldn't check your passkeys.",
      },
    };
  }

  return { success: true, data: passkeys };
}
