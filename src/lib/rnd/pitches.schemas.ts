import { z } from "zod";

// The §12 pitch contract. Mirrors `pitches.service.ts`'s `PitchView`,
// `pitch-outcomes.service.ts`'s `PitchOutcomeView` and
// `pitch-moderation.service.ts`'s `PitchReviewQueueEntry`.
//
// ⚠️ THERE IS NO AMOUNT AND NO EQUITY PERCENTAGE ON A PITCH, and no schema below may grow
// one. Qatoto lists a pitch and links OUT to wherever the money happens — a licensed third
// party the founder chose. A page that carried "raising $X for Y%" would be a general
// solicitation, which is the thing this whole surface is shaped to avoid, and the backend
// stores no such column to render.
//
// The only money on this surface is on a `PitchFundingOutcome`, and it is a SELF-REPORTED
// RECORD of something that happened somewhere else. See the note on that schema.

export const PITCH_STATUSES = ["draft", "pending", "published", "rejected", "closed"] as const;
export const PitchStatusSchema = z.enum(PITCH_STATUSES);
export type PitchStatus = z.infer<typeof PitchStatusSchema>;

/** For badges and `<option>` lists. Kept beside the tuple so the two cannot drift. */
export const PITCH_STATUS_LABELS: Record<PitchStatus, string> = {
  draft: "Draft",
  pending: "In review",
  published: "Live",
  rejected: "Not published",
  closed: "Closed",
};

/**
 * One pitch.
 *
 * `externalFundingUrl` and `externalContactUrl` are NORMALIZED by the server — what its URL
 * parser stored, not what the founder typed. Render them with
 * `rel="noopener noreferrer nofollow ugc"` and show the destination host, because these
 * point off Qatoto to a place nobody here has vetted.
 *
 * `rejectionReason` is non-null only on a `rejected` pitch and is shown to its founder. It
 * is the moderator's own sentence and the reason a rejection is actionable rather than a
 * wall.
 */
export const PitchSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    projectId: z.string(),
    projectSlug: z.string(),
    projectName: z.string(),
    title: z.string(),
    summary: z.string(),
    pitchVideoId: z.string().nullable(),
    externalFundingUrl: z.string().nullable(),
    externalContactUrl: z.string().nullable(),
    status: PitchStatusSchema,
    rejectionReason: z.string().nullable(),
    publishedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type Pitch = z.infer<typeof PitchSchema>;

/**
 * One reported funding outcome.
 *
 * ⚠️ `isConfirmed` IS THE FIELD EVERY RENDERER MUST BRANCH ON. An unconfirmed row is ONE
 * PARTY'S CLAIM about money that moved somewhere Qatoto cannot see — showing it as a
 * completed raise would let a founder announce a round through Qatoto's voice with nobody
 * agreeing. Confirmed means the counterparty countersigned, and it still means "these two
 * people say so", never "Qatoto verified this".
 *
 * No copy beside any of these numbers may say collected, paid, held, escrowed or processed.
 * Qatoto operates no money rail.
 *
 * `amountInCents` IS A DECIMAL STRING over a `bigint` column. Parse with `BigInt` and format
 * through `@/lib/rnd/format`; `Number(…)` loses precision past 2^53.
 */
export const PitchFundingOutcomeSchema = z
  .object({
    id: z.string(),
    pitchId: z.string(),
    amountInCents: z.string(),
    currencyCode: z.string(),
    fundedOnDate: z.string(),
    funderUserId: z.string().nullable(),
    funderNameText: z.string(),
    note: z.string().nullable(),
    recordedByUserId: z.string(),
    recordedByName: z.string(),
    confirmedByUserId: z.string().nullable(),
    confirmedAt: z.string().nullable(),
    isConfirmed: z.boolean(),
    /**
     * False when the record names no Qatoto account for the funder — there is nobody who
     * could countersign, so it will never reach the public page. Render the difference: a
     * founder who is not told this just watches a record they entered never appear.
     */
    isConfirmable: z.boolean(),
    createdAt: z.string(),
  })
  .strip();
export type PitchFundingOutcome = z.infer<typeof PitchFundingOutcomeSchema>;

/**
 * `GET /pitches/:pitchSlug` — the public detail read.
 *
 * The outcome list it carries is SESSION-SCOPED SERVER-SIDE: a stranger receives confirmed
 * records only, and the founder additionally sees their own unconfirmed ones. There is no
 * client parameter for this and there must not be one.
 */
export const PitchDetailSchema = z
  .object({
    pitch: PitchSchema,
    outcomes: PitchFundingOutcomeSchema.array(),
  })
  .strip();
export type PitchDetail = z.infer<typeof PitchDetailSchema>;

/**
 * One row of the moderation queue.
 *
 * The two URLs are on this row deliberately: checking where a pitch actually sends people is
 * the single most important thing a moderator does, and requiring them to open the pitch to
 * see it would be the step that gets skipped.
 */
export const PitchReviewQueueEntrySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    projectSlug: z.string(),
    projectName: z.string(),
    pitchVideoId: z.string().nullable(),
    externalFundingUrl: z.string().nullable(),
    externalContactUrl: z.string().nullable(),
    submittedByUserId: z.string(),
    submittedByName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();
export type PitchReviewQueueEntry = z.infer<typeof PitchReviewQueueEntrySchema>;

/** `DELETE /pitches/:pitchId`. */
export const DeletedPitchSchema = z.object({ deletedPitchId: z.string() }).strip();

export interface ListMyPitchesFilter {
  readonly status?: PitchStatus;
  readonly page?: number;
  readonly limit?: number;
}

export interface ListPublicPitchesFilter {
  readonly projectSlug?: string;
  readonly page?: number;
  readonly limit?: number;
}
