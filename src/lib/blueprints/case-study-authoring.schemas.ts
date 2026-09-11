// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE WRITE SIDE OF THE CASE-STUDY ARM: what somebody sends when they write up a lesson, what they
// state about how they know it, and what comes back. Its read counterpart is
// `CaseStudyBlueprintSchema` in `@/lib/blueprints/schemas`; its launch sibling is
// `showcase-authoring.schemas.ts`, whose rules this file follows unless a note here says otherwise.
//
// ⚠️ `.strict()` ON THE DRAFT, `.strip()` ON THE RESPONSES, for the reason the launch contract gives:
// an unknown key on the way out is a bug here, an unknown key on the way in is a backend release.
//
// ⚠️ A CASE STUDY IS A CLAIM ABOUT A BUSINESS, OFTEN SOMEBODY ELSE'S. So the writer says how they know
// it (`authorRelationship`), the statements they tick follow from that answer, and a case study
// written from public sources must link them. None of this makes a claim true. It makes the writer
// say which claim they are making, and the backend and a moderator stay the gate.
//
// NO THUMBNAIL, DIFFICULTY, CAD FORMAT OR PARTS COST IS COLLECTED. The read arm inherits all four from
// the shared blueprint shape and renders none of them on a case study, so asking a writer for them
// would gather data nothing shows. `todo.md` records what the backend does about them instead.

import { z } from "zod";

import {
  BLUEPRINT_DISCIPLINES,
  BLUEPRINT_SUBMISSION_DISPLAY_STATES,
  CASE_STUDY_AUTHOR_RELATIONSHIPS,
  CASE_STUDY_WITHHELD_COMPANY_LABEL,
  type CaseStudyAuthorRelationship,
} from "@/lib/blueprints/schemas";
import { buildWellTypedInputsPredicate } from "@/lib/blueprints/refinement-inputs";
import { createExternalHttpsUrlSchema } from "@/lib/blueprints/url-source.schemas";

/**
 * The currencies a case study's money may be stated in: the two the fixtures already use.
 *
 * BOTH COUNT IN HUNDREDTHS (cents, paise), which is why one collector converts either. A currency
 * with a different minor unit needs its own conversion before it joins this list.
 */
export const CASE_STUDY_CURRENCIES = ["USD", "INR"] as const;
export type CaseStudyCurrency = (typeof CASE_STUDY_CURRENCIES)[number];

export const CASE_STUDY_CURRENCY_LABELS: Record<CaseStudyCurrency, string> = {
  USD: "US dollars",
  INR: "Indian rupees",
};

/** The two answers to "How do you know this?", as the form offers them. */
export const CASE_STUDY_AUTHOR_RELATIONSHIP_CHOICES: Record<
  CaseStudyAuthorRelationship,
  { readonly label: string; readonly detail: string }
> = {
  first_hand: {
    label: "I worked on this",
    detail: "You were on the team, or worked closely with it, while this happened.",
  },
  public_sources: {
    label: "From public sources",
    detail:
      "You are writing up what the company, its founders or the press published. You will link every source you used.",
  },
};

/**
 * THE STATEMENTS A WRITER TICKS, as ids plus a copy record, with the pair each answer requires.
 *
 * ⚠️ TWO PAIRS, NOT ONE LIST. Somebody who was there is vouching for records they saw; somebody
 * writing from a build log is vouching that they added nothing to it. One shared pair would have to be
 * vague enough to fit both, and a vague statement is ticked without reading.
 */
export const CASE_STUDY_STATEMENT_IDS = [
  "was_part_of_it",
  "figures_from_records",
  "figures_in_linked_sources",
  "says_only_what_sources_say",
] as const;
export type CaseStudyStatementId = (typeof CASE_STUDY_STATEMENT_IDS)[number];

export const CASE_STUDY_STATEMENTS: Record<
  CaseStudyStatementId,
  { readonly label: string; readonly detail: string }
> = {
  was_part_of_it: {
    label: "I was part of what this describes",
    detail:
      "I was on the team, or worked closely with it, while this happened. I am not retelling somebody else's account.",
  },
  figures_from_records: {
    label: "The figures come from real records",
    detail:
      "Every number here comes from records I saw at the time or a source linked below, not from memory or an estimate.",
  },
  figures_in_linked_sources: {
    label: "Every figure is in a linked source",
    detail: "Each number here appears in one of the sources below. Nothing is estimated.",
  },
  says_only_what_sources_say: {
    label: "Nothing here goes beyond the sources",
    detail: "This case study claims nothing about a company that its sources do not say.",
  },
};

