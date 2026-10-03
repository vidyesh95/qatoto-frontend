// The version of the Terms and Conditions an account accepts (todo §7). No directive: read by the
// server-rendered Terms page and by client islands alike.
//
// ⚠️ THE BACKEND HOLDS THE SAME STRING (`CURRENT_TERMS_VERSION`, `src/lib/terms-version.ts` in
// qatoto-backend), AND THE TWO MUST CHANGE TOGETHER. An acceptance echoing a version the backend
// does not consider current is a 409, so a Terms update shipped on one side only fails at the first
// acceptance rather than recording that somebody agreed to text they were never shown.

/** The Terms page's "Last updated" date, ISO. What the backend stores. */
export const TERMS_VERSION = "2026-09-28";

/** The same date as the Terms page prints it. */
export const TERMS_LAST_UPDATED_LABEL = "28 September 2026";
