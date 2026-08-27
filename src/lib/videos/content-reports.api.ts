// TRANSPORT: client-query — the REPORTER's half of video content reporting:
// `POST /videos/:videoId/reports` and `GET /users/me/video-reports`.
//
// SEPARATE FILE FROM `admin-content-reports.api.ts`, the same split `admin-review.api.ts`
// makes against `api.ts`: everything here is any signed-in viewer's, and everything there
// refuses a non-staff caller with 403 and a named capability. Keeping them apart means
// nobody imports a moderation route into a viewer surface by autocomplete.
//
// WHAT A REPORTER IS TOLD, AND WHAT THEY ARE NOT. `MyVideoReportSchema` carries the status
// and nothing about who decided it or how many other people reported the same video. That
// is the backend's projection, not an omission here — naming the moderator makes a takedown
// personal, and exposing the count makes brigading measurable.

import { z } from "zod";

import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * Byte-identical to the backend's `video_content_report_reason` pgEnum.
 *
 * SNAKE_CASE, and not to be "corrected" to kebab. These are Postgres enum labels sent
 * verbatim; `spam-or-misleading` is a 422 from a `.strict()` schema, not an ignored value.
 */
export const VIDEO_REPORT_REASONS = [
  "sexual_content",
  "violence",
  "hateful_or_abusive",
  "harassment",
  "child_safety",
  "spam_or_misleading",
  "copyright",
  "other",
] as const;

export const VideoReportReasonSchema = z.enum(VIDEO_REPORT_REASONS);
export type VideoReportReason = z.infer<typeof VideoReportReasonSchema>;

/** What a reporter picks from, in the order the sheet shows them. */
export const VIDEO_REPORT_REASON_LABELS: Readonly<Record<VideoReportReason, string>> = {
  child_safety: "Child safety",
  sexual_content: "Sexual content",
  violence: "Violent or graphic",
  hateful_or_abusive: "Hateful or abusive",
  harassment: "Harassment or bullying",
  spam_or_misleading: "Spam or misleading",
  copyright: "Copyright",
  other: "Something else",
};

export const VideoReportStatusSchema = z.enum(["open", "actioned", "dismissed"]);
export type VideoReportStatus = z.infer<typeof VideoReportStatusSchema>;

const ReportAcceptedSchema = z.object({ reportId: z.string() }).strip();

/**
 * The moderation actions a reporter can be shown, byte-identical to the backend's
 * `video_moderation_action_kind` pgEnum.
 *
 * `redirected_to_source` is the outcome that did not exist until the moderation queue needed a
 * way to say "this is YouTube's to remove, not ours" without filing it as a rejection. It
 * closes the report and touches the video not at all.
 */
export const VIDEO_REPORT_OUTCOME_KINDS = [
  "content_hidden",
  "content_restored",
  "report_dismissed",
  "redirected_to_source",
] as const;

export const VideoReportOutcomeKindSchema = z.enum(VIDEO_REPORT_OUTCOME_KINDS);

export type VideoReportOutcomeKind = (typeof VIDEO_REPORT_OUTCOME_KINDS)[number];

export const MyVideoReportSchema = z
  .object({
    id: z.string(),
    videoId: z.string(),
    videoTitle: z.string().nullable(),
    reason: VideoReportReasonSchema,
    detailText: z.string().nullable(),
    status: VideoReportStatusSchema,
    createdAt: z.iso.datetime(),
    /**
     * `null` while the report is open.
     *
     * NULLABLE, NOT OPTIONAL — the backend's CHECK binds it to `status`, so its absence is a
     * real fact ("not decided yet") rather than a question nobody asked. That is the opposite
     * of `containsVideo` on a playlist row, and the difference is worth keeping straight.
     */
    resolvedAt: z.iso.datetime().nullable(),
    /**
     * The moderator's message to this reporter, or `null` when they wrote none.
     *
     * ⚠️ THIS IS NOT THE MODERATOR'S REASON NOTE. The backend keeps two separate columns on
     * purpose: `videoModerationAction.reasonNote` is the staff record, hash-chained into the
     * audit entry, and may name other reporters or the commercial motive behind a claim — it
     * is never selected into any response a reporter can read. This one is the published half,
     * written knowing a stranger will read it.
     *
     * A moderator who writes nothing sends a bare outcome. That is the honest default; a
     * canned sentence pretending to be a considered reply is worse than none.
     */
    resolutionNote: z.string().nullable(),
    /**
     * What was actually DONE, which `status` alone cannot say.
     *
     * ⚠️ `redirected_to_source` AND `report_dismissed` BOTH ARRIVE AS `status: "dismissed"`
     * — neither took a content action — but they mean opposite things to the person who filed
     * the report. One is "we looked, the claim does not hold". The other is "the claim may
     * well hold, and Qatoto is not who can act on it, because the bytes are on youtube.com".
     * Render the status alone and every redirect reads as a rejection.
     *
     * `null` while the report is open.
     */
    outcomeKind: VideoReportOutcomeKindSchema.nullable(),
  })
  .strip();
