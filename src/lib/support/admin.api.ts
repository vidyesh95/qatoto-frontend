// TRANSPORT: client-query — the STAFF half of support cases, `/support/admin/*`.
//
// ITS OWN FILE, so a member surface cannot import a staff route by autocomplete — the split
// `admin-content-reports.api.ts` makes. Every route here refuses a caller without the
// capability below with a 403 that names it.

import {
  buildQueryString,
  getCursorSiblingList,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  StaffSupportCaseDetailSchema,
  StaffSupportCaseSummarySchema,
  type ListSupportCaseQueueFilter,
  type StaffSupportCaseDetail,
  type StaffSupportCaseSummary,
} from "@/lib/support/schemas";

/**
 * The capability that opens this queue, in ONE place.
 *
 * The staff-context read types `capabilities` as a bare `string[]` rather than an enum — the
 * backend owns that vocabulary and the frontend must not fork it — so this literal is what
 * every gate compares against, and a rename on the server is a one-line change here.
 */
export const SUPPORT_QUEUE_CAPABILITY = "handle_support_cases";

function withIdempotencyKey(
  idempotencyKey: string,
  options: RequestOptions | undefined,
): RequestOptions {
  return { ...options, headers: { ...options?.headers, "Idempotency-Key": idempotencyKey } };
}

/** `GET /support/admin/cases` — the queue, OLDEST FIRST: the longest wait is the most urgent. */
export function listSupportCaseQueue(
  filter: ListSupportCaseQueueFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: StaffSupportCaseSummary[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/support/admin/cases${buildQueryString({
      state: filter.state,
      category: filter.category,
      cursor: filter.cursor,
    })}`,
    StaffSupportCaseSummarySchema,
    options,
  );
}

/**
 * `GET /support/admin/cases/:caseId` — one case, with the thread and the person.
 *
 * A SEPARATE READ FROM THE OPENER'S, and a separate cache key, because the projections differ:
 * this one names who wrote in and the member's own never does.
 */
export function getSupportCaseAsStaff(
  caseId: string,
  options?: RequestOptions,
): Promise<ActionResponse<StaffSupportCaseDetail>> {
  return getJson(
    `/support/admin/cases/${encodeURIComponent(caseId)}`,
    StaffSupportCaseDetailSchema,
    options,
  );
}

/**
 * `POST /support/admin/cases/:caseId/messages` — the staff reply.
 *
 * Moves the case to "waiting on them" and notifies the person, server-side. Nothing here has
 * to arrange that, and nothing here may claim it happened before the response says so.
 */
export function addStaffSupportCaseMessage(
  caseId: string,
  input: { readonly body: string },
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<StaffSupportCaseDetail>> {
  return sendJson(
    `/support/admin/cases/${encodeURIComponent(caseId)}/messages`,
    "POST",
    input,
    StaffSupportCaseDetailSchema,
    withIdempotencyKey(idempotencyKey, options),
  );
}

/**
 * `POST /support/admin/cases/:caseId/decisions` — resolve, or close.
 *
 * THE NOTE IS REQUIRED AND THE PERSON READS IT: it is appended to the thread as the last
 * message, not filed as an internal annotation. A verdict with no sentence is a case ended
 * without an answer.
 *
 * `resolved` leaves the door open — the person can reply and reopen it for a while. `closed`
 * is terminal for everybody, staff included.
 */
export function decideSupportCase(
  caseId: string,
  input: { readonly decision: "resolved" | "closed"; readonly note: string },
  idempotencyKey: string,
  options?: RequestOptions,
): Promise<ActionResponse<StaffSupportCaseDetail>> {
  return sendJson(
    `/support/admin/cases/${encodeURIComponent(caseId)}/decisions`,
    "POST",
    input,
    StaffSupportCaseDetailSchema,
    withIdempotencyKey(idempotencyKey, options),
  );
}
