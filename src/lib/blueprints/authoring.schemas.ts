// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE WRITE SIDE of the teardown surface: what a publisher submits, what they attest to, and what
// comes back. Its read counterpart is `@/lib/blueprints/schemas`, and this file reuses that one's
// value objects rather than restating them — a second definition of a material or a provenance
// block is a second thing to keep in step, and they would drift on the first backend change.
//
// ⚠️ `.strict()` HERE, NOT `.strip()`, AND THE DIFFERENCE IS NOT STYLE. Read shapes strip so that a
// backend minor release adding a field is a no-op. A WRITE shape must do the opposite:
// `src/lib/products/schemas.ts:98-107` records what stripping cost on a write path — a stripped
// field silently destroyed sellers' declared lead times on every edit, and nothing failed. An
// unknown key on the way out is a bug in this repo, and it should be loud.

import { z } from "zod";

import {
  BLUEPRINT_MODERATION_STATES,
  BlueprintVideoSchema,
  PUBLISHABLE_TEARDOWN_SUBJECT_KIND,
  TeardownMaterialSchema,
  TeardownProvenanceSchema,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  TEARDOWN_SUBJECT_KINDS,
  type TeardownSubjectKind,
} from "@/lib/blueprints/schemas";
import { createHttpsOrSiteRelativeUrlSchema } from "@/lib/blueprints/url-source.schemas";

/**
 * THE FOUR CLAUSES A PUBLISHER ACCEPTS, and the reason the whole surface can call itself
 * clean-room.
 *
 * ⚠️ THEY LIVE IN THE CONTRACT, NOT IN JSX. A fifth clause is then one entry here rather than an
 * edit to a form component that some other form has already copied. The wizard renders this tuple.
 *
 * ⚠️ EACH IS CHECKED SEPARATELY AND NONE IS REMEMBERED. One "I agree to the terms" box is a box
 * people tick without reading; four specific statements are four things somebody has to actually
 * consider, and re-consider on the next submission, because the next submission is about a
 * different unit. `attestationAcceptedAt` records that they did.
 *
 * ⚠️ THE COPY IS FOR A NON-LAWYER. `docs/PRODUCT.md` names the founder as a persona who is
 * explicitly not expected to know this vocabulary, and an attestation somebody cannot read is an
 * attestation they cannot honestly give.
 */
export const TEARDOWN_ATTESTATION_CLAUSES = [
  {
    id: "lawful_acquisition",
    label: "I obtained this unit lawfully",
    detail:
      "I bought it, was given it, or was supplied it. I did not take it from an employer, a client or anyone else who did not mean me to have it.",
  },
  {
    id: "own_measurement",
    label: "Everything here is my own measurement",
    detail:
      "The dimensions, materials and photographs come from the unit in front of me, from taking it apart and looking at it. I have not copied a manufacturer's drawing.",
  },
  {
    id: "no_confidential_material",
    label: "I used nothing confidential",
    detail:
      "I have not used internal documents, files shared with me under a non-disclosure agreement, or anything a supplier gave me on the understanding that I would keep it private.",
  },
  {
    id: "independent_discovery",
    label: "I worked this out independently",
    detail:
      "Anyone with the same unit and the same tools could reach the same conclusions. I am not relying on knowledge I only have because of a job or a contract.",
  },
] as const;

export type TeardownAttestationClauseId = (typeof TEARDOWN_ATTESTATION_CLAUSES)[number]["id"];

export const TEARDOWN_ATTESTATION_CLAUSE_IDS = TEARDOWN_ATTESTATION_CLAUSES.map(
  (clause) => clause.id,
) as readonly TeardownAttestationClauseId[];

/**
 * One file a submission points at.
 *
 * ⚠️ A URL, NOT AN UPLOAD, AND THAT IS THE HONEST SHAPE TODAY. There is no upload route for a
 * blueprint and no Cloudinary folder behind one, so a file picker here would be a control that
 * cannot do its job. `create-studio-page.tsx` already takes a pasted link for video for the same
 * reason. When an upload route exists this field keeps its name and gains a sibling.
 */
