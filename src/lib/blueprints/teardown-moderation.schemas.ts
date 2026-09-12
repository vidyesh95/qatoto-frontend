// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE MODERATOR SIDE OF THE TEARDOWN ARM: what the review queue reads and what a decision sends.
// Its author-side sibling is `authoring.schemas.ts`, and the public read is
// `TeardownBlueprintSchema` in `@/lib/blueprints/schemas`.
//
// ⚠️ A SEPARATE FILE ON PURPOSE. These rows carry a survey nobody outside the queue may read — a
// pending teardown has no public address at all, so this console is the only surface it exists on.
// Nothing under `src/components/home` or `src/components/studio` may import this file, and the check
// is `rg "teardown-moderation" src/components/home src/components/studio`, which must print nothing.
//
// `.strip()` ON WHAT COMES BACK, `.strict()` ON THE DECISION THAT GOES OUT, as everywhere here.

import { z } from "zod";

import {
  TEARDOWN_ATTESTATION_CLAUSES,
  type TeardownAttestationClauseId,
} from "@/lib/blueprints/authoring.schemas";
import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_DOCUMENT_KIND_LABELS,
  BLUEPRINT_DOCUMENT_KINDS,
  BlueprintVideoSchema,
  PUBLISHABLE_TEARDOWN_SUBJECT_KIND,
  TeardownCompositionElementSchema,
  TeardownListedPartSchema,
  TeardownMaterialSchema,
  TeardownProvenanceSchema,
  TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
  TEARDOWN_MANUFACTURING_FILE_KINDS,
  type TeardownManufacturingFileKind,
} from "@/lib/blueprints/schemas";
import { createHttpsOrSiteRelativeUrlSchema } from "@/lib/blueprints/url-source.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * BOTH FILE VOCABULARIES, MERGED — and the merge is what keeps a label lookup total.
 *
 * ⚠️ A SUBMISSION MAY CARRY EITHER KIND IN EITHER ARRAY. The wizard once served both file lists from
 * one schema whose `kind` was the manufacturing enum, so submissions sent before that was split have
 * fabrication labels sitting in `documents[]`, and they are already in the database. The backend
 * accepts both on purpose and files each link by its OWN label at publish, so those rows are correct
 * data rather than corrupt data.
 *
 * ⚠️ SO THE CARD MUST NEVER INDEX ONE SOURCE MAP. `BLUEPRINT_DOCUMENT_KIND_LABELS[file.kind]` for a
 * `step` is `undefined` rendered into the DOM. This record spreads both, so the lookup is total by
 * construction and a new value in EITHER source enum is a compile error here rather than a blank
 * chip in a moderator's queue.
 */
export const TEARDOWN_REVIEW_FILE_KINDS = [
  ...BLUEPRINT_DOCUMENT_KINDS,
  ...TEARDOWN_MANUFACTURING_FILE_KINDS,
] as const;
export const TeardownReviewFileKindSchema = z.enum(TEARDOWN_REVIEW_FILE_KINDS);
export type TeardownReviewFileKind = z.infer<typeof TeardownReviewFileKindSchema>;

export const TEARDOWN_REVIEW_FILE_KIND_LABELS: Record<TeardownReviewFileKind, string> = {
  ...BLUEPRINT_DOCUMENT_KIND_LABELS,
  ...TEARDOWN_MANUFACTURING_FILE_KIND_LABELS,
};

/** Whether a kind belongs to the fab's vocabulary rather than the reader's. */
export function isTeardownManufacturingFileKind(
  kind: TeardownReviewFileKind,
): kind is TeardownManufacturingFileKind {
  return TEARDOWN_MANUFACTURING_FILE_KINDS.some((manufacturingKind) => manufacturingKind === kind);
}

/** One file a publisher pointed at. No `id` and no `byteSize`: a submission carries neither. */
export const TeardownReviewFileSchema = z
  .object({
    kind: TeardownReviewFileKindSchema,
    title: z.string(),
    url: createHttpsOrSiteRelativeUrlSchema(2048),
  })
  .strip();
export type TeardownReviewFile = z.infer<typeof TeardownReviewFileSchema>;

/**
 * A material as it was submitted: the read shape minus the id the server mints at publish.
 *
 * `partId` is `.nullable()` here and `z.null()` on the write side, and the difference is the point.
 * A literal is a CONSTRAINT — right when refusing what a wizard may send, wrong when describing what
 * came back, because a read shape that adjudicates turns a server-accepted row into a card nobody
 * can see.
 */
