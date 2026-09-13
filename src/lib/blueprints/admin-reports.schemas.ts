// CONTRACT: the moderator's blueprint report queue.
//
// ⚠️ ONE TYPE, TWO TRANSPORTS. The queue row lives here rather than in `admin-reports.api.ts` so
// the reader-side and moderator-side transports can both name it without either importing the
// other — the split `content-reports.schemas.ts` makes for the same reason.

import { z } from "zod";

import { BLUEPRINT_REPORT_REASONS } from "@/lib/blueprints/reports.schemas";

export const BLUEPRINT_REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;
export type BlueprintReportStatus = (typeof BLUEPRINT_REPORT_STATUSES)[number];

/** The two arms a moderation verb can reach. ⚠️ NO `showcase` — see the verb list below. */
export type BlueprintReportArmFilter = "teardown" | "case_study";

/**
 * The three verbs.
 *
 * ⚠️ `quarantine` IS TEARDOWN-ONLY. `case_study_moderation_state_ck` has no such label, because a
 * case study has no files to withhold — the server answers 409 with a sentence saying so, rather
 * than 404, because the route exists and the body is well-formed. The card hides the control on
 * that arm so a moderator does not have to discover that by pressing it.
 */
export const BLUEPRINT_MODERATION_VERBS = ["flag", "quarantine", "restore"] as const;
export type BlueprintModerationVerb = (typeof BLUEPRINT_MODERATION_VERBS)[number];

export const BlueprintReportQueueItemSchema = z
  .object({
    reportId: z.string(),
    targetKind: z.enum(["teardown", "case_study"]),
    targetId: z.string(),
    targetSlug: z.string().nullable(),
    targetTitle: z.string(),
    /** So a moderator can see whether somebody has already acted on this row. */
    targetModerationState: z.string(),
    reason: z.enum(BLUEPRINT_REPORT_REASONS),
    detailText: z.string().nullable(),
    reporterHandle: z.string().nullable(),
    /** ⚠️ CONTEXT, NEVER A THRESHOLD. Nothing reads this as a trigger, and none is published. */
    openReportCount: z.number().int().nonnegative(),
    createdAt: z.string(),
  })
  .strip();
export type BlueprintReportQueueItem = z.infer<typeof BlueprintReportQueueItemSchema>;

export const BlueprintReportQueuePageSchema = z
  .object({
    items: BlueprintReportQueueItemSchema.array(),
    page: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
  })
  .strip();
export type BlueprintReportQueuePage = z.infer<typeof BlueprintReportQueuePageSchema>;

export const BlueprintModerationResultSchema = z
  .object({
    targetId: z.string(),
    targetKind: z.enum(["teardown", "case_study"]),
    moderationState: z.string(),
    decidedAt: z.string(),
  })
  .strip();
export type BlueprintModerationResult = z.infer<typeof BlueprintModerationResultSchema>;