export const CASE_STUDY_STATEMENT_IDS_BY_RELATIONSHIP: Record<
  CaseStudyAuthorRelationship,
  readonly CaseStudyStatementId[]
> = {
  first_hand: ["was_part_of_it", "figures_from_records"],
  public_sources: ["figures_in_linked_sources", "says_only_what_sources_say"],
};

/** Upper bounds the form shows as soft counts, mirrored by the backend when it lands. */
export const CASE_STUDY_TITLE_MAXIMUM_CHARACTERS = 140;
export const CASE_STUDY_ONE_LINE_ACTION_MAXIMUM_CHARACTERS = 140;
export const CASE_STUDY_OUTCOME_SUMMARY_MAXIMUM_CHARACTERS = 120;

const CaseStudyEvidenceCompanyDraftSchema = z
  .object({
    /**
     * ⚠️ ALWAYS THE REAL NAME, WITHHELD OR NOT. A withheld name is withheld from READERS, not from
     * Qatoto: it travels to the backend so a moderator can check the case study against it, and every
     * public read returns `null` in its place (`CaseStudyEvidenceCompanySchema`). A withheld company a
     * moderator cannot see is a claim nobody can check, which is the reason public sources may not
     * withhold one either.
     */
    name: z
      .string()
      .min(1, "Give the company's name.")
      .max(80, "Keep the name under 80 characters."),
    /** Only a first-hand case study may set this; the refinement on the draft enforces that. */
    isNameWithheld: z.boolean(),
    locationLabel: z
      .string()
      .min(1, "Say where it happened, like Porto.")
      .max(60, "Keep the place under 60 characters."),
    yearLabel: z
      .string()
      .min(1, "Say when it happened, like 2024.")
      .max(20, "Keep the year under 20 characters."),
  })
  .strict();

/**
 * Money on a case study, in integer minor units. STRICTER THAN `BlueprintMoneySchema`, a read shape
 * that accepts any currency string and a negative amount; a write refuses both.
 */
const CaseStudyMoneyDraftSchema = z
  .object({
    amountInCents: z
      .number({ error: "Give the amount as a number, like 250000 or 5.12." })
      .int()
      .nonnegative("An amount can't be below zero."),
    currency: z.enum(CASE_STUDY_CURRENCIES, { error: "Pick the currency." }),
  })
  .strict();

/**
 * One figure's value. The read side's `BlueprintMetricValueSchema`, strict, with messages a writer can
 * act on. PERCENTAGES ARE BASIS POINTS so a fraction survives the integer: 43.8% is 4380.
 */
const CaseStudyMetricValueDraftSchema = z.discriminatedUnion(
  "kind",
  [
    z
      .object({
        kind: z.literal("count"),
        amount: z
          .number({ error: "Give the count as a whole number, like 1000." })
          .int("Give the count as a whole number, like 1000.")
          .nonnegative("A count can't be below zero."),
      })
      .strict(),
    z
      .object({
        kind: z.literal("money"),
        amountInCents: z
          .number({ error: "Give the amount as a number, like 5.12." })
          .int()
          .nonnegative("An amount can't be below zero."),
        currency: z.enum(CASE_STUDY_CURRENCIES, { error: "Pick the currency." }),
      })
      .strict(),
    z
      .object({
        kind: z.literal("percentage"),
        basisPoints: z.number({ error: "Give the percentage as a number, like 43.8." }).int(),
      })
      .strict(),
  ],
  { error: "Say what kind of figure this is." },
);

const CaseStudyOutcomeMetricDraftSchema = z
  .object({
    label: z
      .string()
      .min(1, "Name the figure, like Units shipped.")
      .max(60, "Keep the label under 60 characters."),
    value: CaseStudyMetricValueDraftSchema,
  })
  .strict();

