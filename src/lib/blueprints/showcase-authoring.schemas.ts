// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE WRITE SIDE OF THE SHOWCASE ARM: what a maker posts when they launch a build, what they state
// about it, and what comes back. Its read counterpart is `ShowcaseBlueprintSchema` in
// `@/lib/blueprints/schemas`; its teardown sibling is `authoring.schemas.ts`, whose rules this file
// follows unless a note here says otherwise.
//
// ⚠️ `.strict()` ON THE DRAFT, `.strip()` ON THE RESPONSES. An unknown key on the way OUT is a bug
// in this repo and should be loud (`src/lib/products/schemas.ts:98-107` records what stripping cost
// on a write path). An unknown key on the way IN is a backend minor release, which CLAUDE.md Pattern
// 2 says to ignore rather than crash on.
//
// ⚠️ THE HEADING IMAGE IS NOT IN THE DRAFT, and that is the shape of the eventual request rather
// than an omission. The image travels as a file beside this JSON (a multipart body), and the server
// answers with the stored URL. In Part 1 the file is checked in the browser and never sent; see
// `showcase-authoring.api.ts`.

import { z } from "zod";

import {
  BLUEPRINT_DIFFICULTIES,
  BLUEPRINT_SUBMISSION_DISPLAY_STATES,
} from "@/lib/blueprints/schemas";
import { buildWellTypedInputsPredicate } from "@/lib/blueprints/refinement-inputs";
import {
  createExternalHttpsUrlSchema,
  createHttpsOrSiteRelativeUrlSchema,
} from "@/lib/blueprints/url-source.schemas";

/**
 * THE TWO STATEMENTS A MAKER TICKS BEFORE POSTING, as ids plus a copy record.
 *
 * ⚠️ IDS AS A TUPLE, COPY AS A `Record` OVER THEM, and no `as` anywhere. The teardown clauses derive
 * their id list with a cast; here a missing copy entry is a compile error instead.
 *
 * TWO, NOT THE TEARDOWN FOUR. A launch makes claims about a build its makers made: that they made
 * it, and that the results are theirs. The teardown clauses are about a unit somebody else made and
 * how it was obtained, and most of them do not describe a launch at all.
 */
export const SHOWCASE_LAUNCH_STATEMENT_IDS = ["built_it_ourselves", "results_are_our_own"] as const;
export type ShowcaseLaunchStatementId = (typeof SHOWCASE_LAUNCH_STATEMENT_IDS)[number];

export const SHOWCASE_LAUNCH_STATEMENTS: Record<
  ShowcaseLaunchStatementId,
  { readonly label: string; readonly detail: string }
> = {
  built_it_ourselves: {
    label: "We built this ourselves",
    detail:
      "The people named on this launch made it. It is not somebody else's product posted as ours.",
  },
  results_are_our_own: {
    label: "The results here are our own",
    detail:
      "Every figure and claim comes from our own use or testing of this build, not from a datasheet or a supplier.",
  },
};

/**
 * The longest tagline the feed row carries on one line at desktop width. The ten fixture launches
 * run 47 to 62 characters, so this leaves room without letting a pitch become a paragraph.
 */
export const SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS = 80;

/**
 * One person on the build, as the maker types them.
 *
 * ⚠️ NO AVATAR, unlike `BlueprintTeamMemberSchema` on the read side, which requires one. There is no
 * upload for it, and a pasted photo link for somebody else is a thing nobody has the right to post.
 * The form shows an initials circle; Part 2 derives the avatar from the person's own account.
 */
const ShowcaseTeamMemberDraftSchema = z
  .object({
    displayName: z.string().min(1, "Give this person's name."),
    handle: z
      .string()
      .min(1, "Give their handle.")
      .regex(/^[A-Za-z0-9_.-]+$/, "A handle has no spaces and no @, like amara-builds."),
    role: z.string().min(1, "Say what they did on the build."),
  })
  .strict();

/**
 * The launch's one outbound link. STRICTER THAN `BlueprintLinkSchema`, which is a read shape: that
 * one strips unknown keys and accepts an empty label, and a write must refuse both.
 */
