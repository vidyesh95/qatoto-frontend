// TRANSPORT: client-query — reporting a profile, and the moderator queue that answers it.

import { z } from "zod";

import {
  getCursorSiblingList,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatedUserReportSchema,
  MyProfileReportSchema,
  RestoredProfileTextSchema,
  UserReportQueueItemSchema,
  type CreateUserReportInput,
  type CreatedUserReport,
  type DecideUserReportInput,
  type ListUserReportsFilter,
  type MyProfileReport,
  type RestoreProfileTextInput,
  type UserReportQueueItem,
} from "@/lib/users/user-reports.schemas";

/**
 * Reports somebody's profile — `POST /users/:userId/reports`.
 *
 * **A 201 IS NOT A VERDICT.** It means a row exists, not that anyone has looked at it. The backend's
 * own message says "Report received. Our team will review it." and no surface may improve on that
 * into "Reported" or "we've removed it" — that would be a promise this system has not made.
 *
 * ONE REPORT PER PERSON PER SUBJECT, enforced by a partial unique index, so a second attempt is a
 * 409 rather than a silent duplicate. That refusal is honest and worth showing.
 *
 * REPORTING YOURSELF IS A 422, not a 403 — the caller can plainly see their own profile, so nothing
 * is being concealed by refusing.
 */
export function reportUser(
  reportedUserId: string,
  input: CreateUserReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedUserReport>> {
  const path = `/users/${encodeURIComponent(reportedUserId)}/reports`;
  return sendJson(path, "POST", input, CreatedUserReportSchema, options);
}

/** The moderator queue — `GET /users/admin/reports`, keyset, oldest first. */
export function listUserReports(
  filter: ListUserReportsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: UserReportQueueItem[]; nextCursor: string | null }>> {
  const query = new URLSearchParams();
  if (filter.status !== undefined) query.set("status", filter.status);
  if (filter.limit !== undefined) query.set("limit", String(filter.limit));
  if (filter.cursor !== undefined) query.set("cursor", filter.cursor);
  const queryString = query.toString();
  const path = `/users/admin/reports${queryString === "" ? "" : `?${queryString}`}`;
  return getCursorSiblingList(path, UserReportQueueItemSchema, options);
}

/**
 * Upholds or dismisses one report — `POST /users/admin/reports/:reportId/decisions`.
 *
 * UPHOLDING HIDES THE PROFILE TEXT AND NOTHING ELSE — not the name, not the avatar, not a video.
 * DISMISSING RESTORES NOTHING: nothing hides a profile except a moderator deciding to, so a
 * dismissal has nothing to undo, and quietly un-hiding text a different moderator hid would overturn
 * their decision as a side effect.
 *
 * Requires an `Idempotency-Key`: this appends a hash-chained audit entry, and a retry without one
 * would make the chain claim two decisions were taken.
 */
export function decideUserReport(
  reportId: string,
  input: DecideUserReportInput,
  options?: RequestOptions,
): Promise<ActionResponse<CreatedUserReport>> {
  const path = `/users/admin/reports/${encodeURIComponent(reportId)}/decisions`;
  return sendJson(path, "POST", input, CreatedUserReportSchema, options);
}

/**
 * Puts hidden profile text back — `POST /users/admin/profile-text/restore`.
 *
 * `reasonNote` IS REQUIRED where a decision's note is optional. This is the one action that
 * overturns a colleague's decision, so it does not get to be silent.
 */
export function restoreUserProfileText(
  input: RestoreProfileTextInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ reportedUserId: string }>> {
  return sendJson(
    "/users/admin/profile-text/restore",
    "POST",
    input,
    RestoredProfileTextSchema,
    options,
  );
}

/**
 * The caller's own profile reports — `GET /users/me/profile-reports`.
 *
 * IT EXISTS BECAUSE A REPORT THAT VANISHES IS INDISTINGUISHABLE FROM ONE NOBODY READ, which is the
 * sentence `/report-history` was built around for videos. Profile reporting shipped without it, so
 * a reporter got a 201 and then silence.
 *
 * The projection is narrow by contract: no moderator identity, no resolution note, no count of who
 * else complained. See `MyProfileReportSchema`.
 */
export function listMyProfileReports(
  options?: RequestOptions,
): Promise<ActionResponse<MyProfileReport[]>> {
  return getJson("/users/me/profile-reports", z.array(MyProfileReportSchema), options);
}
