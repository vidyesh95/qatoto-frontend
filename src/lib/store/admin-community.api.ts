// TRANSPORT: client-query — every call here is made from the admin console island.
//
// WIRED. `src/mocks/store/community-moderation-mocks.ts` is deleted.
//
// EVERY DECISION ANSWERS ONE ROW, NOT THE QUEUE. All four writes here parsed a whole
// `{ items, page }` page, and none of them returns one: the two thread/profile moderations answer
// the row they acted on, the reply moderation answers `{ replyId, state }`, and the report dismissal
// answers `{ reportId }`. So every decision failed its parse — a moderator pressing publish saw an
// error on a write that had already succeeded, which is the worst possible shape for a console whose
// whole job is deciding things.
//
// Re-reading the queue afterwards is the HOOK's job, and `onSuccess` is where that lives.
//
// LEGACY NOTE — the endpoints exist —
// `STORE_BACKEND_STRUCTURE.md` §6.7 records Phases 18–19 as shipped — so wiring is one edit per
// function: swap `resolveMockRead` for `getJson` (or the write for `sendJson`) and drop the fixture
// argument for `options`.
//
// SEVEN ROUTES, TWO QUEUES AND ONE CAPABILITY. Forum threads, forum replies, content reports and
// cofounder profiles are all gated by `moderate_content`, checked in-service so a refusal comes
// back as a tagged result the console can render rather than an opaque 403.
//
// THE QUEUE PREDICATE IS THE THING TO UNDERSTAND BEFORE CHANGING ANYTHING HERE. A rejected forum
// thread STAYS `pending_review` and gains a moderation timestamp — that pairing is what keeps it
// out of every public read while leaving it readable by its author on `/mine`, with the reason
// attached. So the backend's queue filters on "pending_review AND not yet moderated", and a
// console that filtered on state alone would show every rejection it had ever made, forever.
//
// A cofounder profile behaves differently on purpose: rejecting one returns it to `draft` so its
// owner can fix and resubmit. Nobody edits a posted question; everybody edits their own profile.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  AdminCofounderProfileQueuePageSchema,
  CofounderProfileCardSchema,
  type AdminCofounderProfileQueuePage,
  type CofounderProfileCard,
  type ListAdminCofounderProfilesFilter,
  type ModerateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";
import {
  AdminForumThreadQueuePageSchema,
  AdminForumThreadSchema,
  ModerateForumReplyResultSchema,
  CommunityContentReportQueuePageSchema,
  DismissedCommunityReportSchema,
  type AdminForumThread,
  type AdminForumThreadQueuePage,
  type DismissedCommunityReport,
  type ModerateForumReplyResult,
  type CommunityContentReportQueuePage,
  type DismissCommunityContentReportInput,
  type ListAdminForumThreadsFilter,
  type ListCommunityContentReportsFilter,
  type ModerateForumReplyInput,
  type ModerateForumThreadInput,
} from "@/lib/store/forum.schemas";

// --- Forum threads -----------------------------------------------------------

/** `GET /community/admin/forum/threads` — the moderation queue. */
export function listAdminForumThreads(
  filter: ListAdminForumThreadsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminForumThreadQueuePage>> {
  const path = `/community/admin/forum/threads${buildQueryString({ ...filter })}`;
  return getJson(path, AdminForumThreadQueuePageSchema, options);
}

/**
 * `POST /community/admin/forum/threads/:threadId/moderate`.
 *
 * FOUR DECISIONS, AND `reject` IS NOT A DELETE. It leaves the thread `pending_review` with the
 * moderator's note attached — invisible publicly, readable by its author. `publish` moves it to
 * `open`, never straight to `answered`: whether anybody actually answered is the author's call,
 * not a moderator's.
 */
export function moderateForumThread(
  threadId: string,
  input: ModerateForumThreadInput,
  options?: RequestOptions,
): Promise<ActionResponse<AdminForumThread>> {
  const path = `/community/admin/forum/threads/${encodeURIComponent(threadId)}/moderate`;
  return sendJson(path, "POST", input, AdminForumThreadSchema, options);
}

/**
 * `POST /community/admin/forum/replies/:replyId/moderate`.
 *
 * `hidden` AND `restored`, NEVER A DELETE. A hidden reply keeps its place in the thread, because a
 * conversation with a silent hole in it reads as though the answer above it was never challenged.
 */
export function moderateForumReply(
  replyId: string,
  input: ModerateForumReplyInput,
  options?: RequestOptions,
): Promise<ActionResponse<ModerateForumReplyResult>> {
  const path = `/community/admin/forum/replies/${encodeURIComponent(replyId)}/moderate`;
  return sendJson(path, "POST", input, ModerateForumReplyResultSchema, options);
}

// --- Content reports ---------------------------------------------------------

/** `GET /community/admin/content-reports` — the community report queue. */
export function listCommunityContentReports(
  filter: ListCommunityContentReportsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<CommunityContentReportQueuePage>> {
  const path = `/community/admin/content-reports${buildQueryString({ ...filter })}`;
  return getJson(path, CommunityContentReportQueuePageSchema, options);
}

/**
 * `POST /community/admin/content-reports/:reportId/decisions` — dismiss a report.
 *
 * DISMISSAL IS THE ONLY DECISION THIS ROUTE MAKES. Acting on the reported content is a separate
 * `moderate` call against the thread or the reply, deliberately: a report is a claim about
 * content, and closing the claim is a different act from removing the text. Two routes keep the
 * audit trail able to say which one happened.
 */
export function dismissCommunityContentReport(
  reportId: string,
  input: DismissCommunityContentReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<DismissedCommunityReport>> {
  const path = `/community/admin/content-reports/${encodeURIComponent(reportId)}/decisions`;
  return sendJson(path, "POST", input, DismissedCommunityReportSchema, options);
}

// --- Cofounder profiles ------------------------------------------------------

/** `GET /community/admin/cofounder-profiles` — the moderation queue. */
export function listAdminCofounderProfiles(
  filter: ListAdminCofounderProfilesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminCofounderProfileQueuePage>> {
  const path = `/community/admin/cofounder-profiles${buildQueryString({ ...filter })}`;
  return getJson(path, AdminCofounderProfileQueuePageSchema, options);
}

/**
 * `POST /community/admin/cofounder-profiles/:profileId/moderate`.
 *
 * REJECTING RETURNS THE PROFILE TO `draft` with the note attached, unlike a forum thread. The
 * difference is that a profile is meant to be revised: its owner can act on the note and submit
 * again, where a rejected question is simply not a question this board will carry.
 *
 * NOTHING HERE READS OR WRITES A CAPITAL FIGURE, because no column exists to hold one (§14).
 */
export function moderateCofounderProfile(
  profileId: string,
  input: ModerateCofounderProfileInput,
  options?: RequestOptions,
): Promise<ActionResponse<CofounderProfileCard>> {
  const path = `/community/admin/cofounder-profiles/${encodeURIComponent(profileId)}/moderate`;
  return sendJson(path, "POST", input, CofounderProfileCardSchema, options);
}
