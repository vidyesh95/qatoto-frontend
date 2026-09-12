// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE WRITE SIDE of the teardown surface: what a publisher submits, what they attest to, and what
// comes back. Its read counterpart is `@/lib/blueprints/schemas`, and this file reuses that one's
// value objects rather than restating them — a second definition of a material or a provenance
// block is a second thing to keep in step, and they would drift on the first backend change.
//
// ⚠️ `.strict()` ON THE DRAFT, `.strip()` ON THE RESPONSES, AND THE DIFFERENCE IS NOT STYLE.
// `src/lib/products/schemas.ts:98-107` records what stripping cost on a write path — a stripped
// field silently destroyed sellers' declared lead times on every edit, and nothing failed. So an
// unknown key on the way OUT is a bug in this repo and should be loud.
//
// An unknown key on the way IN is the opposite: a backend minor release. The receipt and the
// submission row below therefore strip, exactly as both sibling arms do
// (`case-study-authoring.schemas.ts`, `showcase-authoring.schemas.ts`). This file used to strict
// them too, which would have turned an ACCEPTED submission into a parse failure telling the author
// their work was lost, the first time anybody added a field to the 202 body.

import { z } from "zod";

import { buildWellTypedInputsPredicate } from "@/lib/blueprints/refinement-inputs";
import {
  BLUEPRINT_DOCUMENT_KINDS,
  BLUEPRINT_SUBMISSION_DISPLAY_STATES,
  BlueprintVideoSchema,
  PUBLISHABLE_TEARDOWN_SUBJECT_KIND,
  TeardownCompositionElementSchema,
  TeardownMaterialSchema,
  TeardownProvenanceSchema,
  TeardownSurveyMethodSchema,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  TEARDOWN_SUBJECT_KINDS,
  type TeardownSubjectKind,
} from "@/lib/blueprints/schemas";
import { createExternalHttpsUrlSchema } from "@/lib/blueprints/url-source.schemas";

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

const TEARDOWN_FILE_TITLE_MESSAGE = "Give the file a name a stranger would recognise.";

/**
 * The address of a file a submission points at.
 *
 * ⚠️ EXTERNAL AND 512, WHERE THE READ SIDE IS SITE-RELATIVE-OR-HTTPS AND 2048. Both narrowings are
 * the server's, and mirroring them here is the difference between a refusal the publisher can act
 * on and a 422 in words this wizard never wrote:
 *
 *   - The site-relative branch exists for addresses this platform minted. A link a publisher pastes
 *     is external by definition, and the write gate refuses `/…` outright — without this, the form
 *     would happily accept `/enclosure.step` and the server would not.
 *   - 512 is the server's cap, and the same one `e157171` put on case-study sources for the same
 *     reason. A link longer than that is a tracking-parameter-laden mess rather than a citation.
 */
const TeardownSubmissionFileUrlSchema = createExternalHttpsUrlSchema(512);

/**
 * One file a submission points at — in TWO shapes, because there are two kinds of file.
 *
 * ⚠️ THIS WAS ONE SCHEMA CARRYING THE MANUFACTURING ENUM, AND BOTH ARRAYS USED IT. That is why the
 * media step defaulted every new document row to `step`: a fab label on a reader's document. The
 * read contract has said these are two things for longer than the write contract existed —
 * `TeardownManufacturingFileSchema`'s doc in `schemas.ts` closes with "Two arrays, two enums, two
 * renderers" — and the published detail page parses `documents[].kind` against the four-value enum,
 * so a `step` there is a row the page refuses to render.
 *
 * ⚠️ AND THE SERVER CANNOT CATCH IT. Its write gate accepts both vocabularies in both arrays on
 * purpose, so that a fix here needs no backend release and a submission sent before that fix still
 * files each file by the label its author chose. **This is the only gate that exists for it.**
 *
 * ⚠️ A URL, NOT AN UPLOAD, AND THAT IS THE HONEST SHAPE TODAY. There is no upload route for a
 * blueprint and no Cloudinary folder behind one, so a file picker here would be a control that
 * cannot do its job. `create-studio-page.tsx` already takes a pasted link for video for the same
 * reason. When an upload route exists this field keeps its name and gains a sibling.
 */
