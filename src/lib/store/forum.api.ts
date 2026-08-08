// TRANSPORT: server-fetch — the two reads are public and awaited by server components. The write is
// session-scoped and called from a `"use client"` composer.
//
// MOCK-BACKED: every call resolves a fixture. No forum endpoint exists — A25 records that
// `business-forum` is "not commerce and has no backend anywhere". To wire one, swap `resolveMockRead`
// for `getJson` (or the write for `sendJson`) and drop the fixture argument for `options`.

import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedForumThreadSchema,
  ForumThreadDetailSchema,
  ForumThreadListPageSchema,
  type CreatedForumThread,
  type CreateForumThreadInput,
  type ForumThreadDetail,
  type ForumThreadListPage,
  type ListForumThreadsFilter,
} from "@/lib/store/forum.schemas";
import { resolveMockDetail, resolveMockRead } from "@/lib/store/mock-transport";
import {
  MOCK_CREATED_FORUM_THREAD,
  MOCK_FORUM_THREAD_DETAILS_BY_SLUG,
  MOCK_FORUM_THREAD_LIST_PAGE,
} from "@/mocks/store/forum-mocks";

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
  return resolveMockRead(path, ForumThreadListPageSchema, options, MOCK_FORUM_THREAD_LIST_PAGE);
  // return getJson(path, ForumThreadListPageSchema, options);
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
  return resolveMockDetail(
    path,
    ForumThreadDetailSchema,
    options,
    MOCK_FORUM_THREAD_DETAILS_BY_SLUG,
    threadSlug,
  );
  // return getJson(path, ForumThreadDetailSchema, options);
}

// --- Writes ------------------------------------------------------------------

/**
 * `POST /commerce/forum/threads` — queues a thread for MODERATION.
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
  const path = "/commerce/forum/threads";
  void input;
  // A FIXED row rather than an echo. An echoed slug would let the success screen offer a link to a
  // thread nobody can read — which, for a thread in moderation, is every reader including its author.
  return resolveMockRead(path, CreatedForumThreadSchema, options, MOCK_CREATED_FORUM_THREAD);
  // return sendJson(path, "POST", input, CreatedForumThreadSchema, options);
}

// Imported for the wiring lines above; referenced so they survive while every call is mock-backed.
void getJson;
void sendJson;
