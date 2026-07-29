// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. Every read here except the streak leaderboard is `requireAuth` and
// member-scoped, so a server component MUST forward the session cookie through
// `@/lib/server-http`'s `callerRequestOptions()` or it will read as a stranger.

import {
  buildQueryString,
  getCursorPaginated,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  DailyLogDetailSchema,
  DailyLogFeedPageSchema,
  DailyLogStreakStandingSchema,
  DailyLogViewSchema,
  SubmitDailyLogReceiptSchema,
  type CreateDailyLogInput,
  type DailyLogDetail,
  type DailyLogFeedPage,
  type DailyLogStreakStanding,
  type DailyLogView,
  type ListDailyLogFeedFilter,
  type ListProjectDailyLogsFilter,
  type SubmitDailyLogReceipt,
  type UpdateDailyLogInput,
} from "@/lib/rnd/daily-logs.schemas";

/**
 * One project's logs, newest first.
 *
 * `requireAuth` plus membership at `contributor`, and a non-member gets **404, not
 * 403** — the backend answers "no access or no such thing" identically so a stranger
 * cannot probe which projects exist. Lift the result through
 * `toMemberScopedListViewState` only when the project's existence is already public
 * knowledge from a successful detail read.
 *
 * `limit` is the only accepted param. There is no page, no cursor and no `?status=`.
 */
export function listProjectDailyLogs(
  projectSlug: string,
  filter: ListProjectDailyLogsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogView[]>> {
  return getJson(
    `/research-projects/${projectSlug}/daily-logs${buildQueryString({ ...filter })}`,
    DailyLogViewSchema.array(),
    options,
  );
}

/**
 * The cross-project feed behind `/build-log` — the caller's OWN projects only.
 *
 * Signed out is a `401`, and the page must render the explainer, the legend and the
 * public leaderboard with an EMPTY feed plus a sign-in prompt. Never a fabricated one:
 * daily logs are private to a project's members and a public feed would contradict
 * that outright (backend Appendix B2).
 */
export function listDailyLogFeed(
  filter: ListDailyLogFeedFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogFeedPage>> {
  return getCursorPaginated(
    `/daily-logs${buildQueryString({ ...filter })}`,
    DailyLogFeedPageSchema,
    options,
  );
}

/**
 * The public streak leaderboard — the one daily-log read that is not member-scoped.
 *
 * Capped at 20 rows server-side and unpaginated; `project_stats.dailyLogStreakDays` is
 * job-computed and stored, which is why every row carries `statsComputedAt` for the
 * client to render as an "as of".
 */
export function listDailyLogStreakLeaderboard(
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogStreakStanding[]>> {
  return getJson("/daily-logs/streak-leaderboard", DailyLogStreakStandingSchema.array(), options);
}

// --- Authoring ----------------------------------------------------------------

/** One log with its transcript, chips, extracted claims and evidence. Member-scoped. */
export function getDailyLog(
  projectSlug: string,
  logId: string,
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogDetail>> {
  return getJson(
    `/research-projects/${projectSlug}/daily-logs/${logId}`,
    DailyLogDetailSchema,
    options,
  );
}

/**
 * Create a DRAFT.
 *
 * `requireIdentifiedUser`, not merely `requireAuth`: a daily log is the input to the
 * entire equity ledger, and an anonymous session is still a real session.
 */
export function createDailyLog(
  projectSlug: string,
  input: CreateDailyLogInput,
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogView>> {
  return sendJson(
    `/research-projects/${projectSlug}/daily-logs`,
    "POST",
    input,
    DailyLogViewSchema,
    options,
  );
}

/** Edit a draft. Sending `youtubeUrl: null` detaches the video; omitting it keeps it. */
export function updateDailyLog(
  projectSlug: string,
  logId: string,
  input: UpdateDailyLogInput,
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogView>> {
  return sendJson(
    `/research-projects/${projectSlug}/daily-logs/${logId}`,
    "PATCH",
    input,
    DailyLogViewSchema,
    options,
  );
}

export function deleteDailyLog(
  projectSlug: string,
  logId: string,
  options?: RequestOptions,
): Promise<ActionResponse<DailyLogView>> {
  return sendJson(
    `/research-projects/${projectSlug}/daily-logs/${logId}`,
    "DELETE",
    undefined,
    DailyLogViewSchema,
    options,
  );
}

/**
 * Submit a draft. **`202` AND A RECEIPT, NEVER A VERDICT.**
 *
 * The submit freezes the log, moves the streak and enqueues the analysis in ONE
 * transaction — so `dailyLogStreakDays` on the receipt is real while `analysisStatus` is
 * merely `queued`. Nothing about what the log is worth exists yet.
 *
 * `idempotencyKey` is the one client-supplied string this endpoint takes, and it is an
 * opaque dedup token rather than a value the server owns: a retried submit on a flaky
 * connection must return the FIRST receipt, not file a second log.
 */
export function submitDailyLog(
  projectSlug: string,
  logId: string,
  input: { readonly idempotencyKey: string },
  options?: RequestOptions,
): Promise<ActionResponse<SubmitDailyLogReceipt>> {
  return sendJson(
    `/research-projects/${projectSlug}/daily-logs/${logId}/submit`,
    "POST",
    input,
    SubmitDailyLogReceiptSchema,
    options,
  );
}
