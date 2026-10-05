// TRANSPORT: client-query — `/feed/admin/search-terms/suppressions`, behind `moderate_content`.
//
// THE STAFF HALF OF TRENDING-SEARCH SUPPRESSION, in its own file so a member surface cannot import
// the list or the lift by autocomplete (the `cloud-access-admin.api.ts` split). Hiding a term stays
// in `@/lib/feed/api`, beside the trending list it hides from. Every route answers a caller without
// the capability with a 403.

import {
  buildQueryString,
  getCursorSiblingList,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  LiftedSearchTermSuppressionSchema,
  SuppressedSearchTermSchema,
  type SuppressedSearchTerm,
} from "@/lib/feed/search-term-suppression-admin.schemas";

/** The capability that opens this page, in ONE place (the backend owns the vocabulary). */
export const SEARCH_TERM_SUPPRESSION_ADMIN_CAPABILITY = "moderate_content";

/** `GET /feed/admin/search-terms/suppressions` — standing suppressions, newest first. */
export function listSearchTermSuppressions(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: SuppressedSearchTerm[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/feed/admin/search-terms/suppressions${buildQueryString({ cursor: cursor ?? undefined })}`,
    SuppressedSearchTermSchema,
    options,
  );
}

/**
 * `DELETE /feed/admin/search-terms/suppressions/:term` — the stored, already-normalized term, so
 * the list's own `term` is sent back unchanged. A 404 means it is no longer suppressed (another
 * moderator lifted it first). Audited server-side.
 */
export function liftSearchTermSuppression(
  term: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ term: string }>> {
  return sendJson(
    `/feed/admin/search-terms/suppressions/${encodeURIComponent(term)}`,
    "DELETE",
    undefined,
    LiftedSearchTermSuppressionSchema,
    options,
  );
}