export const TeardownSubmissionFileSchema = z
  .object({
    kind: z.enum(TEARDOWN_MANUFACTURING_FILE_KINDS),
    title: z.string().min(1, "Give the file a name a stranger would recognise."),
    url: createHttpsOrSiteRelativeUrlSchema(2048),
  })
  .strict();
export type TeardownSubmissionFile = z.infer<typeof TeardownSubmissionFileSchema>;

/**
 * One part a publisher lists.
 *
 * ⚠️ NO GEOMETRY FIELD. The read contract's `IndividualTeardownPart` carries a `.glb` per part,
 * which is the shape an upload takes — and there is no upload. A submission therefore cannot
 * produce a modelled teardown, and the wizard says so rather than offering a field that goes
 * nowhere. This is the one place the write contract is deliberately NARROWER than the read one.
 */
export const TeardownSubmissionPartSchema = z
  .object({
    label: z.string().min(1, "Name the part."),
    material: z.string().min(1, "Say what it is made of, even roughly."),
  })
  .strict();
export type TeardownSubmissionPart = z.infer<typeof TeardownSubmissionPartSchema>;

/**
 * THE WHOLE PAYLOAD, as it would go over the wire.
 *
 * `subjectKind` IS PINNED to the one publishable literal, matching `TeardownBlueprintSchema`. The
 * wizard shows `proposed_design` as a disabled option with its reason, and the contract makes it
 * unconstructible — a refusal that is explained AND enforced, rather than one or the other.
 *
 * `provenance` and `materials` are the READ schemas, reused whole. That is what carries the
 * three-arm licence/authorisation refinement into the write path for free: a wizard cannot submit a
 * manufacturer-authorised survey that also names a licence, because the same `superRefine` that
 * guards the fixtures guards this.
 */
export const TeardownSubmissionDraftSchema = z
  .object({
    subjectKind: z.literal(PUBLISHABLE_TEARDOWN_SUBJECT_KIND),
    title: z.string().min(8, "A title short enough to skim and specific enough to search."),
    summary: z.string().min(40, "One paragraph: what it is, and what you found."),
    provenance: TeardownProvenanceSchema,
    materials: z.array(TeardownMaterialSchema),
    parts: z.array(TeardownSubmissionPartSchema),
    documents: z.array(TeardownSubmissionFileSchema),
    manufacturingFiles: z.array(TeardownSubmissionFileSchema),
    /** `null` when nobody filmed it, which is the ordinary case. */
    walkthroughVideo: BlueprintVideoSchema.nullable(),
    tags: z.array(z.string()),
    /**
     * Every clause id, and the contract checks that rather than trusting a boolean.
     *
     * ⚠️ AN ARRAY OF IDS, NOT `hasAttested: true`. A boolean records that a form was satisfied; this
     * records WHICH statements were accepted, which is the thing that would matter if anybody ever
     * had to show what a publisher agreed to. It also means adding a clause invalidates old
     * consent automatically instead of silently inheriting it.
     */
    acceptedAttestationClauseIds: z.array(z.enum(TEARDOWN_ATTESTATION_CLAUSE_IDS)),
  })
  .strict()
  .superRefine((draft, context) => {
    /**
     * ⚠️ AN EMPTY SURVEY DATE HAS TO BE REFUSED HERE, because the READ schema cannot refuse it.
     * `TeardownProvenanceSchema.surveyedAt` is `z.string()` — the house convention for an ISO value
     * (`IsoDateTimeSchema`) — which accepts `""`. That is harmless for fixtures, every one of which
     * has a date, and wrong for a form, where "" is exactly what a publisher who skipped the field
     * produces. Without this the submission is accepted and the page renders an empty date.
     */
    if (draft.provenance.surveyedAt.trim() === "") {
      context.addIssue({
        code: "custom",
        path: ["provenance", "surveyedAt"],
        message:
          "Say when you surveyed the unit. A survey with no date cannot be checked against anything.",
      });
    }

    const acceptedClauseIds = new Set(draft.acceptedAttestationClauseIds);
    const missingClauses = TEARDOWN_ATTESTATION_CLAUSES.filter(
      (clause) => !acceptedClauseIds.has(clause.id),
    );

    if (missingClauses.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["acceptedAttestationClauseIds"],
        message: `Every statement has to be accepted before this can be submitted. Still unchecked: ${missingClauses
          .map((clause) => clause.label)
          .join("; ")}.`,
      });
    }
  });
