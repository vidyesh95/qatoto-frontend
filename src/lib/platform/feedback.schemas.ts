// TRANSPORT: props-only — the pure contract for the feedback routes. No network, no React.
//
// ⚠️ COPY RULE THAT TRAVELS WITH THESE TYPES, AND IT IS THE STRICTEST ONE IN THE APP.
// Feedback ends in no verdict, no reply and no obligation. Nothing rendered from this data may
// say a reply is coming, that a note was prioritised, or that anything will change because of
// it. `send-feedback-sheet.tsx` states the ceiling: thanks, and the truth that a person reads
// it. A status moving is not a promise that one did.
//
// IT WAS ALL ONE FILE UNTIL THE READS LANDED. The vocabulary lived in `feedback.api.ts` when a
// write was the only thing that existed; three consumers now share it — the member api, the
// staff api and the components — and a component importing a transport module to reach a label
// map is how a staff route ends up in a member bundle by autocomplete.

import { z } from "zod";

/**
 * Byte-identical to the backend's `platform_feedback_category` pgEnum.
 *
 * SNAKE_CASE-SAFE SINGLE TOKENS, and not to be "corrected" to kebab. These are Postgres enum
 * labels sent verbatim; a re-spelled value is a 422 from a `.strict()` schema, not an ignored
 * one.
 */
export const PLATFORM_FEEDBACK_CATEGORIES = ["bug", "idea", "other"] as const;

export const PlatformFeedbackCategorySchema = z.enum(PLATFORM_FEEDBACK_CATEGORIES);
export type PlatformFeedbackCategory = z.infer<typeof PlatformFeedbackCategorySchema>;

/** Byte-identical to `platform_feedback_status`. Every row is born `new`. */
export const PLATFORM_FEEDBACK_STATUSES = ["new", "reviewed", "closed"] as const;

export const PlatformFeedbackStatusSchema = z.enum(PLATFORM_FEEDBACK_STATUSES);
export type PlatformFeedbackStatus = z.infer<typeof PlatformFeedbackStatusSchema>;

/** What somebody picks from, in the order the composer shows them. */
export const PLATFORM_FEEDBACK_CATEGORY_LABELS: Readonly<Record<PlatformFeedbackCategory, string>> =
  {
    bug: "Something is broken",
    idea: "An idea or improvement",
    other: "Something else",
  };

/**
 * What each status means TO THE PERSON WHO SENT THE NOTE, which is not what it means to staff.
 *
 * ⚠️ `new` READS AS "Sent", NOT "Not read yet". The column records whether a staff member has
 * moved a triage flag, and nobody moving a flag is not evidence that nobody read it. "Sent" is
 * the part this person knows for certain, and it is the only claim the row can support.
 *
 * ⚠️ AND `reviewed` IS NOT "Fixed". Somebody marked it read. No copy built on this may imply a
 * change was made, scheduled or agreed to.
 */
export const PLATFORM_FEEDBACK_STATUS_LABELS: Readonly<Record<PlatformFeedbackStatus, string>> = {
  new: "Sent",
  reviewed: "Read by the team",
  closed: "Closed",
};

/** The staff-facing reading of the same column, where the queue word IS the useful one. */
export const PLATFORM_FEEDBACK_STATUS_QUEUE_LABELS: Readonly<
  Record<PlatformFeedbackStatus, string>
> = {
  new: "Not triaged",
  reviewed: "Reviewed",
  closed: "Closed",
};

/**
 * Mirrors `platform_feedback_message_ck`, so the textarea stops where the column does and the
 * server never has to refuse a note for its length.
 *
 * COURTESY, NOT VALIDATION. The backend re-checks it and the CHECK constraint is the authority.
 */
export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export const FeedbackReceivedSchema = z.object({ feedbackId: z.string() }).strip();
export type FeedbackReceived = z.infer<typeof FeedbackReceivedSchema>;

/**
 * One note as the person who wrote it reads it back.
 *
 * NO `userAgent` AND NO AUTHOR, because the backend's projection carries neither. The browser
 * string was read from a request header, so echoing it would describe the browser they are
 * holding; the author is whoever is asking.
 */
export const OwnPlatformFeedbackSchema = z
  .object({
    feedbackId: z.string(),
    category: PlatformFeedbackCategorySchema,
    message: z.string(),
    /** The route they were on when they wrote it. Text, never a link: it may be a dead URL. */
    pagePath: z.string(),
    status: PlatformFeedbackStatusSchema,
    createdAt: z.iso.datetime(),
  })
  .strip();
export type OwnPlatformFeedback = z.infer<typeof OwnPlatformFeedbackSchema>;

/**
 * The queue row adds the person, which the submitter's own projection has no reason to carry.
 *
 * ⚠️ `author` IS NULLABLE AND THAT IS AN ORDINARY ROW, NOT A BROKEN ONE. `platform_feedback`
 * `.user_id` is `ON DELETE SET NULL` and the anonymization manifest nulls it, so an erased
 * account leaves its note behind unattributed. Render the absence; never invent a name.
 */
export const StaffPlatformFeedbackSchema = OwnPlatformFeedbackSchema.extend({
  userAgent: z.string().nullable(),
  author: z
    .object({ userId: z.string(), handle: z.string().nullable(), name: z.string() })
    .strip()
    .nullable(),
}).strip();
export type StaffPlatformFeedback = z.infer<typeof StaffPlatformFeedbackSchema>;

export interface SendPlatformFeedbackInput {
  readonly category: PlatformFeedbackCategory;
  readonly message: string;
  /** The route the person was looking at, read from `usePathname()` at submit time. */
  readonly pagePath: string;
}

export interface ListPlatformFeedbackFilter {
  readonly status?: PlatformFeedbackStatus;
  readonly cursor?: string;
}

/**
 * The two states triage can move a note to.
 *
 * `new` IS ABSENT ON PURPOSE, mirroring the backend enum: it is where every row starts, so
 * nothing needs to set it, and offering it would let a staff member walk a note backwards under
 * somebody who has already been shown "Read by the team".
 */
export const PLATFORM_FEEDBACK_DECISIONS = ["reviewed", "closed"] as const;
export type PlatformFeedbackDecision = (typeof PLATFORM_FEEDBACK_DECISIONS)[number];
