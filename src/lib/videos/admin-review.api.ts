// TRANSPORT: server-fetch + client-query — the STAFF anime moderation queue,
// `GET/POST /videos/admin/review*`.
//
// SEPARATE FILE FROM `api.ts` BECAUSE THE AUDIENCE IS DIFFERENT. Everything in `api.ts` is
// owner-scoped and refuses with 404; these three refuse a non-staff caller with **403** and a
// named capability. Keeping them apart means nobody imports a moderation route into a creator
// surface by autocomplete.
//
// THE REFUSAL IS LOAD-BEARING AND MUST NOT BE HIDDEN. A moderator who has lost their capability
// needs to see that, not an empty queue that reads as "nothing to review".

import { z } from "zod";

import {
  buildQueryString,
  getPaginated,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  ContentReviewStatusSchema,
  PaginationMetaSchema,
  VideoPublishStatusSchema,
  type ContentReviewStatus,
} from "@/lib/videos/schemas";

/** One row of the queue. Narrower than `PublicVideo` — it is a triage list, not an editor. */
export const ReviewQueueRowSchema = z
  .object({
    videoId: z.string(),
    title: z.string(),
    /**
     * The creator's own description.
     *
     * THE MOST IMPORTANT FIELD ON THIS SCREEN after the video itself. A moderator's job is to
     * compare what is claimed against what is shown; this projection did not carry it, so
     * approvals were being made on a title and a thumbnail alone.
     */
    description: z.string().nullable(),
    thumbnailUrl: z.string().nullable(),
    youtubeVideoId: z.string().nullable(),
    creatorId: z.string(),
    creatorName: z.string(),
    creatorHandle: z.string().nullable(),
    reviewStatus: ContentReviewStatusSchema,
    rejectionReason: z.string().nullable(),
    seriesTitle: z.string().nullable(),
    seriesGenreTags: z.array(z.string()).nullable(),
    seasonLabel: z.string().nullable(),
    episodeNumber: z.number().nullable(),
    episodeTitle: z.string().nullable(),
    premiereDate: z.string().nullable(),
    // What the creator DECLARED about the episode — the schedule, the dub and the age rating are
    // the things a reviewer is being asked to sign off on.
    releaseScheduleDay: z.string().nullable(),
    releaseScheduleTime: z.string().nullable(),
    audioMode: z.enum(["subbed", "dubbed"]).nullable(),
    audioLanguage: z.string().nullable(),
    ageRating: z.string().nullable(),
    submittedAt: z.string(),
  })
  .strip();
export type ReviewQueueRow = z.infer<typeof ReviewQueueRowSchema>;

/**
 * What a decision changed.
 *
 * `publishStatus` is NOT always `published` after an approval: an episode with a premiere date
 * in the future comes back `scheduled`. The UI must read this rather than assume.
 */
export const ReviewDecisionSchema = z
  .object({
    videoId: z.string(),
    reviewStatus: ContentReviewStatusSchema,
    publishStatus: VideoPublishStatusSchema,
    publishedAt: z.string().nullable(),
    releasedAt: z.string().nullable(),
    rejectionReason: z.string().nullable(),
  })
  .strip();
export type ReviewDecision = z.infer<typeof ReviewDecisionSchema>;

export interface ListReviewQueueFilter {
  /** Defaults to `pending` server-side. */
  readonly status?: ContentReviewStatus;
  readonly page?: number;
  readonly limit?: number;
}

/** `GET /videos/admin/review` — oldest first, so the longest wait is triaged first. */
export function listReviewQueue(
  filter: ListReviewQueueFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ReviewQueueRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/videos/admin/review${buildQueryString({ ...filter })}`,
    ReviewQueueRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/** `POST /videos/admin/review/:videoId/approve` — NO BODY. */
export function approveReviewedVideo(
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<ReviewDecision>> {
  return sendJson(
    `/videos/admin/review/${encodeURIComponent(videoId)}/approve`,
    "POST",
    undefined,
    ReviewDecisionSchema,
    options,
  );
}

/**
 * `POST /videos/admin/review/:videoId/reject` — the reason is REQUIRED, 1..2000 characters.
 *
 * It is not optional anywhere in the flow: the creator sees it on their My Videos row, and a
 * rejection with no reason is an unactionable dead end for them.
 */
export function rejectReviewedVideo(
  videoId: string,
  reason: string,
  options?: RequestOptions,
): Promise<ActionResponse<ReviewDecision>> {
  return sendJson(
    `/videos/admin/review/${encodeURIComponent(videoId)}/reject`,
    "POST",
    { reason },
    ReviewDecisionSchema,
    options,
  );
}
