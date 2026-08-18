"use client";

// TRANSPORT: client-query — React Query over `GET /users/me/linked-accounts`.

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { accountKeys } from "@/hooks/account/keys";
import { listLinkedAccounts } from "@/lib/account/linked-accounts.api";

/**
 * Which providers are linked, and the address each is linked as.
 *
 * `retry: false` — a 401 here is an answer about the session, not a flake.
 *
 * THE REASON THIS IS A QUERY AND NOT FOUR `useEffect`s: four surfaces ask the same question
 * (`/your-account`, `/your-account/password`, `/your-account/google`, `/your-account/github`) and
 * the answer decides which UI they render — whether the password row says "Set" or "Change",
 * whether a provider shows "Connected". Under one cache entry, walking between them costs one
 * request; under four hand-rolled effects it costs four, and they can disagree mid-navigation.
 */
export function useLinkedAccountsQuery() {
  return useQuery({
    queryKey: accountKeys.linkedAccounts(),
    queryFn: listLinkedAccounts,
    retry: false,
  });
}

/**
 * Marks the provider list stale, for a panel that has just linked, unlinked, or set a credential.
 *
 * Those writes go through the Better Auth SDK rather than our own transport, so nothing else in the
 * cache knows they happened — without this, returning to the list still shows "Set email address"
 * on an account that now has a password.
 */
export function useInvalidateLinkedAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: accountKeys.linkedAccounts() });
}