export const TeardownSubmissionDocumentSchema = z
  .object({
    kind: z.enum(BLUEPRINT_DOCUMENT_KINDS),
    title: z.string().min(1, TEARDOWN_FILE_TITLE_MESSAGE),
    url: TeardownSubmissionFileUrlSchema,
  })
  .strict();
export type TeardownSubmissionDocument = z.infer<typeof TeardownSubmissionDocumentSchema>;

export const TeardownSubmissionManufacturingFileSchema = z
  .object({
    kind: z.enum(TEARDOWN_MANUFACTURING_FILE_KINDS),
    title: z.string().min(1, TEARDOWN_FILE_TITLE_MESSAGE),
    url: TeardownSubmissionFileUrlSchema,
  })
  .strict();
export type TeardownSubmissionManufacturingFile = z.infer<
  typeof TeardownSubmissionManufacturingFileSchema
>;

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
 * A material, as a publisher may send one: the read shape MINUS the two fields they do not own.
 *
 * ⚠️ DERIVED, NOT RESTATED. Nine of eleven fields still resolve to one definition, so a backend
 * change to a designation source or a material class still lands on both arms — which is the reuse
 * this file's header defends. What is restated is exactly the delta the write contract declares.
 *
 * ⚠️ `id` IS OMITTED BECAUSE IT IS NOT THE EDITOR'S TO MINT. `teardown_material.id` is a global
 * primary key with no default, so the wizard's `mat-1` would collide with the second author ever to
 * submit two materials. The server mints one when a moderator publishes.
 *
 * ⚠️ THE TRAILING `.strict()` IS LOAD-BEARING, and it is the `products/schemas.ts:98-107` incident
 * in miniature. `.omit()` keeps the base's strip mode, so without it a leftover `id` would be
 * dropped SILENTLY on the way out — a stripped field on a write path, which is the exact failure
 * that destroyed sellers' declared lead times. With it, a leftover is a parse failure the wizard
 * shows.
 *
 * ⚠️ `partId` IS `z.null()`, NOT `.nullable()`. A submission has no assembly, so there is no part
 * for a material to attach to and the server's two-hop foreign key could never resolve one. A
 * literal says that in the type; a nullable would say it in a comment and discover it in a
 * transaction. Linking a material to a modelled part must widen this deliberately.
 */
export const TeardownSubmissionMaterialSchema = TeardownMaterialSchema.omit({ id: true })
  .extend({
    partId: z.null(),
    /**
     * Capped even though the wizard sends none today: element rows arrive with a file from an
     * analyser, and the cap should meet that path here rather than as a 422.
     */
    elements: z
      .array(TeardownCompositionElementSchema)
      .max(8, "Eight elements is the most a composition can carry."),
  })
  .strict();

/**
 * Provenance, as a publisher may send it: the read shape with the server's four bounds applied.
 *
 * ⚠️ `.safeExtend`, NOT `.extend`. All four keys are overwrites, and Zod 4 throws on an overwrite
 * of a refined object ("Use .safeExtend() instead"). `.safeExtend` keeps the three-arm
 * licence/authorisation `superRefine` — which is the whole reason the write path reuses this shape,
 * and why a manufacturer-authorised survey that also names a licence is unconstructible here.
 */
const TeardownSubmissionProvenanceSchema = TeardownProvenanceSchema.safeExtend({
  subjectProductName: z
    .string()
    .min(1, "Name the unit you took apart.")
    .max(200, "That is longer than a product name; put the detail in your summary."),
  surveyMethods: z
    .array(TeardownSurveyMethodSchema)
    .min(1, "Say how you surveyed it.")
    .max(3, "There are only three methods."),
  authorizationNote: z
    .string()
    .max(4000, "Four thousand characters is the most this note can carry.")
    .nullable(),
  notes: z
    .string()
    .max(4000, "Four thousand characters is the most these notes can carry.")
    .nullable(),
}).strict();

/**
 * The fields each cross-field rule on the draft reads, and nothing else. A plain `z.object` ignores
 * the other provenance keys, so an unselected provenance kind no longer hides the survey-date message.
 */
