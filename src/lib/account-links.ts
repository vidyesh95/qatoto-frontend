/**
 * Helpers for reasoning about the providers linked to the current user.
 *
 * The provider used at signup is the one whose `account` row was created first:
 * at signup exactly one row exists, and every other provider is attached later by
 * an explicit user action. That "original" provider is the user's anchor sign-in
 * method and must never be unlinkable, so they can't strand themselves.
 *
 * Not a trust boundary — the Express backend re-derives and re-enforces this on
 * every `/unlink-account` call; the frontend only uses it to hide the button.
 */

/** The subset of a Better Auth `listAccounts()` row this module needs. */
type LinkedAccountSummary = {
  providerId: string;
  accountId: string;
  createdAt: Date | string;
};

/**
 * The `providerId` of the account created first (the signup method), or `null`
 * when there are no linked accounts.
 */
export function findOriginalProviderId(linkedAccounts: LinkedAccountSummary[]): string | null {
  let originalAccount: LinkedAccountSummary | null = null;
  let originalAccountCreatedAtMs = Number.POSITIVE_INFINITY;
  for (const linkedAccount of linkedAccounts) {
    const linkedAccountCreatedAtMs = new Date(linkedAccount.createdAt).getTime();
    if (linkedAccountCreatedAtMs < originalAccountCreatedAtMs) {
      originalAccount = linkedAccount;
      originalAccountCreatedAtMs = linkedAccountCreatedAtMs;
    }
  }
  return originalAccount?.providerId ?? null;
}
