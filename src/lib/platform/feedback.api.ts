// TRANSPORT: client-query — the SUBMITTER's two feedback routes.
//
// IT IS NOT A REPORT, AND THE COPY BUILT ON IT MUST NOT READ LIKE ONE. Every other write of
// this shape in the app is about a person or a piece of content and ends in a moderator's
// verdict about it. This one ends in nobody being judged, so there is no queue position to
// promise, no outcome to report back and no appeal to offer.
//
// WHAT THE CLIENT SENDS IS THE WHOLE BODY: a category, a message, and the path the person
// was on. The browser string is read from the request header by the server — never sent from
// here, because a body-carried user agent is a value this untrusted client chooses.
//
// SEPARATE FILE FROM `admin-feedback.api.ts`, the split `content-reports.api.ts` makes against
// `admin-content-reports.api.ts`: everything here is any signed-in person's own feedback, and
// everything there refuses a caller without `moderate_content`. Keeping them apart means nobody
// imports a staff route into a member surface by autocomplete.
//
// THE VOCABULARY MOVED TO `feedback.schemas.ts` when the reads landed. It is re-exported below
// so the existing importers keep working, and because a caller wanting a label map should not
// have to know which of three files holds it.

import {
  buildQueryString,
  getCursorSiblingList,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  FeedbackReceivedSchema,
  OwnPlatformFeedbackSchema,
  type FeedbackReceived,
  type ListPlatformFeedbackFilter,
  type OwnPlatformFeedback,
  type SendPlatformFeedbackInput,
} from "@/lib/platform/feedback.schemas";

export {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  PLATFORM_FEEDBACK_CATEGORIES,
  PLATFORM_FEEDBACK_CATEGORY_LABELS,
  type PlatformFeedbackCategory,
} from "@/lib/platform/feedback.schemas";
export type { FeedbackReceived, SendPlatformFeedbackInput };

/**
 * Files one piece of feedback.
 *
 * A 201 MEANS A ROW EXISTS. It does not mean anybody has read it, and no copy on this
 * surface may say a reply is coming — nothing in this system sends one.
 */
export function sendPlatformFeedback(
  input: SendPlatformFeedbackInput,
  options?: RequestOptions,
): Promise<ActionResponse<FeedbackReceived>> {
  return sendJson("/feedback", "POST", input, FeedbackReceivedSchema, options);
}

/**
 * `GET /feedback/mine` — the caller's own notes, newest first.
 *
 * NO USER ID IN THE QUERY, and there must never be one: the session decides who "mine" is.
 *
 * ⚠️ AN ERASED ACCOUNT READS AN EMPTY LIST, WHICH IS CORRECT RATHER THAN A BUG. Anonymization
 * nulls `user_id` and keeps the note, so the rows stop being anybody's. Nothing here should
 * apologise for that or imply the notes were deleted.
 *
 * The cursor is an opaque `<epochMs>_<id>` the server minted. Echo it back exactly; never
 * construct or compare one here, or it is a `422`.
 */
export function listOwnPlatformFeedback(
  filter: ListPlatformFeedbackFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: OwnPlatformFeedback[]; nextCursor: string | null }>> {
  return getCursorSiblingList(
    `/feedback/mine${buildQueryString({ status: filter.status, cursor: filter.cursor })}`,
    OwnPlatformFeedbackSchema,
    options,
  );
}
