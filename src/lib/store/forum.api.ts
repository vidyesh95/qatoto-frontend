// TRANSPORT: server-fetch — the two public reads are awaited by server components. Everything
// below the `Writes` divider is NOT: it is session-scoped and called from `"use client"` islands.
//
// WIRED. `src/mocks/store/forum-mocks.ts` is deleted.
//

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedCommunityReportSchema,
  CreatedForumReplySchema,
  CreatedForumThreadSchema,
  ForumReplyHelpfulStateSchema,
  ForumThreadAnswerStateSchema,
  ForumThreadDetailSchema,
  ForumThreadListPageSchema,
  OwnForumThreadListPageSchema,
  type AcceptForumReplyInput,
  type CreateCommunityReportInput,
  type CreatedCommunityReport,
  type CreatedForumReply,
  type CreatedForumThread,
  type CreateForumReplyInput,
  type CreateForumThreadInput,
  type ForumReplyHelpfulState,
  type ForumThreadAnswerState,
  type ForumThreadDetail,
  type ForumThreadListPage,
  type ListForumThreadsFilter,
  type OwnForumThreadListPage,
} from "@/lib/store/forum.schemas";

/**
 * The thread list — `GET /store/forum/threads`.
 *
 * A `pending_review` thread NEVER APPEARS HERE. The backend filters it out, the same way the provider
 * directory excludes a draft offering, so a thread awaiting moderation is invisible to everyone but
 * its author. Do not add a client-side filter for it — that would imply the rows arrive and are
 * hidden, which is a different and much weaker guarantee.
 */
export function listForumThreads(
  filter: ListForumThreadsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ForumThreadListPage>> {
  const path = `/store/forum/threads${buildQueryString({ ...filter })}`;
  return getJson(path, ForumThreadListPageSchema, options);
}

/**
 * One thread and its first page of replies — `GET /store/forum/threads/:threadSlug`.
 *
 * A slug with no fixture answers 404, which the detail page turns into `notFound()`. A thread still
 * in `pending_review` is also a 404 to anyone but its author, so a 404 here must never be rendered as
 * "awaiting moderation" — that would tell a stranger a thread exists.
 */
export function getForumThread(
  threadSlug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ForumThreadDetail>> {
  const path = `/store/forum/threads/${threadSlug}`;
  return getJson(path, ForumThreadDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /community/forum/threads` — queues a thread for MODERATION.
 *
 * IT DOES NOT PUBLISH. The row comes back `state: "pending_review"` and appears in no public read
 * until a moderator approves it. `forum.schemas.ts` explains at length why that is the design and not
 * a stand-in — the short version is that A10 closed public comments for want of a standing
 * requirement, and moderation is what lets a forum exist without reopening that argument.
 *
 * Requires an `Idempotency-Key`. A retry without one posts the question twice and a moderator rejects
 * one by hand.
 */
export function createForumThread(
  input: CreateForumThreadInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedForumThread>> {
  const path = "/community/forum/threads";
  void input;
  // A FIXED row rather than an echo. An echoed slug would let the success screen offer a link to a
  // thread nobody can read — which, for a thread in moderation, is every reader including its author.
  return sendJson(path, "POST", input, CreatedForumThreadSchema, options);
}

/**
 * `POST /community/forum/threads/:threadId/replies`.
 *
 * REQUIRES THE THREAD IN `open` OR `answered`. A `locked` thread refuses with a tagged error, not
 * a silent no-op, so the composer renders the refusal rather than clearing the box and letting the
 * author believe they answered somebody.
 *
 * Requires an `Idempotency-Key`. A retry without one posts the same answer twice, and a duplicate
 * answer under a question is a small dishonesty about how much help the thread got.
 */
export function createForumReply(
  threadId: string,
  input: CreateForumReplyInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedForumReply>> {
  const path = `/community/forum/threads/${encodeURIComponent(threadId)}/replies`;
  void input;
  return sendJson(path, "POST", input, CreatedForumReplySchema, options);
}

/**
 * `POST /community/forum/threads/:threadId/accepted-reply` — the author marks the answer.
 *
 * ONLY THE THREAD AUTHOR MAY CALL IT, and it is ALLOWED ON A `locked` THREAD: locking stops new
 * text, not bookkeeping. The thread's `answered` state is derived from the accepted id server-side,
 * so nothing here sets a state directly.
 */
export function acceptForumReply(
  threadId: string,
  input: AcceptForumReplyInput,
  options?: RequestOptions,
): Promise<ActionResponse<ForumThreadAnswerState>> {
  const path = `/community/forum/threads/${encodeURIComponent(threadId)}/accepted-reply`;
  void input;
  return sendJson(path, "POST", input, ForumThreadAnswerStateSchema, options);
}

/**
 * `DELETE /community/forum/threads/:threadId/accepted-reply` — unmark it.
 *
 * The thread returns to `open` and `acceptedReplyId` to `null`, which STILL DOES NOT MEAN "nobody
 * helped". It means nobody is pointing at one answer.
 */
export function clearForumAcceptedReply(
  threadId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ForumThreadAnswerState>> {
  const path = `/community/forum/threads/${encodeURIComponent(threadId)}/accepted-reply`;
  return sendJson(path, "DELETE", undefined, ForumThreadAnswerStateSchema, options);
}

/**
 * `PUT /community/forum/replies/:replyId/helpful` — endorse.
 *
 * NO `Idempotency-Key` ON THIS OR ITS `DELETE` (A24). Setting a boolean twice is setting it once,
 * so they are idempotent by verb and a key would imply the write is riskier than it is.
 */
export function markForumReplyHelpful(
  replyId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ForumReplyHelpfulState>> {
  const path = `/community/forum/replies/${encodeURIComponent(replyId)}/helpful`;
  return sendJson(path, "PUT", undefined, ForumReplyHelpfulStateSchema, options);
}

/**
 * `DELETE /community/forum/replies/:replyId/helpful` — withdraw the endorsement.
 *
 * WITHDRAWING IS NOT A DOWNVOTE. It removes this reader's endorsement and nothing else; there is no
 * negative signal on the wire and there must never be one, because a reputational mark against a
 * named organization needs an appeal process this surface does not have.
 */
export function clearForumReplyHelpful(
  replyId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ForumReplyHelpfulState>> {
  const path = `/community/forum/replies/${encodeURIComponent(replyId)}/helpful`;
  return sendJson(path, "DELETE", undefined, ForumReplyHelpfulStateSchema, options);
}

/**
 * The author's own threads — `GET /community/forum/threads/mine`.
 *
 * NOT OPTIONAL (§17.3). `pending_review` appears in no public read by design, so without this the
 * create response is the last thing an author ever sees of their own thread — including a
 * rejection, which stays `pending_review` and carries its reason here and nowhere else.
 */
export function listOwnForumThreads(
  filter: ListForumThreadsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<OwnForumThreadListPage>> {
  const path = `/community/forum/threads/mine${buildQueryString({ ...filter })}`;
  return getJson(path, OwnForumThreadListPageSchema, options);
}

/**
 * `POST /community/reports` — report a thread or a reply.
 *
 * ITS OWN QUEUE, NOT COMMERCE'S (§17.4). A moderator working counterfeit listings and one working
 * off-topic threads are not the same shift, they are gated by different capabilities, and merging
 * the two queues creates the coupling capabilities exist to prevent.
 */
export function createCommunityReport(
  input: CreateCommunityReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedCommunityReport>> {
  return sendJson("/community/reports", "POST", input, CreatedCommunityReportSchema, options);
}