export type MyVideoReport = z.infer<typeof MyVideoReportSchema>;

export interface ReportVideoInput {
  readonly reason: VideoReportReason;
  readonly detailText?: string;
}

/**
 * `POST /videos/:videoId/reports` — 201, and a 201 IS NOT A VERDICT.
 *
 * The row exists; nothing has happened to the video. Copy on this surface must say "we will
 * review it" and never "removed" — there is no automatic hide on this platform, deliberately
 * (a video is a creator's livelihood), so a moderator decides every one of these by hand.
 *
 * 409 means you already reported this video; 422 means it is your own.
 */
export function reportVideo(
  videoId: string,
  input: ReportVideoInput,
  options?: RequestOptions,
): Promise<ActionResponse<{ reportId: string }>> {
  return sendJson(
    `/videos/${encodeURIComponent(videoId)}/reports`,
    "POST",
    input,
    ReportAcceptedSchema,
    options,
  );
}

/** `GET /users/me/video-reports` — the data behind `/report-history`. Unpaginated. */
export function listMyVideoReports(
  options?: RequestOptions,
): Promise<ActionResponse<readonly MyVideoReport[]>> {
  return getJson("/users/me/video-reports", z.array(MyVideoReportSchema), options);
}

/* -------------------------------------------------------------------------- */
/* Moderation notices — what staff DECIDED about YOUR videos                    */
/* -------------------------------------------------------------------------- */

export const VIDEO_MODERATION_ACTION_KINDS = [
  "content_hidden",
  "content_restored",
  "report_dismissed",
] as const;
export const VideoModerationActionKindSchema = z.enum(VIDEO_MODERATION_ACTION_KINDS);
export type VideoModerationActionKind = z.infer<typeof VideoModerationActionKindSchema>;

/**
 * ⚠️ WHAT THIS ROW DOES NOT CARRY, and none of it is an oversight: the reporter, any count of
 * reporters, the moderator, and the moderator's `reasonNote`. The queue hides reporter identity
 * from MODERATORS on the stated ground that one who can see it can be lobbied — surfacing it to the
 * person reported would be strictly worse. `reasonNote` is staff-facing free text inside a
 * hash-chained audit record, not creator-facing copy.
 *
 * `reason` is NULLABLE because an action can be taken without a report behind it.
 */
export const VideoModerationNoticeSchema = z
  .object({
    videoId: z.string(),
    videoTitle: z.string(),
    actionKind: VideoModerationActionKindSchema,
    reason: VideoReportReasonSchema.nullable(),
    decidedAt: z.string(),
  })
  .strip();
export type VideoModerationNotice = z.infer<typeof VideoModerationNoticeSchema>;

/** Written for the person the action was taken AGAINST, so it says what happened to THEM. */
export const VIDEO_MODERATION_ACTION_LABELS: Readonly<Record<VideoModerationActionKind, string>> = {
  content_hidden: "Removed from Qatoto",
  content_restored: "Restored",
  report_dismissed: "Report dismissed — no action",
};

/**
 * `GET /users/me/video-moderation` — decisions on the caller's own videos.
 *
 * DECIDED ACTIONS ONLY. A pending report is never shown, which is also how YouTube treats community
 * flags: you learn when something is acted on, not when somebody clicks report. Showing a live one
 * would tip somebody off mid-review and invite retaliation.
 */
export function listMyVideoModerationNotices(
  options?: RequestOptions,
): Promise<ActionResponse<VideoModerationNotice[]>> {
  return getJson("/users/me/video-moderation", VideoModerationNoticeSchema.array(), options);
}