const ShowcaseCallToActionDraftSchema = z
  .object({
    label: z.string().min(1, "Give the link a label, like Order a unit."),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strict();

/** The two numbers the range comparison reads. `z.number()` refuses `NaN`, so an unreadable one skips it. */
const CostRangeComparisonInputsSchema = z.object({
  minimumInCents: z.number(),
  maximumInCents: z.number(),
});

/**
 * What one unit's parts cost, as a range. STRICTER THAN `BlueprintCostRangeSchema` for the same
 * reason as the link: a write must refuse a range whose floor is above its ceiling.
 *
 * INTEGER CENTS, NEVER A DISPLAY STRING (CLAUDE.md, Blueprints). The form converts the typed dollars;
 * a value it could not read arrives as `NaN`, which is what the per-field message below is for.
 * USD only in Part 1, stated beside the fields.
 */
const ShowcaseCostRangeDraftSchema = z
  .object({
    minimumInCents: z
      .number({ error: "Give the lowest cost as a number, like 45 or 45.50." })
      .int()
      .nonnegative(),
    maximumInCents: z
      .number({ error: "Give the highest cost as a number, like 60 or 60.50." })
      .int()
      .nonnegative(),
    currency: z.literal("USD"),
  })
  .strict()
  .refine(
    (costRange) => {
      const comparisonInputs = CostRangeComparisonInputsSchema.safeParse(costRange);
      return (
        !comparisonInputs.success ||
        comparisonInputs.data.minimumInCents <= comparisonInputs.data.maximumInCents
      );
    },
    {
      path: ["maximumInCents"],
      message: "The highest cost can't be lower than the lowest.",
      // A SMALL GAIN, STATED AS SUCH: an unreadable floor already skipped this correctly. What
      // changes is that a wrong `currency` no longer hides the range message, and the dependency
      // is written down. See `refinement-inputs.ts`.
      when: buildWellTypedInputsPredicate(CostRangeComparisonInputsSchema),
    },
  );

/** The fields each cross-field rule on the draft reads, and nothing else. */
const LaunchStatementRefinementInputsSchema = z.object({
  acceptedLaunchStatementIds: z.array(z.enum(SHOWCASE_LAUNCH_STATEMENT_IDS)),
});
const TeamHandleRefinementInputsSchema = z.object({
  team: z.array(z.object({ handle: z.string() })),
});
const LaunchDateRefinementInputsSchema = z.object({ launchedAt: z.string() });

/**
 * What a maker submits.
 *
 * SERVER-OWNED FIELDS ARE ABSENT BY DESIGN: `id`, `slug`, `author`, every count (`viewCount`,
 * `likeCount`, `upvoteCount`, `commentCount`), `createdAt` and any moderation state. A client able
 * to set a count would be a business rule on an untrusted layer. `cadFormat` is not collected in
 * Part 1 either; the backend writes it null.
 */
export const ShowcaseSubmissionDraftSchema = z
  .object({
    title: z.string().min(8, "A name short enough to skim and specific enough to search."),
    tagline: z
      .string()
      .min(10, "One line that says what it does.")
      .max(
        SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS,
        `Keep the pitch to ${SHOWCASE_TAGLINE_MAXIMUM_CHARACTERS} characters so it fits one feed row.`,
      ),
    summary: z.string().min(40, "One paragraph: what it is, and what it proved."),
    /**
     * GitHub-style Markdown, rendered by `ShowcaseWriteUp`. A YouTube link on its own line becomes
     * the video. `null` when the maker wrote none. 10,000 characters is the server's limit too.
     */
    writeUp: z.string().max(10_000, "Keep the write-up under 10,000 characters.").nullable(),
    /** ISO 8601, chosen by the maker. The feed sorts on this. */
    launchedAt: z
      .string()
      .refine((isoInstant) => !Number.isNaN(Date.parse(isoInstant)), "Pick the day it launched."),
    difficulty: z.enum(BLUEPRINT_DIFFICULTIES, {
      error: "Say how hard it would be to build again.",
    }),
    billOfMaterialsCostRange: ShowcaseCostRangeDraftSchema.nullable(),
    tags: z.array(z.string().min(1)),
    team: z.array(ShowcaseTeamMemberDraftSchema),
    builtFromBlueprintSlug: z.string().min(1).nullable(),
    callToAction: ShowcaseCallToActionDraftSchema.nullable(),
    acceptedLaunchStatementIds: z.array(z.enum(SHOWCASE_LAUNCH_STATEMENT_IDS)),
  })
  .strict()
  // ⚠️ THREE REFINEMENTS, NOT ONE, EACH GATED BY `when` ON THE FIELDS IT READS. As one refinement
  // it was skipped whenever any field aborted, and the form starts with difficulty unchosen, so the
  // statements, duplicate-handle and future-date messages only appeared on a second press. Each body
  // re-parses its own inputs schema and reads nothing else; see `refinement-inputs.ts`.
  .superRefine(
    (draft, context) => {
      const refinementInputs = LaunchStatementRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      const acceptedStatementIds = new Set(refinementInputs.data.acceptedLaunchStatementIds);
      const missingStatementIds = SHOWCASE_LAUNCH_STATEMENT_IDS.filter(
        (statementId) => !acceptedStatementIds.has(statementId),
      );
      if (missingStatementIds.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["acceptedLaunchStatementIds"],
          message: `Both statements have to be ticked before this can be posted. Still unticked: ${missingStatementIds
            .map((statementId) => SHOWCASE_LAUNCH_STATEMENTS[statementId].label)
            .join("; ")}.`,
        });
      }
    },
    { when: buildWellTypedInputsPredicate(LaunchStatementRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = TeamHandleRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      // ⚠️ ONE PERSON, ONE ROW. The detail page keys team members by handle, so two rows with the
      // same handle would collide there rather than failing here.
      const seenHandles = new Set<string>();
      refinementInputs.data.team.forEach((teamMember, teamMemberIndex) => {
        const normalizedHandle = teamMember.handle.toLowerCase();
        if (normalizedHandle === "") return;
        if (seenHandles.has(normalizedHandle)) {
          context.addIssue({
            code: "custom",
            path: ["team", teamMemberIndex, "handle"],
            message: "This handle is already on the team. Each person appears once.",
          });
        }
        seenHandles.add(normalizedHandle);
      });
    },
    { when: buildWellTypedInputsPredicate(TeamHandleRefinementInputsSchema) },
  )
  .superRefine(
    (draft, context) => {
      const refinementInputs = LaunchDateRefinementInputsSchema.safeParse(draft);
      if (!refinementInputs.success) return;

      /**
       * ⚠️ `Date.now()` LIVES INSIDE THIS REFINE AND NOWHERE AT MODULE OR RENDER SCOPE. A refine runs
       * only when a submission is parsed, on a click; a clock read during a server prerender is a
       * build error under `cacheComponents`. The feed sorts on `launchedAt`, so a future date would
       * pin a launch to the top of it.
       */
      const launchedAtMs = Date.parse(refinementInputs.data.launchedAt);
      if (!Number.isNaN(launchedAtMs) && launchedAtMs > Date.now()) {
        context.addIssue({
          code: "custom",
          path: ["launchedAt"],
          message: "A launch date can't be in the future. Pick the day it went out.",
        });
      }
    },
    { when: buildWellTypedInputsPredicate(LaunchDateRefinementInputsSchema) },
  );
export type ShowcaseSubmissionDraft = z.infer<typeof ShowcaseSubmissionDraftSchema>;

/**
 * WHAT COMES BACK FROM POSTING, a receipt and not a row. No slug and no public URL, for the reason
 * `TeardownSubmissionReceiptSchema` gives: neither exists until a moderator publishes it.
 */
export const ShowcaseSubmissionReceiptSchema = z
  .object({
    submissionId: z.string(),
    moderationState: z.literal("pending_review"),
    /** ISO 8601, server-stamped. When the launch was accepted, not when it was decided. */
    receivedAt: z.string(),
  })
  .strip();
export type ShowcaseSubmissionReceipt = z.infer<typeof ShowcaseSubmissionReceiptSchema>;

/**
 * One row in `/studio/launches`, the maker's own view of something they posted.
 *
 * `headingImageUrl` is what the published launch calls `thumbnailUrl`: the square heading image,
 * once the server has stored it. `moderatorNote` is non-null exactly when the state is `rejected`,
 * and a published row carries its public slug; the refinement checks both, as the teardown row does.
 */
export const ShowcaseSubmissionSchema = z
  .object({
    submissionId: z.string(),
    title: z.string(),
    tagline: z.string(),
    headingImageUrl: createHttpsOrSiteRelativeUrlSchema(2048),
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
        message: "A rejected launch must carry the reason it was rejected.",
      });
    }
    if (submission.moderationState === "published" && submission.publicSlug === null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A published launch has a public address; without one it is not published.",
      });
    }
  });
export type ShowcaseSubmission = z.infer<typeof ShowcaseSubmissionSchema>;