const SurveyDateRefinementInputsSchema = z.object({
  provenance: z.object({ surveyedAt: z.string() }),
});
const AttestationRefinementInputsSchema = z.object({
  acceptedAttestationClauseIds: z.array(z.enum(TEARDOWN_ATTESTATION_CLAUSE_IDS)),
});

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
    provenance: TeardownSubmissionProvenanceSchema,
    /*
     * ⚠️ EVERY LIST IS CAPPED, AND THE NUMBERS ARE THE SERVER'S. Uncapped, an over-long list is a
     * 413 or a 422 arriving after the publisher has written the whole thing; capped, it is a
     * refusal beside the "Add a…" button that produced it. Each of these is something somebody
     * does by pressing a button, which is the test for mirroring a server rule at all.
     */
    materials: z.array(TeardownSubmissionMaterialSchema).max(8, "Eight materials is the most."),
    parts: z.array(TeardownSubmissionPartSchema).max(40, "Forty listed parts is the most."),
    documents: z.array(TeardownSubmissionDocumentSchema).max(8, "Eight documents is the most."),
    manufacturingFiles: z
      .array(TeardownSubmissionManufacturingFileSchema)
      .max(8, "Eight fabrication files is the most."),
    /** `null` when nobody filmed it, which is the ordinary case. */
    walkthroughVideo: BlueprintVideoSchema.nullable(),
    /**
     * Tags are comma-split free text, so a 41-character tag is typed rather than generated — which
     * is why the per-tag bound is here and not only the list's.
     */
    tags: z
      .array(z.string().min(1, "A tag needs a word.").max(40, "That tag is too long."))
      .max(12, "Twelve tags is the most."),
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
  // ⚠️ TWO REFINEMENTS, EACH GATED BY `when` ON THE FIELDS IT READS. As one refinement it was skipped
  // whenever any field aborted (an unselected provenance kind, a literal miss), so the survey-date
  // and statement messages only appeared on a second press. See `refinement-inputs.ts`.
  .superRefine(
    (draft, context) => {
      const refinementInputs = SurveyDateRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      /**
       * ⚠️ AN EMPTY SURVEY DATE HAS TO BE REFUSED HERE, because the READ schema cannot refuse it.
       * `TeardownProvenanceSchema.surveyedAt` is `z.string()` — the house convention for an ISO value
       * (`IsoDateTimeSchema`) — which accepts `""`. That is harmless for fixtures, every one of which
       * has a date, and wrong for a form, where "" is exactly what a publisher who skipped the field
       * produces. Without this the submission is accepted and the page renders an empty date.
       */
      if (refinementInputs.data.provenance.surveyedAt.trim() === "") {
        context.addIssue({
          code: "custom",
          path: ["provenance", "surveyedAt"],
          message:
            "Say when you surveyed the unit. A survey with no date cannot be checked against anything.",
        });
        return;
      }

      /*
       * ⚠️ `Date.now()` IS READ HERE, INSIDE THE REFINEMENT, AND NOWHERE ELSE. A clock read at
       * module or render scope is a BUILD error under `cacheComponents`, not a test failure — the
       * same trap `use-attempt-idempotency-key.ts` keeps the key lazy for.
       *
       * A future survey date is either a typo or a claim about a unit nobody has opened yet, and
       * the server refuses it either way.
       */
      const surveyedAtMilliseconds = Date.parse(refinementInputs.data.provenance.surveyedAt);
      if (!Number.isNaN(surveyedAtMilliseconds) && surveyedAtMilliseconds > Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["provenance", "surveyedAt"],
          message: "A survey cannot be dated in the future.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(SurveyDateRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = AttestationRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      const acceptedClauseIds = new Set(refinementInputs.data.acceptedAttestationClauseIds);
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
    },
    { when: buildWellTypedInputsPredicate(AttestationRefinementInputsSchema) },
  );
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
  .strip();
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
    /**
     * ⚠️ `.catch("unknown")`, AS BOTH SIBLING LISTS DO, AND IT IS NOT DEFENSIVENESS. This list is
     * ONE array parse: a single row in a state this build does not know yet fails the whole array,
     * and the author is shown "Couldn't load your teardowns" instead of the nine rows they can
     * read. A state added by a backend release should cost one unfamiliar chip, not the page.
     */
    moderationState: z.enum(BLUEPRINT_SUBMISSION_DISPLAY_STATES).catch("unknown"),
    submittedAt: z.string(),
    publicSlug: z.string().nullable(),
    moderatorNote: z.string().nullable(),
  })
  .strip()
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
