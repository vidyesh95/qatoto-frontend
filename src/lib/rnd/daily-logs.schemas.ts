import { z } from "zod";
import { ProjectStageSchema } from "@/lib/rnd/shared.schemas";

// `GET /research-projects/:projectSlug/daily-logs` (member-scoped, bare array),
// `GET /daily-logs` (member-scoped, keyset) and `GET /daily-logs/streak-leaderboard`
// (public, bare array).
//
// Mirrors `daily-logs.service.ts`'s `DailyLogView`, `DailyLogFeedRow`,
// `DailyLogFeedPage` and `DailyLogStreakStanding`. Values read off the backend's
// `src/db/schema.ts` pgEnums, never off a doc.

// --- Enum tuples --------------------------------------------------------------

export const DAILY_LOG_STATUSES = ["draft", "submitted"] as const;
export const DailyLogStatusSchema = z.enum(DAILY_LOG_STATUSES);
export type DailyLogStatus = z.infer<typeof DailyLogStatusSchema>;

/**
 * `none` is a first-class value, not a missing one: a member with no video that day
 * still logs, and a physical-work claim has no video by definition.
 */
export const DAILY_LOG_VIDEO_SOURCES = ["none", "youtube", "hosted"] as const;
export const DailyLogVideoSourceSchema = z.enum(DAILY_LOG_VIDEO_SOURCES);
export type DailyLogVideoSource = z.infer<typeof DailyLogVideoSourceSchema>;

/**
 * The analysis JOB's lifecycle — never a verdict about the work.
 *
 * `skipped_unconfigured` is distinct from `failed` on purpose: "no model key in this
 * environment" is an operator fact, and rendering it as a failure sends a member
 * chasing a problem with their log that does not exist.
 */
export const DAILY_LOG_ANALYSIS_STATUSES = [
  "not_requested",
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped_unconfigured",
] as const;
export const DailyLogAnalysisStatusSchema = z.enum(DAILY_LOG_ANALYSIS_STATUSES);
export type DailyLogAnalysisStatus = z.infer<typeof DailyLogAnalysisStatusSchema>;

/**
 * The verification verdict, and the reason the frontend's old `isEffortVerified:
 * boolean` had to go: a boolean collapses `not_run` (nothing was ever asked) and
 * `unverified` (it was asked and the answer was no) into the same falsy render, and
 * hides `queued` / `running` entirely so a member reads "in progress" as "rejected".
 *
 * The backend still ships `isEffortVerified` beside it, derived as
 * `status === "verified"`. Prefer the enum; the boolean is kept only for a badge that
 * genuinely needs two states.
 */
export const EFFORT_VERIFICATION_STATUSES = [
  "not_run",
  "queued",
  "running",
  "verified",
  "flagged_for_review",
  "unverified",
] as const;
export const EffortVerificationStatusSchema = z.enum(EFFORT_VERIFICATION_STATUSES);
export type EffortVerificationStatus = z.infer<typeof EffortVerificationStatusSchema>;

export const AI_SUMMARY_CHIP_KINDS = ["blocker", "progress", "velocity", "suggestion"] as const;
export const AiSummaryChipKindSchema = z.enum(AI_SUMMARY_CHIP_KINDS);
export type AiSummaryChipKind = z.infer<typeof AiSummaryChipKindSchema>;

// --- Row shapes ---------------------------------------------------------------

/**
 * One daily log as every list read returns it.
 *
 * THERE ARE NO `aiSummaryChips` HERE, and that is the wire, not an oversight — chips
 * live on `GET …/daily-logs/:logId` alone, so rendering them in a feed would be one
 * extra request per card. See docs/R_AND_D_STRUCTURE.md §18.
 *
 * `logDate` is date-only (the day the work happened); `submittedAt` is the instant the
 * member froze it and is null while the log is still a draft. They are two different
 * facts and the old single `date` field conflated them.
 */
export const DailyLogViewSchema = z
  .object({
    id: z.string(),
    authorMemberId: z.string(),
    authorName: z.string(),
    authorAvatarImageUrl: z.string().nullable(),
    logDate: z.string(),
    submittedAt: z.string().nullable(),
    narrative: z.string().nullable(),
    status: DailyLogStatusSchema,
    videoSource: DailyLogVideoSourceSchema,
    videoEmbedUrl: z.string().nullable(),
    videoThumbnailUrl: z.string().nullable(),
    analysisStatus: DailyLogAnalysisStatusSchema,
    analysisFailureReason: z.string().nullable(),
    analysisCompletedAt: z.string().nullable(),
    effortVerificationStatus: EffortVerificationStatusSchema,
    isEffortVerified: z.boolean(),
    createdAt: z.string(),
  })
  .strip();
export type DailyLogView = z.infer<typeof DailyLogViewSchema>;

/**
 * A feed row carries its own project, so a cross-project card never fabricates a
 * project chip and never needs a second lookup table keyed by project id.
 */
export const DailyLogFeedRowSchema = DailyLogViewSchema.extend({
  projectSlug: z.string(),
  projectName: z.string(),
  projectCoverImageUrl: z.string().nullable(),
  projectStage: ProjectStageSchema,
}).strip();
export type DailyLogFeedRow = z.infer<typeof DailyLogFeedRowSchema>;

/**
 * The keyset page. The array is named `logs`, not `items` — workshop chat keys the
 * same envelope `messages`, so there is no shared item key to generalize over and no
 * generic cursor envelope schema in this repo on purpose.
 *
 * `nextCursor` is `logDate_submittedAtMs_id`, opaque. Echo it back verbatim; anything
 * constructed client-side is a `422 CURSOR_MALFORMED`.
 */
export const DailyLogFeedPageSchema = z
  .object({
    logs: DailyLogFeedRowSchema.array(),
    nextCursor: z.string().nullable(),
  })
  .strip();
export type DailyLogFeedPage = z.infer<typeof DailyLogFeedPageSchema>;

/**
 * One row of the public streak leaderboard.
 *
 * `statsComputedAt` MUST be rendered as an "as of". A streak decays at midnight in the
 * project's own time zone with no write happening, so a leaderboard presented as live
 * numbers is lying about how fresh it is. It is nullable, and null renders as an
 * absence rather than as "just now".
 */
export const DailyLogStreakStandingSchema = z
  .object({
    projectSlug: z.string(),
    projectName: z.string(),
    projectCoverImageUrl: z.string().nullable(),
    projectStage: ProjectStageSchema,
    dailyLogStreakDays: z.number(),
    lastDailyLogDate: z.string().nullable(),
    projectTimeZone: z.string(),
    statsComputedAt: z.string().nullable(),
  })
  .strip();
export type DailyLogStreakStanding = z.infer<typeof DailyLogStreakStandingSchema>;

// --- Request-side filters -----------------------------------------------------

/** `GET /research-projects/:projectSlug/daily-logs` accepts `limit` and NOTHING else. */
export interface ListProjectDailyLogsFilter {
  readonly limit?: number;
}

/**
 * `GET /daily-logs`.
 *
 * There is no `projectIds` and there never will be: the WHERE clause is
 * `projectId IN (caller's active memberships)`, derived in SQL from `project_member`.
 * `projectSlug` only NARROWS that set — a slug the caller does not belong to yields an
 * empty page, not a 404. The query schema is `.strict()`, so an invented key is a 422.
 */
export interface ListDailyLogFeedFilter {
  readonly projectSlug?: string;
  readonly chipKind?: AiSummaryChipKind;
  readonly cursor?: string;
  readonly limit?: number;
}
