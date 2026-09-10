// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE OBJECTION SIDE of the teardown surface. Parts 1 and 2 built a surface that invites strangers
// to publish surveys of other companies' products; this is how the company objects.
//
// ⚠️ NOTHING HERE IS SENT TO QATOTO. There is no `blueprint_rights_claim` table and no route, and
// this part deliberately does NOT repeat the authoring wizard's mock-write shape. A publisher
// rehearsing a submission loses their own draft; a rights holder who believes they have given legal
// notice and has not may miss a deadline, or think the platform is on notice when it is not. So the
// route PREPARES a notice and the claimant sends it themselves — see
// `@/lib/blueprints/rights-claim-notice`. The schema below validates what goes into that document.
//
// A consequence worth naming: the claimant's name, organisation and email never reach a Qatoto
// server. This is the most privacy-preserving version of this form that could exist, and it is a
// side effect of not having a table rather than a design achievement.
//
// ⚠️ `.strict()`, NOT `.strip()`, for the reason `authoring.schemas.ts` gives at length: a stripped
// field on a write path once destroyed sellers' declared lead times silently
// (`src/lib/products/schemas.ts:98-107`). A dropped field in a legal notice is the same failure with
// worse consequences.

import { z } from "zod";

/**
 * What KIND of right is claimed.
 *
 * ⚠️ FOUR KINDS BECAUSE THEY ARE FOUR DIFFERENT CLAIMS, not four words for one. A patent claim is
 * about a method or a mechanism; a trade-secret claim asserts the information was confidential and
 * should never have been public; a copyright claim over a drawing is about the DRAWING rather than
 * the product it depicts; a trademark claim is about a name or a look. What Qatoto would have to do
 * differs in each case, and a notice that does not say which one it is cannot be triaged.
 *
 * snake_case, byte-matching the `blueprint_rights_claim` pgEnum this will become.
 */
export const RIGHTS_CLAIM_KINDS = ["patent", "trade_secret", "copyright_cad", "trademark"] as const;
export const RightsClaimKindSchema = z.enum(RIGHTS_CLAIM_KINDS);
export type RightsClaimKind = z.infer<typeof RightsClaimKindSchema>;

export const RIGHTS_CLAIM_KIND_LABELS: Record<RightsClaimKind, string> = {
  patent: "Patent",
  trade_secret: "Trade secret",
  copyright_cad: "Copyright in a drawing or model",
  trademark: "Trademark",
};

/**
 * WHAT EACH KIND MEANS, in the words of somebody who is not a lawyer.
 *
 * ⚠️ THIS IS NOT DECORATION AND IT IS NOT LEGAL ADVICE. A rights holder's solicitor knows which of
 * the four they mean. A small manufacturer who has just found their product taken apart on the
 * internet does not, and a notice filed under the wrong heading is one Qatoto has to go back and ask
 * about — which costs the claimant the time they are most anxious about. Each line describes the
 * claim, never whether the reader has one.
 */
export const RIGHTS_CLAIM_KIND_NOTES: Record<RightsClaimKind, string> = {
  patent:
    "You hold a patent covering how the product works, and you believe this survey shows somebody how to make something that infringes it.",
  trade_secret:
    "The information here was confidential, and you believe it could only have been obtained from someone who was not free to share it.",
  copyright_cad:
    "You own drawings, models or documents, and you believe the files here are copies of yours rather than somebody's own measurements.",
  trademark:
    "Your name, logo or product's distinctive appearance is used here in a way that suggests you published this or endorsed it.",
};

/**
 * WHICH PART OF THE TEARDOWN IS CLAIMED.
 *
 * ⚠️ A DISCRIMINATED UNION, NOT A FREE-TEXT "which file". This is the one question where a vague
 * answer makes the whole notice unactionable: "your CAD files" against a teardown that published
 * six of them leaves Qatoto unable to act without asking, and asking costs days. A union cannot be
 * half-answered, and the picker offers the teardown's REAL documents, files and parts by id, so the
 * notice always names something that exists.
 *
 * `whole_teardown` IS A FIRST-CLASS ARM rather than the absence of a choice. Sometimes the objection
 * genuinely is to the survey existing at all — a trade-secret claim usually is — and forcing that
 * claimant to pick one file would misrepresent what they are saying.
 */
export const RightsClaimTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("whole_teardown") }).strict(),
  z.object({ kind: z.literal("document"), documentId: z.string().min(1) }).strict(),
  z
    .object({ kind: z.literal("manufacturing_file"), manufacturingFileId: z.string().min(1) })
    .strict(),
  z.object({ kind: z.literal("part"), partId: z.string().min(1) }).strict(),
]);
export type RightsClaimTarget = z.infer<typeof RightsClaimTargetSchema>;

