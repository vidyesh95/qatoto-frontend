// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE MODERATOR SIDE OF THE CASE-STUDY ARM: what the review queue reads and what a decision sends.
// Its author-side sibling is `case-study-authoring.schemas.ts`, and the public read is
// `CaseStudyBlueprintSchema` in `@/lib/blueprints/schemas`.
//
// ⚠️ A SEPARATE FILE ON PURPOSE. These rows carry a withheld company's REAL name, which only a
// `moderate_content` holder may see. Nothing under `src/components/home` or `src/components/studio`
// may import this file, and the check is
// `rg "case-study-moderation" src/components/home src/components/studio`, which must print nothing.
//
// `.strip()` ON WHAT COMES BACK, `.strict()` ON THE DECISION THAT GOES OUT, as everywhere on this
// surface.

import { z } from "zod";

import { CASE_STUDY_STATEMENT_IDS } from "@/lib/blueprints/case-study-authoring.schemas";
import {
  BLUEPRINT_DISCIPLINES,
  BlueprintMoneySchema,
  BlueprintOutcomeMetricSchema,
  BlueprintSourceSchema,
  CASE_STUDY_AUTHOR_RELATIONSHIPS,
} from "@/lib/blueprints/schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * A company as a moderator sees it: the name is REQUIRED, withheld or not.
 *
 * This is the "separate moderator read schema with a required name" `todo.md` asks for. The public
 * `CaseStudyEvidenceCompanySchema` keeps `name` nullable, because the public read writes `null` in
 * place of a withheld name.
 */
export const CaseStudyModerationCompanySchema = z
  .object({
    name: z.string(),
    isNameWithheld: z.boolean(),
    locationLabel: z.string(),
    yearLabel: z.string(),
  })
  .strip();
export type CaseStudyModerationCompany = z.infer<typeof CaseStudyModerationCompanySchema>;

/** One submission waiting in `/admin/case-studies`, with everything the writer sent. */
export const CaseStudyReviewItemSchema = z
  .object({
    submissionId: z.string(),
    submittedAt: IsoDateTimeSchema,
    /**
     * Who sent it. The backend refuses a moderator deciding their own (403).
     *
     * ⚠️ `handle` IS NULLABLE, and it was not. `user.handle` is nullable — nothing guarantees an
     * account has one — so the review queue can legitimately produce `null`, and a non-nullable
     * field here would have made the whole ROW refuse to parse: a moderator would see a card
     * vanish rather than a byline without a handle. `BlueprintAuthorSchema` and the showcase
     * queue's own author shape are both nullable for the same reason.
     */
    author: z.object({ displayName: z.string(), handle: z.string().nullable() }).strip(),
    authorRelationship: z.enum(CASE_STUDY_AUTHOR_RELATIONSHIPS),
    /** What the writer vouched for, so a moderator can hold the case study to it. */
    acceptedStatementIds: z.array(z.enum(CASE_STUDY_STATEMENT_IDS)),
    title: z.string(),
    oneLineAction: z.string(),
    discipline: z.enum(BLUEPRINT_DISCIPLINES),
    sector: z.string(),
    outcomeSummary: z.string().nullable(),
    summary: z.string(),
    problem: z.string(),
    context: z.string(),
    actionSteps: z.array(z.string()),
    pitfalls: z.array(z.string()),
    evidenceCompanies: z.array(CaseStudyModerationCompanySchema),
    timelineLabel: z.string().nullable(),
    capitalRaised: BlueprintMoneySchema.nullable(),
    outcomeMetrics: z.array(BlueprintOutcomeMetricSchema),
    sources: z.array(BlueprintSourceSchema),
    relatedLessonSlugs: z.array(z.string()),
    tags: z.array(z.string()),
  })
  .strip();
export type CaseStudyReviewItem = z.infer<typeof CaseStudyReviewItemSchema>;

/** `GET /blueprints/admin/case-studies/review-queue`, oldest first. */
export const CaseStudyReviewQueuePageSchema = cursorPageOf(CaseStudyReviewItemSchema);
export type CaseStudyReviewQueuePage = z.infer<typeof CaseStudyReviewQueuePageSchema>;

export const CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS = 2000;

const MODERATOR_NOTE_TOO_LONG_MESSAGE = `Keep the note under ${CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")} characters.`;

/**
 * `POST /blueprints/admin/case-studies/:submissionId/moderate` — the decision a moderator sends.
 *
 * ⚠️ `published` / `rejected`, THE MODERATION STATE NAMES, as the launch contract uses. The pathway
 * route says `publish` / `reject`; do not copy that spelling here.
 *
 * ⚠️ A SEND-BACK MUST SAY WHY. The note is the only thing the writer sees, and a rejection nobody can
 * act on comes back unchanged. Publishing may carry a note or none.
 */
export const CaseStudyModerationDecisionSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("published"),
      moderatorNote: z
        .string()
        .max(CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE)
        .nullable(),
    })
    .strict(),
  z
    .object({
      decision: z.literal("rejected"),
      moderatorNote: z
        .string()
        .min(1, "Sending back needs a note. It is the only thing the writer sees.")
        .max(CASE_STUDY_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE),
    })
    .strict(),
]);
export type CaseStudyModerationDecision = z.infer<typeof CaseStudyModerationDecisionSchema>;

/** What a decision answers with. A published case study has its public address; a rejected one none. */
export const CaseStudyModerationResultSchema = z
  .object({
    submissionId: z.string(),
    moderationState: z.enum(["published", "rejected"]),
    publicSlug: z.string().nullable(),
    decidedAt: IsoDateTimeSchema,
  })
  .strip()
  .superRefine((result, context) => {
    if (result.moderationState === "published" && result.publicSlug === null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A published case study has a public address; without one it is not published.",
      });
    }
    if (result.moderationState === "rejected" && result.publicSlug !== null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A case study that was sent back has no public address.",
      });
    }
  });
export type CaseStudyModerationResult = z.infer<typeof CaseStudyModerationResultSchema>;
