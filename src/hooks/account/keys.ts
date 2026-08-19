"use client";

// TRANSPORT: client-query — the React Query key factory for the account surface.
//
// It is a file rather than an inline array for the same reason `storeKeys` is: every key starts
// with the literal `"account"`, so `invalidateQueries({ queryKey: accountKeys.all })` clears this
// domain and nothing else — which is what a panel that has just linked a provider needs to do.

export const accountKeys = {
  all: ["account"] as const,

  /**
   * The signed-in user's provider rows.
   *
   * NO USER ID IN THE KEY. The session IS the user and the client never asserts which one — an id
   * held here would outlive a sign-out and serve the previous person's providers to the next.
   */
  linkedAccounts: () => ["account", "linked-accounts"] as const,

  /**
   * The signed-in user's WebAuthn passkeys. Same no-user-id rule as above — the session is the
   * user, and a key that named one would serve the previous person's passkeys after a switch.
   */
  passkeys: () => ["account", "passkeys"] as const,

  /**
   * The signed-in viewer's own watch time, keyed on the zone the totals were cut in.
   *
   * THE ZONE IS IN THE KEY because it changes the answer: `today` and every day boundary in the
   * series move with it, so two zones are two different responses and must not share a cache
   * entry. No user id, for the reason the two keys above state — the session is the user.
   */
  watchTime: (timeZone: string) => ["account", "watch-time", timeZone] as const,

  /**
   * The signed-in viewer's latest data export.
   *
   * NO REQUEST ID IN THE KEY, and that is a decision rather than an omission: there is one
   * export per account and `GET /users/me/export` takes no id, so keying on the id a POST
   * happened to return would strand the poll the moment the panel remounts or the tab
   * reloads — the exact conditions a dropdown lives under.
   *
   * No user id either, for the reason the three keys above state.
   */
  dataExport: () => ["account", "data-export"] as const,
};

/**
 * How often the panel re-asks while an archive is building.
 *
 * THREE SECONDS, NOT THE TWO `usePaymentIntentQuery` USES, and the difference is stated
 * rather than left to drift: a payment outbox dispatch resolves in a round trip, while an
 * export walks every table referencing one person and gzips the result. Polling faster
 * would spend the caller's rate limit re-reading `pending`.
 */
export const DATA_EXPORT_POLL_INTERVAL_MS = 3_000;
