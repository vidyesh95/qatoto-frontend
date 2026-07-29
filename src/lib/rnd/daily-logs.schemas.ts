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

// --- Authoring: the detail read and the submit receipt -------------------------

export const EXTRACTED_CLAIM_KINDS = ["time", "cash", "milestone", "blocker"] as const;
export const ExtractedClaimKindSchema = z.enum(EXTRACTED_CLAIM_KINDS);
export type ExtractedClaimKind = z.infer<typeof ExtractedClaimKindSchema>;

/**
 * `GET …/daily-logs/:logId` — one log with everything the analysis produced.
 *
 * WIDER THAN THE FEED ROW ON PURPOSE. Chips, transcript segments, extracted claims and
 * evidence links are four fan-outs, which is right for one log and catastrophic for a
 * feed — that is why the list read carries none of them (§18's dark table).
 *
 * `extractedMinutes` IS WHAT THE MEMBER SAID. It is not grounded, it pays nobody, and it
 * is not equity; §9's `groundedMinutes` is the number that prices anything. Any UI
 * labelling this "effort" has published a claim as a finding.
 *
 * The three `analysis*` provenance fields ship because an AI-produced row whose model is
 * hidden reads as a platform ruling.
 */
export const DailyLogDetailSchema = DailyLogViewSchema.extend({
  transcriptSegments: z
    .object({
      sequenceNumber: z.number(),
      startOffsetSeconds: z.number(),
      endOffsetSeconds: z.number().nullable(),
      speakerLabel: z.string().nullable(),
      segmentText: z.string(),
    })
    .strip()
    .array(),
  aiSummaryChips: z
    .object({
      kind: AiSummaryChipKindSchema,
      label: z.string(),
      confidenceBps: z.number().nullable(),
    })
    .strip()
    .array(),
  extractedClaims: z
    .object({
      claimKind: ExtractedClaimKindSchema,
      extractedMinutes: z.number().nullable(),
      extractedCashInCents: z.string().nullable(),
      claimSummary: z.string(),
      confidenceBps: z.number().nullable(),
    })
    .strip()
    .array(),
  evidenceLinks: z
    .object({
      provider: z.string(),
      sourceKind: z.string(),
      externalUrl: z.string(),
      externalHost: z.string(),
    })
    .strip()
    .array(),
  analysisModelName: z.string().nullable(),
  analysisModelVersion: z.string().nullable(),
  analysisPromptVersion: z.string().nullable(),
}).strip();
export type DailyLogDetail = z.infer<typeof DailyLogDetailSchema>;

/**
 * The `202` receipt from `POST …/daily-logs/:logId/submit`.
 *
 * **A RECEIPT, NEVER A VERDICT.** `effortVerificationStatus` is always `not_run` here and
 * `analysisStatus` is `queued` (or `skipped_unconfigured` where no model key is set) — the
 * analysis has not happened at the moment this returns. `dailyLogStreakDays` is the one
 * real number on it, because the streak moves inside the submit transaction.
 */
export const SubmitDailyLogReceiptSchema = z
  .object({
    logId: z.string(),
    submittedAt: z.string(),
    analysisStatus: DailyLogAnalysisStatusSchema,
    effortVerificationStatus: EffortVerificationStatusSchema,
    dailyLogStreakDays: z.number(),
  })
  .strip();
export type SubmitDailyLogReceipt = z.infer<typeof SubmitDailyLogReceiptSchema>;

/**
 * `POST …/daily-logs` — create a DRAFT.
 *
 * `logDate` is the day CLAIMED, date-only, and stays distinct from `submittedAt`: a
 * backfilled log is a real thing and collapsing the two would erase it.
 *
 * `youtubeUrl` accepts a bare 11-character id or a schemeless link, matching the
 * backend's own parser. The hostname allowlist check happens server-side, so this field
 * is deliberately NOT `z.url()` on either side — validating it as a URL here would reject
 * inputs the server accepts.
 */
export interface CreateDailyLogInput {
  readonly logDate: string;
  readonly narrative?: string;
  readonly youtubeUrl?: string;
}

/**
 * `PATCH …/daily-logs/:logId`.
 *
 * **`youtubeUrl: null` DETACHES THE VIDEO; OMITTING IT LEAVES THE VIDEO ALONE.** The two
 * must stay distinguishable or a narrative-only edit silently drops a member's video —
 * which is why this is not `Partial<CreateDailyLogInput>`.
 */
export interface UpdateDailyLogInput {
  readonly logDate?: string;
  readonly narrative?: string;
  readonly youtubeUrl?: string | null;
}
