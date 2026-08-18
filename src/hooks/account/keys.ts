"use client";

// TRANSPORT: client-query — the React Query key factory for the account surface.
//
// ONE ENTRY, and it stays one until a second `/users/me/*` read has more than one caller. It is a
// file rather than an inline array for the same reason `storeKeys` is: every key starts with the
// literal `"account"`, so `invalidateQueries({ queryKey: accountKeys.all })` clears this domain and
// nothing else — which is what a panel that has just linked a provider needs to do.

export const accountKeys = {
  all: ["account"] as const,

  /**
   * The signed-in user's provider rows.
   *
   * NO USER ID IN THE KEY. The session IS the user and the client never asserts which one — an id
   * held here would outlive a sign-out and serve the previous person's providers to the next.
   */
  linkedAccounts: () => ["account", "linked-accounts"] as const,
};
