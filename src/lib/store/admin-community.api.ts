// TRANSPORT: client-query — every call here is made from the admin console island.
//
// MOCK-BACKED: every call resolves a fixture. The endpoints exist —
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
  type AdminCofounderProfileQueuePage,
  type ListAdminCofounderProfilesFilter,
  type ModerateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";
import {
  AdminForumThreadQueuePageSchema,
  CommunityContentReportQueuePageSchema,
  type AdminForumThreadQueuePage,
  type CommunityContentReportQueuePage,
  type DismissCommunityContentReportInput,
  type ListAdminForumThreadsFilter,
  type ListCommunityContentReportsFilter,
  type ModerateForumReplyInput,
  type ModerateForumThreadInput,
} from "@/lib/store/forum.schemas";
import { resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_ADMIN_COFOUNDER_QUEUE_PAGE,
  MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE,
  MOCK_COMMUNITY_CONTENT_REPORT_QUEUE_PAGE,
} from "@/mocks/store/community-moderation-mocks";

// --- Forum threads -----------------------------------------------------------

/** `GET /community/admin/forum/threads` — the moderation queue. */
export function listAdminForumThreads(
  filter: ListAdminForumThreadsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminForumThreadQueuePage>> {
  const path = `/community/admin/forum/threads${buildQueryString({ ...filter })}`;
  return resolveMockRead(
    path,
    AdminForumThreadQueuePageSchema,
    options,
    MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE,
  );
  // return getJson(path, AdminForumThreadQueuePageSchema, options);
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
): Promise<ActionResponse<AdminForumThreadQueuePage>> {
  const path = `/community/admin/forum/threads/${encodeURIComponent(threadId)}/moderate`;
  void input;
  return resolveMockRead(
    path,
    AdminForumThreadQueuePageSchema,
    options,
    MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE,
  );
  // return sendJson(path, "POST", input, AdminForumThreadQueuePageSchema, options);
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
): Promise<ActionResponse<AdminForumThreadQueuePage>> {
  const path = `/community/admin/forum/replies/${encodeURIComponent(replyId)}/moderate`;
  void input;
  return resolveMockRead(
    path,
    AdminForumThreadQueuePageSchema,
    options,
    MOCK_ADMIN_FORUM_THREAD_QUEUE_PAGE,
  );
  // return sendJson(path, "POST", input, AdminForumThreadQueuePageSchema, options);
}

// --- Content reports ---------------------------------------------------------

/** `GET /community/admin/content-reports` — the community report queue. */
export function listCommunityContentReports(
  filter: ListCommunityContentReportsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<CommunityContentReportQueuePage>> {
  const path = `/community/admin/content-reports${buildQueryString({ ...filter })}`;
  return resolveMockRead(
    path,
    CommunityContentReportQueuePageSchema,
    options,
    MOCK_COMMUNITY_CONTENT_REPORT_QUEUE_PAGE,
  );
  // return getJson(path, CommunityContentReportQueuePageSchema, options);
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
): Promise<ActionResponse<CommunityContentReportQueuePage>> {
  const path = `/community/admin/content-reports/${encodeURIComponent(reportId)}/decisions`;
  void input;
  return resolveMockRead(
    path,
    CommunityContentReportQueuePageSchema,
    options,
    MOCK_COMMUNITY_CONTENT_REPORT_QUEUE_PAGE,
  );
  // return sendJson(path, "POST", input, CommunityContentReportQueuePageSchema, options);
}

// --- Cofounder profiles ------------------------------------------------------

/** `GET /community/admin/cofounder-profiles` — the moderation queue. */
export function listAdminCofounderProfiles(
  filter: ListAdminCofounderProfilesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<AdminCofounderProfileQueuePage>> {
  const path = `/community/admin/cofounder-profiles${buildQueryString({ ...filter })}`;
  return resolveMockRead(
    path,
    AdminCofounderProfileQueuePageSchema,
    options,
    MOCK_ADMIN_COFOUNDER_QUEUE_PAGE,
  );
  // return getJson(path, AdminCofounderProfileQueuePageSchema, options);
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
): Promise<ActionResponse<AdminCofounderProfileQueuePage>> {
  const path = `/community/admin/cofounder-profiles/${encodeURIComponent(profileId)}/moderate`;
  void input;
  return resolveMockRead(
    path,
    AdminCofounderProfileQueuePageSchema,
    options,
    MOCK_ADMIN_COFOUNDER_QUEUE_PAGE,
  );
  // return sendJson(path, "POST", input, AdminCofounderProfileQueuePageSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;
