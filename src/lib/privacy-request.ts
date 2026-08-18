// TRANSPORT: props-only — builds a `mailto:` string. No network, no DOM, no React.
//
// WHY A DATA-SUBJECT REQUEST IS AN EMAIL AND NOT A BUTTON.
//
// GDPR gives the account holder a right of access (Art. 15), portability (Art. 20) and erasure
// (Art. 17). The Express backend implements none of them today: `PATCH /users/me`,
// `PATCH/DELETE /users/me/photo` and `PATCH /users/me/handle` are the entire `/users` write surface,
// there is no export route, and Better Auth's `deleteUser` plugin is deliberately not enabled. So
// the honest control is the one the privacy policy already promises — a request to a monitored
// mailbox, which Art. 12 accepts, answered within one month.
//
// THE POINT OF PREFILLING IS IDENTIFICATION. A bare "delete my account" from an address the
// operator cannot tie to a row is a request they must either refuse or answer by guessing, and
// guessing is how the wrong account gets erased. The account id travels in the body so the person
// reading it can find exactly one user.
//
// NOTHING HERE IS A TRUST BOUNDARY. A `mailto:` is a hint to the visitor's own mail client; anyone
// can edit the body before sending, and the operator must re-verify the requester's identity
// against the session or the address on file before acting. This module only saves typing.

import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";

/** How long the operator has to answer, in the copy and in the request body. GDPR Art. 12(3). */
export const PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL = "one month";

/** How long a deletion request stays cancellable before anonymization runs. */
export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;

/** The two requests this app can raise on the account holder's behalf. */
export type PrivacyRequest =
  | { readonly kind: "data-export"; readonly accountId: string; readonly accountHandle: string }
  | {
      readonly kind: "account-deletion";
      readonly accountId: string;
      readonly accountHandle: string;
    };

/**
 * A `mailto:` href with the subject and body already written.
 *
 * `encodeURIComponent` rather than `URLSearchParams`, because the latter encodes a space as `+` and
 * mail clients render that literally — a body full of `+` signs reads as a broken form, not a
 * request.
 */
export function buildPrivacyRequestMailtoHref(request: PrivacyRequest): string {
  const subject =
    request.kind === "data-export" ? "Data access request" : "Account deletion request";

  const bodyLines =
    request.kind === "data-export"
      ? [
          "Hello,",
          "",
          "I would like a copy of the personal data held about my Qatoto account.",
          "",
          `Account ID: ${request.accountId}`,
          `Handle: @${request.accountHandle}`,
          "",
          "Please send it in a commonly used, machine-readable format.",
        ]
      : [
          "Hello,",
          "",
          "I would like my Qatoto account deactivated and my personal data anonymized.",
          "",
          `Account ID: ${request.accountId}`,
          `Handle: @${request.accountHandle}`,
          "",
          "I understand that:",
          "- my account is deactivated as soon as this request is confirmed,",
          `- I have ${ACCOUNT_DELETION_GRACE_PERIOD_DAYS} days to cancel by replying to the confirmation,`,
          "- after that my identity is erased and cannot be restored,",
          "- records that are kept for legal reasons stay, without my name attached.",
        ];

  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}
