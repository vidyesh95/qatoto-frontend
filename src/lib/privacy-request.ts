// TRANSPORT: props-only — builds a `mailto:` string. No network, no DOM, no React.
//
// WHAT IS LEFT OF THIS FILE, NOW THAT TWO OF THE RIGHTS HAVE ENDPOINTS.
//
// Access (Art. 15/20) and erasure (Art. 17) are self-serve: `POST /users/me/export` builds
// a downloadable archive, and `POST /users/me/deletion-request` deactivates immediately and
// schedules the anonymization. Neither goes through a mailbox any more, and the panels no
// longer link here for them.
//
// THREE JOBS SURVIVE, and each is real:
//
//   1. THE RESIDUAL RIGHTS. Correction, restriction and objection have no endpoint and no
//      plan for one. The privacy policy commits to answering them within a month, and a
//      prefilled draft is what Art. 12 accepts.
//   2. THE FAILURE FALLBACK for both new flows. A statutory right must not depend on our
//      job queue: if the export returns `failed` or the deletion POST 500s, the person is
//      still owed an answer, and `note` below carries the failing code so whoever reads it
//      knows what to look at.
//   3. `ACCOUNT_DELETION_GRACE_PERIOD_DAYS`, which is now a piece of COPY rather than a
//      schedule — see its own comment.
//
// THE POINT OF PREFILLING IS STILL IDENTIFICATION. A bare "delete my account" from an
// address the operator cannot tie to a row is a request they must either refuse or answer
// by guessing, and guessing is how the wrong account gets erased.
//
// NOTHING HERE IS A TRUST BOUNDARY. A `mailto:` is a hint to the visitor's own mail client;
// anyone can edit the body before sending, and the operator must re-verify the requester
// against the session or the address on file before acting.

import { PRIVACY_CONTACT_EMAIL } from "@/lib/site";

/** How long the operator has to answer an EMAILED request. GDPR Art. 12(3). */
export const PRIVACY_REQUEST_RESPONSE_WINDOW_LABEL = "one month";

/**
 * The ADVERTISED grace period, for copy written before a request exists.
 *
 * ⚠️ NOT A SCHEDULE, AND NEVER ARITHMETIC. Once a deletion exists the server's
 * `scheduledAnonymizationAt` is the only date the UI may print. Rendering
 * `now + ACCOUNT_DELETION_GRACE_PERIOD_DAYS` would be the client displaying its own guess
 * as a commitment — and the two disagree the moment the request is a few seconds old, or a
 * retry happened, or this constant changes while requests are live.
 */
export const ACCOUNT_DELETION_GRACE_PERIOD_DAYS = 30;

/** The requests this app can still raise on the account holder's behalf, by email. */
export type PrivacyRequest = {
  /**
   * `other-right` IS THE ONE THIS FILE CLAIMED TO SERVE AND DID NOT.
   *
   * The header has always said job #1 is the residual rights — correction, restriction,
   * objection — but the union only ever had the two kinds that later grew endpoints. So the
   * three rights with NO endpoint were the three with no draft either, and the privacy
   * policy pointed them at an address rendered as plain text.
   */
  readonly kind: "data-export" | "account-deletion" | "other-right";
  readonly accountId: string;
  readonly accountHandle: string;
  /**
   * Why the in-app route did not work — e.g. "The in-app download failed with code 503".
   *
   * THE DIFFERENCE BETWEEN A FALLBACK AND A DEAD END. Without it the operator receives a
   * request identical to one somebody sent for no reason, and cannot tell that a system
   * they own is broken.
   */
  readonly note?: string;
};

/**
 * A `mailto:` href with the subject and body already written.
 *
 * `encodeURIComponent` rather than `URLSearchParams`, because the latter encodes a space as
 * `+` and mail clients render that literally — a body full of `+` signs reads as a broken
 * form, not a request.
 */
export function buildPrivacyRequestMailtoHref(request: PrivacyRequest): string {
  const subject =
    request.kind === "data-export"
      ? "Data access request"
      : request.kind === "account-deletion"
        ? "Account deletion request"
        : "Data protection request";

  const identityLines = [`Account ID: ${request.accountId}`, `Handle: @${request.accountHandle}`];
  const noteLines = request.note === undefined ? [] : ["", request.note];

  const bodyLines =
    request.kind === "other-right"
      ? [
          "Hello,",
          "",
          "I would like to exercise a data protection right over my Qatoto account.",
          "",
          ...identityLines,
          "",
          "Please treat this as a request to (delete as appropriate):",
          "- correct information that is wrong or incomplete,",
          "- restrict what you do with my information while a question about it is resolved,",
          "- object to your use of my information where you rely on legitimate interests.",
          ...noteLines,
        ]
      : request.kind === "data-export"
        ? [
            "Hello,",
            "",
            "I would like a copy of the personal data held about my Qatoto account.",
            "",
            ...identityLines,
            "",
            "Please send it in a commonly used, machine-readable format.",
            ...noteLines,
          ]
        : [
            "Hello,",
            "",
            "I would like my Qatoto account deactivated and my personal data anonymized.",
            "",
            ...identityLines,
            "",
            "I understand that:",
            "- my account is deactivated as soon as this request is actioned,",
            `- I have ${ACCOUNT_DELETION_GRACE_PERIOD_DAYS} days to cancel by signing in again,`,
            "- after that my identity is erased and cannot be restored,",
            "- records that are kept for legal reasons stay, without my name attached.",
            ...noteLines,
          ];

  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
}