/**
 * THE THREE STATEMENTS A CLAIMANT SWEARS, and the reason a notice from this form is one Qatoto could
 * act on at all.
 *
 * ⚠️ AN UNSWORN NOTICE IS A COMPLAINT. `todo.md` already records, against the video flag queue, that
 * it "is a COMMUNITY FLAG QUEUE, not a DMCA process" and lists what a safe-harbour process lacks:
 * claimant disclosure, a sworn statement, a counter-notice path, a repeat-infringer policy, a
 * designated agent. These three close ONE of those five. They do not make this a statutory filing
 * and no copy anywhere may say they do.
 *
 * ⚠️ THE THIRD CLAUSE IS THE LOAD-BEARING ONE. Anyone can believe a thing in good faith; the
 * question that decides whether Qatoto can act is whether the person writing is the rights holder
 * or speaks for them. Taking a teardown down on the word of somebody with no standing is the
 * failure mode a takedown system is judged on, in the opposite direction from ignoring a real claim.
 *
 * Same shape as `TEARDOWN_ATTESTATION_CLAUSES`, deliberately: the publisher and the claimant are
 * held to the same kind of promise, in the same kind of words, on the same surface.
 */
export const RIGHTS_CLAIM_SWORN_CLAUSES = [
  {
    id: "good_faith",
    label: "I believe in good faith that this is not authorised",
    detail:
      "To the best of my knowledge the publisher does not have permission from me or from anyone entitled to give it, and no exception applies that I am aware of.",
  },
  {
    id: "accurate",
    label: "The information in this notice is accurate",
    detail:
      "The rights I describe are ones I can evidence, and what I say about this teardown is true as far as I know.",
  },
  {
    id: "authorised",
    label: "I am the rights holder, or I am authorised to act for them",
    detail:
      // ⚠️ NO POSITIONAL WORD. This detail is rendered in TWO places with opposite geometry: in the
      // form the standing field sits above the checkbox, and in the emailed notice the standing line
      // sits above the sworn statements too — so "below" was wrong in both, which is what happens
      // when copy describes a layout instead of a fact.
      "I own the right I am claiming, or I am employed or instructed by the person or company that does. If I am acting for someone else, I have said who.",
  },
] as const;

export type RightsClaimSwornClauseId = (typeof RIGHTS_CLAIM_SWORN_CLAUSES)[number]["id"];

export const RIGHTS_CLAIM_SWORN_CLAUSE_IDS = RIGHTS_CLAIM_SWORN_CLAUSES.map(
  (clause) => clause.id,
) as readonly RightsClaimSwornClauseId[];

/**
 * The whole notice, before it is turned into text.
 *
 * `claimantOrganizationName` IS NULLABLE and `relationshipToRightsHolder` IS NOT. An individual
 * inventor has no organisation, so requiring one would force them to type something untrue — but
 * every claimant has a relationship to the right, and it is the field the third sworn clause points
 * at. "I am the rights holder" and "I am outside counsel instructed by them" are both fine answers;
 * silence is not.
 */
export const RightsClaimDraftSchema = z
  .object({
    claimKind: RightsClaimKindSchema,
    target: RightsClaimTargetSchema,
    claimantFullName: z.string().min(2, "A notice has to say who is making it."),
    claimantOrganizationName: z.string().nullable(),
    claimantEmail: z.string().email("An address Qatoto can reply to."),
    relationshipToRightsHolder: z
      .string()
      .min(3, "Say whether you own this right or are acting for whoever does."),
    /**
     * The substance. Long minimum on purpose: this is the field Qatoto reads to decide anything, and
     * "this is my design" is not a claim anybody can act on.
     */
    claimSubstance: z
      .string()
      .min(
        60,
        "Say what you own and what here you say copies it. This is the part somebody has to read and act on.",
      ),
    acceptedSwornClauseIds: z.array(z.enum(RIGHTS_CLAIM_SWORN_CLAUSE_IDS)),
  })
  .strict()
  .superRefine((draft, context) => {
    const acceptedClauseIds = new Set(draft.acceptedSwornClauseIds);
    const missingClauses = RIGHTS_CLAIM_SWORN_CLAUSES.filter(
      (clause) => !acceptedClauseIds.has(clause.id),
    );

    if (missingClauses.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["acceptedSwornClauseIds"],
        message: `All three statements have to be sworn before this notice can be prepared. Still unchecked: ${missingClauses
          .map((clause) => clause.label)
          .join("; ")}.`,
      });
    }
  });
export type RightsClaimDraft = z.infer<typeof RightsClaimDraftSchema>;
