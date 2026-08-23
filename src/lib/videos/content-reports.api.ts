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