export type TeardownSubmissionDraft = z.infer<typeof TeardownSubmissionDraftSchema>;

/**
 * WHAT COMES BACK FROM A SUBMISSION — a receipt, not a row.
 *
 * ⚠️ IT CARRIES NO SLUG AND NO PUBLIC URL, deliberately. Neither exists: the row is
 * `pending_review`, it is absent from every index, and its public address is a thing a moderator
 * creates by publishing it. A receipt that handed back a link would be inviting the author to check
 * a page that answers 404, which reads as their work having been lost.
 *
 * `moderationState` IS A LITERAL, not the enum. A submission has exactly one possible outcome
 * state, and typing it as the whole enum would invite a renderer to branch on six values that this
 * call can never return.
 */
export const TeardownSubmissionReceiptSchema = z
  .object({
    submissionId: z.string(),
    moderationState: z.literal("pending_review"),
    /** ISO 8601, server-stamped. When the submission was accepted, not when it was decided. */
    receivedAt: z.string(),
  })
  .strict();
export type TeardownSubmissionReceipt = z.infer<typeof TeardownSubmissionReceiptSchema>;

/**
 * One row in `/studio/blueprints` — the author's own view of something they submitted.
 *
 * ⚠️ `moderatorNote` IS NON-NULL EXACTLY WHEN THE STATE IS `rejected`, and the refinement below says
 * so. A rejection with no reason is the single most useless thing this surface could show somebody:
 * they cannot fix what they are not told about, and they will resubmit the same thing.
 *
 * `publicSlug` is non-null only once a moderator has published it — before that there is no public
 * address, for the reason the receipt gives.
 */
export const TeardownSubmissionSchema = z
  .object({
    submissionId: z.string(),
    title: z.string(),
    subjectProductName: z.string(),
    moderationState: z.enum(BLUEPRINT_MODERATION_STATES),
    submittedAt: z.string(),
    publicSlug: z.string().nullable(),
    moderatorNote: z.string().nullable(),
  })
  .strict()
  .superRefine((submission, context) => {
    if (submission.moderationState === "rejected" && submission.moderatorNote === null) {
      context.addIssue({
        code: "custom",
        path: ["moderatorNote"],
        message: "A rejected submission must carry the reason it was rejected.",
      });
    }
    if (submission.moderationState === "published" && submission.publicSlug === null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A published submission has a public address; without one it is not published.",
      });
    }
  });
export type TeardownSubmission = z.infer<typeof TeardownSubmissionSchema>;

/**
 * Why `proposed_design` is refused, in the words the wizard shows beside the disabled option.
 *
 * ⚠️ IT IS SHOWN, NOT HIDDEN. A missing option teaches nobody anything and invites the same person
 * to look for it again next week; a disabled one with a sentence beside it answers the question
 * once. `todo.md` records the same call.
 */
export const TEARDOWN_SUBJECT_KIND_REFUSALS: Record<TeardownSubjectKind, string | null> = {
  existing_physical_product: null,
  proposed_design:
    "A teardown is a survey of something that exists. There is no unit to measure, nothing to buy, and no composition to analyse, so none of the questions below would have an answer. Post a design you have not built yet as a pitch instead.",
};

/** Guard the wizard uses before it lets a subject kind through. */
export function isPublishableTeardownSubjectKind(
  subjectKind: TeardownSubjectKind,
): subjectKind is typeof PUBLISHABLE_TEARDOWN_SUBJECT_KIND {
  return subjectKind === PUBLISHABLE_TEARDOWN_SUBJECT_KIND;
}

export { TEARDOWN_SUBJECT_KINDS };
