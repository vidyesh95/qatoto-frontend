// TRANSPORT: client-query — the STAFF half of video content reporting,
// `GET/POST /videos/admin/content-reports*` and `POST /videos/admin/content/restore`.
//
// SEPARATE FILE FROM `content-reports.api.ts` BECAUSE THE AUDIENCE IS DIFFERENT — the same
// split `admin-review.api.ts` states against `api.ts`. Everything there is any signed-in
// viewer's; everything here refuses a non-staff caller with 403 and a named capability.
//
// THE REFUSAL IS LOAD-BEARING AND MUST NOT BE HIDDEN. A moderator who has lost
// `moderate_content` needs to see that, not an empty queue that reads as "nothing to
// review". `community-moderation-page.tsx` makes `restricted` a view state for this reason
// and lets it win over `loading`.
//
// KEYSET, NOT OFFSET, so this uses `getJson` over a page schema rather than `getPaginated`.
// A queue is worked from the front while new reports arrive at the back; an offset silently
// repeats and skips rows as the list shifts under the reader. `admin-community.api.ts` is
// the precedent for this shape.

import { z } from "zod";

import {
  buildQueryString,
  getEnvelope,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  VideoReportReasonSchema,
  VideoReportStatusSchema,
  type VideoReportStatus,
} from "@/lib/videos/content-reports.api";

export const VideoReportQueueRowSchema = z
  .object({
    id: z.string(),
    videoId: z.string(),
    videoTitle: z.string().nullable(),
    creatorId: z.string().nullable(),
    creatorName: z.string().nullable(),
    reason: VideoReportReasonSchema,
    detailText: z.string().nullable(),
    reporterUserId: z.string().nullable(),
    status: VideoReportStatusSchema,
    resolvedAt: z.iso.datetime().nullable(),
    resolutionNote: z.string().nullable(),
    createdAt: z.iso.datetime(),
    /**
     * How many OPEN reports this video carries.
     *
     * CONTEXT, NOT A THRESHOLD. Nothing on this platform acts on this number — there is no
     * automatic hide, by design. It is here because "this is the fourth person to flag it"
     * changes how a reviewer reads a borderline case, and a moderator with no sense of
     * volume decides each report as though it were the only one.
     */
    openReportCount: z.number(),
    moderationVisibilityState: z.enum(["visible", "hidden_by_moderator"]),
  })
  .strip();
export type VideoReportQueueRow = z.infer<typeof VideoReportQueueRowSchema>;

/**
 * `data` plus a `nextCursor` SIBLING, which is why this parses the whole envelope.
 *
 * `getPaginated` would read `data` and `pagination` and discard everything else — and there
 * is no `pagination` here at all, because a keyset read has no honest `total`.
 */
const VideoReportQueuePageSchema = z
  .object({
    data: z.array(VideoReportQueueRowSchema),
    nextCursor: z.string().nullable(),
  })
  .strip();

export interface ListVideoReportsFilter {
  readonly status?: VideoReportStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

export function listVideoReportQueue(
  filter: ListVideoReportsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ data: VideoReportQueueRow[]; nextCursor: string | null }>> {
  return getEnvelope(
    `/videos/admin/content-reports${buildQueryString({ ...filter })}`,
    VideoReportQueuePageSchema,
    options,
  );
}

const DecisionAcceptedSchema = z.object({ reportId: z.string() }).strip();
const RestoreAcceptedSchema = z.object({ videoId: z.string() }).strip();

/**
 * `POST /videos/admin/content-reports/:reportId/decisions`.
 *
 * ANSWERS ONE ROW, NOT THE QUEUE — and `admin-community.api.ts` carries a bug note about
 * exactly this: its four writes each parsed a whole page, none of them returns one, so every
 * decision failed its parse and a moderator saw an error on a write that had already
 * succeeded. Re-reading the queue afterwards is the HOOK's job.
 *
 * `actioned` hides the video. `dismissed` closes every open report on it and changes
 * nothing else — it does NOT restore a hidden video, because nothing here hides one without
 * a moderator deciding to, and silently reversing another moderator's decision as a side
 * effect of closing an unrelated report is not something a dismissal should do. Use
 * `restoreVideo` for that.
 */
export function decideVideoReport(
  reportId: string,
  input: { readonly decision: "actioned" | "dismissed"; readonly note?: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ reportId: string }>> {
  return sendJson(
    `/videos/admin/content-reports/${encodeURIComponent(reportId)}/decisions`,
    "POST",
    input,
    DecisionAcceptedSchema,
    options,
  );
}

/**
 * `POST /videos/admin/content/restore`.
 *
 * ITS OWN ROUTE because a video can be hidden with NO OPEN REPORT LEFT TO DISMISS: hidden,
 * reports actioned and closed, later reconsidered. Without this it stays hidden forever.
 *
 * `reasonNote` is REQUIRED, unlike a decision note — an un-hide with no stated reason is not
 * a record, and the hide it reverses named a human and gave one.
 */
export function restoreVideo(
  input: { readonly videoId: string; readonly reasonNote: string },
  options?: RequestOptions,
): Promise<ActionResponse<{ videoId: string }>> {
  return sendJson("/videos/admin/content/restore", "POST", input, RestoreAcceptedSchema, options);
}