export const TeardownReviewMaterialSchema = TeardownMaterialSchema.omit({ id: true }).extend({
  partId: z.string().nullable(),
  elements: z.array(TeardownCompositionElementSchema),
});
export type TeardownReviewMaterial = z.infer<typeof TeardownReviewMaterialSchema>;

/**
 * The payload a publisher sent, as the queue reads it.
 *
 * ⚠️ NOT `TeardownSubmissionDraftSchema`, AND THE REASON IS THE WHOLE SHAPE OF THIS FILE. That is a
 * `.strict()` WRITE schema carrying two refinements that ADJUDICATE rather than describe — every
 * attestation clause must be present, and `surveyedAt` is compared against `Date.now()` at parse
 * time — plus bounds whose messages are written for the author's form. Re-used here, a fifth clause
 * or a clock skew would retroactively refuse rows the backend already accepted.
 *
 * ⚠️ AND THE BLAST RADIUS WOULD BE THE WHOLE PAGE, NOT ONE ROW. `cursorPageOf` wraps these in
 * `z.array`, which is all-or-nothing: one refused row empties the queue, and since this console is
 * the ONLY surface a pending submission appears on, that is a submission nobody can ever decide and
 * an author waiting forever with no signal anywhere. `TeardownSubmissionSchema.moderationState`
 * already carries the same lesson as a `.catch`.
 *
 * So: a `.strip()` mirror built from the read-side value objects, re-declaring only the deltas the
 * wire forces. `TeardownProvenanceSchema` IS reused whole, refinement included — its three-arm
 * licence/authorisation rule is the exact thing a moderator is here to enforce, and its failure now
 * degrades one card rather than blanking the queue.
 */
const TeardownReviewPayloadSchema = z
  .object({
    subjectKind: z.literal(PUBLISHABLE_TEARDOWN_SUBJECT_KIND),
    title: z.string(),
    summary: z.string(),
    provenance: TeardownProvenanceSchema,
    materials: z.array(TeardownReviewMaterialSchema),
    parts: z.array(TeardownListedPartSchema),
    documents: z.array(TeardownReviewFileSchema),
    manufacturingFiles: z.array(TeardownReviewFileSchema),
    walkthroughVideo: BlueprintVideoSchema.nullable(),
    tags: z.array(z.string()),
    /**
     * PLAIN STRINGS, NOT THE ENUM. A clause added to the attestation later must not make every
     * stored row unreadable; `summarizeTeardownAttestation` does the adjudicating, visibly, where a
     * moderator can see an id this build does not recognise rather than losing the row over it.
     */
    acceptedAttestationClauseIds: z.array(z.string()),
  })
  .strip();
export type TeardownReviewPayload = z.infer<typeof TeardownReviewPayloadSchema>;

/**
 * THE STORED DOCUMENT, IN THREE ARMS — and only two of them are ever on the wire.
 *
 * `present` and `unparseable` are the server's: it parses the stored text itself and hands back the
 * failure rather than throwing, because one bad row must not hide a whole queue page.
 *
 * ⚠️ `client_unreadable` IS LOCAL AND CANNOT ARRIVE. The `.catch` below produces it when THIS build
 * cannot read a document the server considers fine. The two are different facts with different
 * remedies and must never be laundered into one: `unparseable` blames the submission, so a send-back
 * is the right answer; `client_unreadable` blames this console, so the card offers no decision at
 * all. A send-back note is the only thing the publisher ever sees, and sending somebody's work back
 * over a bug in our own parser is the one unrecoverable mistake available here.
 */