/** STRICTER THAN `BlueprintSourceSchema` for the launch link's reason: a write refuses empty labels. */
const CaseStudySourceDraftSchema = z
  .object({
    label: z
      .string()
      .min(1, "Say what the source is, like Run-by-run cost breakdown.")
      .max(120, "Keep the label under 120 characters."),
    publisherLabel: z
      .string()
      .min(1, "Say who published it.")
      .max(80, "Keep the publisher under 80 characters."),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strict();

/** A step or a pitfall. Blank rows are refused rather than dropped, so a writer sees what is empty. */
function createListItemDraftSchema(emptyItemMessage: string) {
  return z.string().min(1, emptyItemMessage).max(300, "Keep each one under 300 characters.");
}

/**
 * The indexes of values already seen earlier in a list, compared trimmed and case-insensitively.
 * Blank values are skipped, because their own rule already names them.
 */
function findRepeatedValueIndexes(values: readonly string[]): number[] {
  const seenValues = new Set<string>();
  const repeatedValueIndexes: number[] = [];
  values.forEach((value, valueIndex) => {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "") return;
    if (seenValues.has(normalizedValue)) repeatedValueIndexes.push(valueIndex);
    seenValues.add(normalizedValue);
  });
  return repeatedValueIndexes;
}

/** The fields each cross-field rule on the draft reads, and nothing else. See `refinement-inputs.ts`. */
const StatementRefinementInputsSchema = z.object({
  authorRelationship: z.enum(CASE_STUDY_AUTHOR_RELATIONSHIPS),
  acceptedStatementIds: z.array(z.enum(CASE_STUDY_STATEMENT_IDS)),
});
const SourcesRequiredRefinementInputsSchema = z.object({
  authorRelationship: z.enum(CASE_STUDY_AUTHOR_RELATIONSHIPS),
  sources: z.array(z.unknown()),
});
const WithheldCompanyNameRefinementInputsSchema = z.object({
  authorRelationship: z.enum(CASE_STUDY_AUTHOR_RELATIONSHIPS),
  evidenceCompanies: z.array(z.object({ isNameWithheld: z.boolean() })),
});
const FactLabelRefinementInputsSchema = z.object({
  evidenceCompanies: z.array(z.object({ name: z.string(), isNameWithheld: z.boolean() })),
  outcomeMetrics: z.array(z.object({ label: z.string() })),
});
const SourceAddressRefinementInputsSchema = z.object({
  sources: z.array(z.object({ url: z.string() })),
});
const ListItemRefinementInputsSchema = z.object({
  actionSteps: z.array(z.string()),
  pitfalls: z.array(z.string()),
});
const RelatedLessonRefinementInputsSchema = z.object({
  relatedLessonSlugs: z.array(z.string()),
});

/**
 * What a writer submits.
 *
 * SERVER-OWNED FIELDS ARE ABSENT BY DESIGN: `id`, `slug`, `author`, both counts, `createdAt` and any
 * moderation state, for the launch draft's reason.
 *
 * ⚠️ THE DUPLICATE RULES BELOW ARE NOT TIDINESS. The detail page keys its fact rows by label (a company
 * name or a figure's label, in one list), its sources by address and its steps by their text, so a
 * repeat would collide there rather than fail here.
 */
export const CaseStudySubmissionDraftSchema = z
  .object({
    /** THE LESSON, AS ONE INSTRUCTION. The read arm's note says why there is no second title. */
    title: z
      .string()
      .min(12, "Write the lesson as one instruction, like Budget for a second mould.")
      .max(
        CASE_STUDY_TITLE_MAXIMUM_CHARACTERS,
        `Keep the lesson under ${CASE_STUDY_TITLE_MAXIMUM_CHARACTERS} characters.`,
      ),
    oneLineAction: z
      .string()
      .min(10, "Say the one thing a reader should do.")
      .max(
        CASE_STUDY_ONE_LINE_ACTION_MAXIMUM_CHARACTERS,
        `Keep it to one line, under ${CASE_STUDY_ONE_LINE_ACTION_MAXIMUM_CHARACTERS} characters.`,
      ),
    discipline: z.enum(BLUEPRINT_DISCIPLINES, {
      error: "Choose the discipline this lesson is about.",
    }),
    sector: z
      .string()
      .min(1, "Say the sector, like Hardware or Food processing.")
      .max(60, "Keep the sector under 60 characters."),
    /** `null` when nobody can say tidily what came of it. Not "Unknown", and not a failure. */
    outcomeSummary: z
      .string()
      .max(
        CASE_STUDY_OUTCOME_SUMMARY_MAXIMUM_CHARACTERS,
        `Keep what happened after under ${CASE_STUDY_OUTCOME_SUMMARY_MAXIMUM_CHARACTERS} characters.`,
      )
      .nullable(),
    authorRelationship: z.enum(CASE_STUDY_AUTHOR_RELATIONSHIPS, {
      error: "Say how you know this story.",
    }),
    summary: z
      .string()
      .min(40, "One paragraph: what happened, in brief.")
      .max(600, "Keep the summary under 600 characters."),
    problem: z
      .string()
      .min(20, "Say what was going wrong.")
      .max(2000, "Keep the problem under 2,000 characters."),
    context: z
      .string()
      .min(20, "Say who this was and what they were doing.")
      .max(2000, "Keep the context under 2,000 characters."),
    actionSteps: z
      .array(createListItemDraftSchema("Write this step or remove it."))
      .min(1, "Add at least one thing they did.")
      .max(12, "Twelve steps at most. Merge the small ones."),
    pitfalls: z
      .array(createListItemDraftSchema("Write this one or remove it."))
      .max(12, "Twelve at most. Keep the ones that cost the most."),
    evidenceCompanies: z
      .array(CaseStudyEvidenceCompanyDraftSchema)
      .max(5, "Five companies at most."),
    timelineLabel: z.string().max(60, "Keep the timeline under 60 characters.").nullable(),
    /** `null` MEANS NOT DISCLOSED, never zero, for the read arm's reason. */
    capitalRaised: CaseStudyMoneyDraftSchema.nullable(),
    outcomeMetrics: z
      .array(CaseStudyOutcomeMetricDraftSchema)
      .max(8, "Eight figures at most. Keep the ones the lesson rests on."),
    sources: z.array(CaseStudySourceDraftSchema).max(10, "Ten sources at most."),
    relatedLessonSlugs: z.array(z.string().min(1)).max(3, "Link three related lessons at most."),
    tags: z.array(z.string().min(1)).max(10, "Ten tags at most."),
    acceptedStatementIds: z.array(z.enum(CASE_STUDY_STATEMENT_IDS)),
  })
  .strict()
  // ⚠️ ONE REFINEMENT PER RULE, EACH GATED BY `when` ON THE FIELDS IT READS, so every message shows on
  // the first press even while an unrelated field is still empty. See `refinement-inputs.ts`.
  .superRefine(
    (draft, context) => {
      const refinementInputs = StatementRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      const requiredStatementIds =
        CASE_STUDY_STATEMENT_IDS_BY_RELATIONSHIP[refinementInputs.data.authorRelationship];
      const acceptedStatementIds = new Set(refinementInputs.data.acceptedStatementIds);
      const missingStatementIds = requiredStatementIds.filter(
        (statementId) => !acceptedStatementIds.has(statementId),
      );
      if (missingStatementIds.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["acceptedStatementIds"],
          message: `Both statements have to be ticked before this can be sent. Still unticked: ${missingStatementIds
            .map((statementId) => CASE_STUDY_STATEMENTS[statementId].label)
            .join("; ")}.`,
        });
      }

      // A tick carried over from the other answer is a statement about a different claim.
      const hasStatementForOtherRelationship = refinementInputs.data.acceptedStatementIds.some(
        (statementId) => !requiredStatementIds.includes(statementId),
      );
      if (hasStatementForOtherRelationship) {
        context.addIssue({
          code: "custom",
          path: ["acceptedStatementIds"],
          message:
            "A statement for the other way of knowing this is ticked. Untick it, or change How you know this.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(StatementRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = SourcesRequiredRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      if (
        refinementInputs.data.authorRelationship === "public_sources" &&
        refinementInputs.data.sources.length === 0
      ) {
        context.addIssue({
          code: "custom",
          path: ["sources"],
          message: "A case study from public sources has to link at least one of them.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(SourcesRequiredRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = WithheldCompanyNameRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;
      if (refinementInputs.data.authorRelationship === "first_hand") return;

      // A withheld name in a case study from public sources hides a company its readers could check.
      refinementInputs.data.evidenceCompanies.forEach((company, companyIndex) => {
        if (!company.isNameWithheld) return;
        context.addIssue({
          code: "custom",
          path: ["evidenceCompanies", companyIndex, "isNameWithheld"],
          message:
            "Only someone who worked on this can withhold a company's name. From public sources, name it the way the sources do.",
        });
      });
    },
    { when: buildWellTypedInputsPredicate(WithheldCompanyNameRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = FactLabelRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      // REPEATS ARE CHECKED ACROSS EVERY NAME, withheld ones included: one company listed twice is the
      // same mistake whether or not readers see its name, and a moderator would see both rows.
      const companyNames = refinementInputs.data.evidenceCompanies.map((company) => company.name);
      const hasWithheldCompanyName = refinementInputs.data.evidenceCompanies.some(
        (company) => company.isNameWithheld,
      );
      // Only a SHOWN name labels a row on the detail page, so only a shown name can clash with a figure.
      const shownCompanyNames = refinementInputs.data.evidenceCompanies
        .filter((company) => !company.isNameWithheld)
        .map((company) => company.name);
      const normalizedWithheldCompanyLabel = CASE_STUDY_WITHHELD_COMPANY_LABEL.toLowerCase();
      for (const companyIndex of findRepeatedValueIndexes(companyNames)) {
        context.addIssue({
          code: "custom",
          path: ["evidenceCompanies", companyIndex, "name"],
          message: "This company is already listed. Each company appears once.",
        });
      }

      const metricLabels = refinementInputs.data.outcomeMetrics.map((metric) => metric.label);
      const repeatedMetricIndexes = new Set(findRepeatedValueIndexes(metricLabels));
      const normalizedCompanyNames = new Set(
        shownCompanyNames
          .map((companyName) => companyName.trim().toLowerCase())
          .filter((normalizedCompanyName) => normalizedCompanyName !== ""),
      );
      metricLabels.forEach((metricLabel, metricIndex) => {
        if (repeatedMetricIndexes.has(metricIndex)) {
          context.addIssue({
            code: "custom",
            path: ["outcomeMetrics", metricIndex, "label"],
            message: "Another figure already has this label. Each figure needs its own.",
          });
          return;
        }
        const normalizedMetricLabel = metricLabel.trim().toLowerCase();
        if (normalizedMetricLabel !== "" && normalizedCompanyNames.has(normalizedMetricLabel)) {
          context.addIssue({
            code: "custom",
            path: ["outcomeMetrics", metricIndex, "label"],
            message: "A company above already uses this name. Give the figure a label of its own.",
          });
          return;
        }
        // The detail page labels a withheld company's row this way, in the same list as the figures.
        if (
          hasWithheldCompanyName &&
          normalizedMetricLabel.startsWith(normalizedWithheldCompanyLabel)
        ) {
          context.addIssue({
            code: "custom",
            path: ["outcomeMetrics", metricIndex, "label"],
            message:
              "That label is how the page shows a withheld company. Give the figure a label of its own.",
          });
        }
      });
    },
    { when: buildWellTypedInputsPredicate(FactLabelRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = SourceAddressRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      const sourceAddresses = refinementInputs.data.sources.map((source) => source.url);
      for (const sourceIndex of findRepeatedValueIndexes(sourceAddresses)) {
        context.addIssue({
          code: "custom",
          path: ["sources", sourceIndex, "url"],
          message: "This source is already linked.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(SourceAddressRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = ListItemRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      for (const stepIndex of findRepeatedValueIndexes(refinementInputs.data.actionSteps)) {
        context.addIssue({
          code: "custom",
          path: ["actionSteps", stepIndex],
          message: "This step is already on the list.",
        });
      }
      for (const pitfallIndex of findRepeatedValueIndexes(refinementInputs.data.pitfalls)) {
        context.addIssue({
          code: "custom",
          path: ["pitfalls", pitfallIndex],
          message: "This is already on the list.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(ListItemRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = RelatedLessonRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      if (findRepeatedValueIndexes(refinementInputs.data.relatedLessonSlugs).length > 0) {
        context.addIssue({
          code: "custom",
          path: ["relatedLessonSlugs"],
          message: "The same lesson is picked twice. Pick each related lesson once.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(RelatedLessonRefinementInputsSchema) },
  );
export type CaseStudySubmissionDraft = z.infer<typeof CaseStudySubmissionDraftSchema>;

/**
 * WHAT COMES BACK FROM SENDING, a receipt and not a row. No slug and no public URL, because neither
 * exists until a moderator publishes it.
 */
export const CaseStudySubmissionReceiptSchema = z
  .object({
    submissionId: z.string(),
    moderationState: z.literal("pending_review"),
    /** ISO 8601, server-stamped. When the case study was accepted, not when it was decided. */
    receivedAt: z.string(),
  })
  .strip();
export type CaseStudySubmissionReceipt = z.infer<typeof CaseStudySubmissionReceiptSchema>;

/**
 * One row in `/studio/case-studies`, the writer's own view of something they sent.
 *
 * `moderatorNote` is required on a rejected row and a published row carries its public slug; the
 * refinement checks both, as the launch row does.
 */
export const CaseStudySubmissionSchema = z
  .object({
    submissionId: z.string(),
    title: z.string(),
    oneLineAction: z.string(),
    discipline: z.enum(BLUEPRINT_DISCIPLINES),
    // `.catch`, so a state this build does not know reads as `unknown` rather than refusing the row.
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
        message: "A rejected case study must carry the reason it was rejected.",
      });
    }
    if (submission.moderationState === "published" && submission.publicSlug === null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A published case study has a public address; without one it is not published.",
      });
    }
  });
export type CaseStudySubmission = z.infer<typeof CaseStudySubmissionSchema>;
