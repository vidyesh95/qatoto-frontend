// TRANSPORT: client-query — the STAFF half of site feedback, `/admin/feedback`.
//
// ITS OWN FILE, so a member surface cannot import a staff route by autocomplete — the split
// `admin-content-reports.api.ts` makes, and the one `todo.md` named for this domain before it
// was written. Every route here refuses a caller without the capability below with a 403 that
// names it.
//
// ⚠️ THE ENDPOINT EXISTED FOR MONTHS WITH NO CALLER. `GET /admin/feedback` shipped with the
// write and nothing in this repo read it, so feedback was write-only in practice: people filed
// it and nobody could see it. That is the gap this file closes, and it is why the queue page
// matters more than it looks — a suggestion box nobody opens is worse than no box at all.

import {
  buildQueryString,
  getCursorSiblingList,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  OwnPlatformFeedbackSchema,
  StaffPlatformFeedbackSchema,
  type ListPlatformFeedbackFilter,
  type OwnPlatformFeedback,
  type PlatformFeedbackDecision,
  type StaffPlatformFeedback,
} from "@/lib/platform/feedback.schemas";

/**
 * The capability that opens this queue, in ONE place.
 *
 * The staff-context read types `capabilities` as a bare `string[]` rather than an enum — the
 * backend owns that vocabulary and the frontend must not fork it — so this literal is what
 * every gate compares against, and a rename on the server is a one-line change here.
 *
 * ⚠️ IT IS `moderate_content`, THE SAME ONE THE REPORT QUEUES USE, and not a feedback-specific
 * capability. That is the backend's choice, mirrored rather than second-guessed: whoever reads
 * unstructured free text from members reads all of it.
 */
export const FEEDBACK_QUEUE_CAPABILITY = "moderate_content";

/**
 * `GET /admin/feedback` — the queue, OLDEST FIRST: the longest wait is the most urgent.
 *
 * Note the direction disagrees with `listOwnPlatformFeedback`, on purpose. A submitter opens
 * their list to find the note they just sent; a moderator opens this one to find the note
 * nobody has answered.
 */
export function listPlatformFeedbackQueue(
  filter: ListPlatformFeedbackFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: StaffPlatformFeedback[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/admin/feedback${buildQueryString({ status: filter.status, cursor: filter.cursor })}`,
    StaffPlatformFeedbackSchema,
    options,
  );
}

/**
 * `POST /admin/feedback/:feedbackId/decisions` — mark read, or close.
 *
 * ⚠️ NO IDEMPOTENCY KEY, UNLIKE EVERY OTHER DECISION WRITE IN THIS APP. The support and report
 * queues require one because their decision appends a hash-chained audit entry, and a replay
 * would make the chain claim two decisions were taken. This appends nothing: it sets a triage
 * flag, and setting a flag twice sets it once. Do not add a key here to "match the others" —
 * the backend does not accept one, and the thing the key protects does not exist.
 *
 * ⚠️ IT ANSWERS THE SUBMITTER'S PROJECTION, NOT THE QUEUE ROW. There is no author on the
 * response, because the caller already has it on screen and re-reading it would cost a join
 * for a name nothing changed. Merge the returned `status` into the row you already hold.
 */
export function decidePlatformFeedback(
  feedbackId: string,
  input: { readonly decision: PlatformFeedbackDecision },
  options?: RequestOptions,
): Promise<ActionResponse<OwnPlatformFeedback>> {
  return sendJson(
    `/admin/feedback/${encodeURIComponent(feedbackId)}/decisions`,
    "POST",
    input,
    OwnPlatformFeedbackSchema,
    options,
  );
}
