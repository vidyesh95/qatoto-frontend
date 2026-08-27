// TRANSPORT: props-only — the contract for reporting a person's profile. No network.
//
// `snake_case` ENUM VALUES ON THE WIRE, and they must byte-match the backend's pgEnum labels. These
// are data, not identifiers — "correcting" one to kebab-case is a 422 from a `.strict()` schema.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * Why somebody is reporting a profile.
 *
 * PROFILE-SCOPED, AND NOT THE VIDEO EIGHT. Upholding one of these hides a person's description and
 * links and nothing else, so every reason names something that lever can actually address. There is
 * deliberately no `child_safety` or `copyright` here: answering either by hiding a description would
 * look like the platform had acted when it had not.
 */
export const USER_REPORT_REASONS = [
  "impersonation",
  "abusive_profile_text",
  "misleading_links",
  "spam",
  "other",
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number];

export const USER_REPORT_REASON_LABELS: Record<UserReportReason, string> = {
  impersonation: "Pretending to be someone else",
  abusive_profile_text: "Abusive or hateful description",
  misleading_links: "Misleading or harmful links",
  spam: "Spam",
  other: "Something else",
};

export const CreatedUserReportSchema = z.object({ reportId: z.string() }).strip();

export type CreatedUserReport = z.infer<typeof CreatedUserReportSchema>;

export const RestoredProfileTextSchema = z.object({ reportedUserId: z.string() }).strip();

export interface CreateUserReportInput {
  readonly reason: UserReportReason;
  readonly detailText?: string;
}

export const USER_REPORT_STATUSES = ["open", "actioned", "dismissed"] as const;

export type UserReportStatus = (typeof USER_REPORT_STATUSES)[number];

/** One row of the moderator queue. */
export const UserReportQueueItemSchema = z
  .object({
    reportId: z.string(),
    reason: z.enum(USER_REPORT_REASONS),
    detailText: z.string().nullable(),
    status: z.enum(USER_REPORT_STATUSES),
    createdAt: IsoDateTimeSchema,
    subject: z
      .object({
        userId: z.string(),
        handle: z.string().nullable(),
        name: z.string(),
        bio: z.string().nullable(),
        profileModerationState: z.enum(["visible", "hidden_by_moderator"]),
      })
      .strip(),
    /**
     * CONTEXT, NEVER A THRESHOLD. Nothing hides a profile because this number crossed a line —
     * every hide names a human. Rendering it as a score would make brigading measurable and then
     * effective.
     */
    openReportCount: z.number().int(),
  })
  .strip();

export type UserReportQueueItem = z.infer<typeof UserReportQueueItemSchema>;

export interface ListUserReportsFilter {
  readonly status?: UserReportStatus;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface DecideUserReportInput {
  readonly decision: "actioned" | "dismissed";
  readonly note?: string;
}

export interface RestoreProfileTextInput {
  readonly reportedUserId: string;
  readonly reasonNote: string;
}
