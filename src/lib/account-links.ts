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
  isOriginal?: boolean;
};

/**
 * Finds the anchor "original" provider the user signed up with.
 *
 * This tries:
 *   1. `"email"` if there are no linked accounts (it was a password/passkey sign-up).
 *   2. The one marked `isOriginal` (better-auth's own flag for the sign-up provider).
 *   3. The first linked account.
 *   4. `"email"` if there are no linked accounts (it was a password/passkey sign-up).
 *
 * Always use this when answering "how did this user sign up?" — do not assume the presence
 * of an email means it was an email sign-up.
 */
export function findOriginalProviderId(linkedAccounts: LinkedAccountSummary[]): string | null {
  if (linkedAccounts.length === 0) return "email";
  const original = linkedAccounts.find((a) => a.isOriginal);
  if (original !== undefined) return original.providerId;
  return linkedAccounts[0]?.providerId ?? null;
}
