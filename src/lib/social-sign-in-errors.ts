// TRANSPORT: props-only — a pure lookup, no network, no React. No directive on purpose: the
// sign-in PAGE (a server component) reads `?error=` and calls this, so it must not be a client
// module (see `pnpm check:client-boundary`).

/**
 * A failed Google or GitHub round trip comes back to `/sign-in?error=<code>`. The backend sends it
 * there: the frontend's `errorCallbackURL`, or the backend's `onAPIError.errorURL` when the flow
 * could not recover its own. The codes are Better Auth's `OAUTH_CALLBACK_ERROR_CODES`, its state
 * codes, and the provider's own `access_denied`.
 *
 * `?error=` IS ATTACKER-WRITABLE, so it only ever selects one of these fixed sentences, and the
 * page never renders it or `error_description`. An unknown code gets the neutral sentence.
 * The code carries no provider, so none of the sentences name Google or GitHub.
 */
const SOCIAL_SIGN_IN_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  access_denied: "Sign-in was cancelled before it finished.",
  state_not_found: "That sign-in expired or was started in another tab. Try again.",
  state_mismatch: "That sign-in expired or was started in another tab. Try again.",
  please_restart_the_process: "That sign-in expired or was started in another tab. Try again.",
  invalid_callback_request: "That sign-in expired or was started in another tab. Try again.",
  no_code: "That sign-in expired or was started in another tab. Try again.",
  invalid_code: "That sign-in expired or was started in another tab. Try again.",
  email_not_found:
    "That account didn't give Qatoto an email address. Add a verified email to it and try again.",
  email_not_verified:
    "That account's email isn't verified yet. Verify it with the provider, then try again.",
  account_already_linked_to_different_user:
    "That account is linked to a different Qatoto user. Sign in the way you did before.",
  unable_to_link_account:
    "That account couldn't be connected to your Qatoto account. Sign in the way you did before.",
};

const FALLBACK_SOCIAL_SIGN_IN_ERROR_MESSAGE = "Couldn't finish signing in. Try again in a moment.";

/** The sentence for a `?error=` value, or `null` when there is no error to show. */
export function describeSocialSignInError(rawErrorCode: unknown): string | null {
  if (typeof rawErrorCode !== "string" || rawErrorCode === "") return null;
  return Object.hasOwn(SOCIAL_SIGN_IN_ERROR_MESSAGES, rawErrorCode)
    ? SOCIAL_SIGN_IN_ERROR_MESSAGES[rawErrorCode]
    : FALLBACK_SOCIAL_SIGN_IN_ERROR_MESSAGE;
}