export const TeardownReviewDocumentSchema = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("present"), document: TeardownReviewPayloadSchema }).strip(),
    z
      .object({
        status: z.literal("unparseable"),
        schemaVersion: z.number(),
        issues: z.array(z.string()),
      })
      .strip(),
    z.object({ status: z.literal("client_unreadable"), issues: z.array(z.string()) }).strip(),
  ])
  .catch((context) => ({
    status: "client_unreadable" as const,
    issues: context.error.issues.map(
      (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
    ),
  }));
export type TeardownReviewDocument = z.infer<typeof TeardownReviewDocumentSchema>;

/**
 * One submission waiting in `/admin/teardowns`.
 *
 * `title` and `subjectProductName` sit OUTSIDE the document union deliberately: they are what the
 * header renders, and a card whose document could not be read still has to say which submission it
 * is talking about.
 */
export const TeardownReviewItemSchema = z
  .object({
    submissionId: z.string(),
    submittedAt: IsoDateTimeSchema,
    /**
     * Who sent it. The backend refuses a moderator deciding their own (403).
     *
     * ⚠️ `handle` IS NULLABLE BECAUSE `user.handle` IS. A non-nullable field here would make the
     * whole ROW fail to parse, and the card would simply not be there — the same trap the
     * case-study queue records.
     */
    author: z.object({ displayName: z.string(), handle: z.string().nullable() }).strip(),
    title: z.string(),
    subjectProductName: z.string(),
    document: TeardownReviewDocumentSchema,
  })
  .strip();
export type TeardownReviewItem = z.infer<typeof TeardownReviewItemSchema>;

export const TeardownReviewQueuePageSchema = cursorPageOf(TeardownReviewItemSchema);
export type TeardownReviewQueuePage = z.infer<typeof TeardownReviewQueuePageSchema>;

export const TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS = 2000;
export const TEARDOWN_THUMBNAIL_URL_MAXIMUM_CHARACTERS = 512;

const MODERATOR_NOTE_TOO_LONG_MESSAGE = `Keep the note under ${TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")} characters.`;

/** The address shape, matching the server's slug CHECK. */
const DESIRED_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * `POST /blueprints/admin/teardowns/:submissionId/moderate` — the decision a moderator sends.
 *
 * ⚠️ PUBLISHING CARRIES TWO FIELDS THE PUBLISHER NEVER SENT, and they are not moderator preferences:
 * `thumbnailUrl` and `difficulty` are required of every published blueprint by `BlueprintMediaShape`,
 * and the wizard collects neither — it cannot ask for a thumbnail, because there is no upload route.
 * The publish form is where the read contract gets satisfied, and the card must say so rather than
 * implying the publisher stated either.
 *
 * ⚠️ THE THUMBNAIL CAPS AT 512, NOT THE READ SIDE'S 2048. That is the server's write bound, the same
 * one the wizard's file links take.
 *
 * ⚠️ A SEND-BACK MUST SAY WHY. There is no edit-and-resubmit flow on this arm, so the note is the
 * publisher's entire remedy: they read it, survey again, and submit afresh.
 */
export const TeardownModerationDecisionSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("published"),
      moderatorNote: z
        .string()
        .max(TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE)
        .nullable(),
      thumbnailUrl: createHttpsOrSiteRelativeUrlSchema(TEARDOWN_THUMBNAIL_URL_MAXIMUM_CHARACTERS),
      difficulty: z.enum(BLUEPRINT_DIFFICULTIES),
      /** `null` lets the server derive one from the title. The address is permanent once minted. */
      desiredSlug: z
        .string()
        .min(3, "An address is at least three characters.")
        .max(120, "An address is at most 120 characters.")
        .regex(DESIRED_SLUG_PATTERN, "An address is lowercase, digits and single hyphens.")
        .nullable(),
    })
    .strict(),
  z
    .object({
      decision: z.literal("rejected"),
      moderatorNote: z
        .string()
        .min(1, "Sending back needs a note. It is the only thing the publisher sees.")
        .max(TEARDOWN_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE),
    })
    .strict(),
]);
export type TeardownModerationDecision = z.infer<typeof TeardownModerationDecisionSchema>;

/** What a decision answers with. A published teardown has its public address; a sent-back one none. */
export const TeardownModerationResultSchema = z
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
        message: "A published teardown has a public address; without one it is not published.",
      });
    }
    if (result.moderationState === "rejected" && result.publicSlug !== null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A teardown that was sent back has no public address.",
      });
    }
  });
export type TeardownModerationResult = z.infer<typeof TeardownModerationResultSchema>;

/**
 * The four statements, each marked accepted or not — the adjudication the payload schema stopped
 * doing, done where a moderator can see it.
 *
 * ⚠️ AN UNTICKED CLAUSE IS IMPOSSIBLE THROUGH THE WIZARD, AND THE CARD MUST STILL SHOW IT. The gate
 * is a client-side courtesy; anyone can post the body directly. An absent tick is the one fact a
 * moderator cannot infer from anything else on the card.
 */
export function summarizeTeardownAttestation(acceptedClauseIds: readonly string[]): {
  readonly clauses: readonly {
    readonly id: TeardownAttestationClauseId;
    readonly label: string;
    readonly isAccepted: boolean;
  }[];
  readonly unrecognizedClauseIds: readonly string[];
} {
  const acceptedIdSet = new Set(acceptedClauseIds);
  const knownIdSet = new Set<string>(TEARDOWN_ATTESTATION_CLAUSES.map((clause) => clause.id));

  return {
    clauses: TEARDOWN_ATTESTATION_CLAUSES.map((clause) => ({
      id: clause.id,
      label: clause.label,
      isAccepted: acceptedIdSet.has(clause.id),
    })),
    unrecognizedClauseIds: acceptedClauseIds.filter((clauseId) => !knownIdSet.has(clauseId)),
  };
}
