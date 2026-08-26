// TRANSPORT: props-only — the contract for the creator's own numbers. No network.
//
// THESE ARE QATOTO-SIDE COUNTS. A YouTube-hosted video's own view count lives in the creator's
// YouTube Studio; everything here counts watching that happened on Qatoto, through the watch
// beacon. The two will never agree, and any surface rendering these must say so — a creator who
// is not told will assume one of them is broken.
//
// EVERY NULL BELOW IS AN ABSENCE WITH A CAUSE, NEVER A ZERO. That is the single rule this file
// exists to carry across the boundary, and the reason none of these fields is `.default(0)`.
import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * `GET /users/me/creator-summary` — lifetime totals.
 *
 * ZERO IS HONEST HERE, unlike the watch-time read. These are counts of the creator's own
 * artefacts: a missing stats row means they have never published, never been subscribed to and
 * never been watched, which is something the server actually knows. `/users/me/watch-time`
 * returns null instead because it describes a VIEWER's behaviour, which may simply never have
 * been observed.
 *
 * `publishedVideoCount` is COUNTED live server-side rather than read from the counter cache —
 * that cache is not decremented when a published video is deleted and has no reconciler.
 */
export const CreatorSummarySchema = z
  .object({
    subscriberCount: z.number().int(),
    publishedVideoCount: z.number().int(),
    totalViewCount: z.number().int(),
  })
  .strip();
export type CreatorSummary = z.infer<typeof CreatorSummarySchema>;

/** One row of `GET /users/me/video-analytics`. */
export const VideoAnalyticsRowSchema = z
  .object({
    videoId: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    publishStatus: z.enum(["draft", "scheduled", "published"]),
    /** Null for a draft — it has never been published, so it has no publication instant. */
    publishedAt: IsoDateTimeSchema.nullable(),
    viewCount: z.number().int(),
    likeCount: z.number().int(),
    commentCount: z.number().int(),
    shareCount: z.number().int(),
    saveCount: z.number().int(),
    totalWatchedSeconds: z.number().int(),
    /**
     * NULL BEFORE THE NIGHTLY JOB HAS RUN, AND NULL AGAIN AFTER 90 DAYS. Both are computed from
     * raw view sessions, which are pruned on a retention clock — so a null here can mean "not
     * measured yet" on a new video and "no longer measurable" on an old one. Rendering either as
     * 0 would claim nobody watched a video whose evidence was merely aged out.
     */
    uniqueViewerCount: z.number().int().nullable(),
    countedViewsFirst48Hours: z.number().int().nullable(),
    /**
     * Mean completion in basis points (10000 = 100%), or null when nothing has been sampled.
     *
     * An unmeasured completion rate is not a rate of zero. The server returns null rather than
     * dividing by a zero sample, and the UI must render that as an absence.
     */
    meanCompletionBasisPoints: z.number().int().nullable(),
  })
  .strip();
export type VideoAnalyticsRow = z.infer<typeof VideoAnalyticsRowSchema>;
