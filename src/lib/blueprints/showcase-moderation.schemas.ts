// TRANSPORT: props-only — pure contract, no network of its own.
//
// THE MODERATOR SIDE OF SHOWCASE LAUNCHES: what the review queue reads and what a decision sends. The
// maker-side sibling is `showcase-authoring.schemas.ts`; the public read is `ShowcaseBlueprintSchema`
// in `@/lib/blueprints/schemas`.
//
// ⚠️ A SEPARATE FILE, on the case-study precedent. A review item is a launch nobody but its maker and
// a moderator may see, so nothing under `src/components/home` or `src/components/studio` imports this,
// and `rg "showcase-moderation" src/components/home src/components/studio` must print nothing.
//
// `.strip()` ON WHAT COMES BACK, `.strict()` ON THE DECISION THAT GOES OUT.

import { z } from "zod";

import { BLUEPRINT_DIFFICULTIES, BlueprintWriteUpImageSchema } from "@/lib/blueprints/schemas";
import { SHOWCASE_LAUNCH_STATEMENT_IDS } from "@/lib/blueprints/showcase-authoring.schemas";
import { createHttpsOrSiteRelativeUrlSchema } from "@/lib/blueprints/url-source.schemas";
import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One person on the launch, as the maker typed them.
 *
 * NOT `BlueprintTeamMemberSchema`, which requires an avatar: nobody on a submitted launch has one,
 * because handles are free text and are not linked to accounts.
 */
const ShowcaseModerationTeamMemberSchema = z
  .object({ displayName: z.string(), handle: z.string(), role: z.string() })
  .strip();

/** One launch waiting in `/admin/showcase-launches`, with everything the maker sent. */
export const ShowcaseReviewItemSchema = z
  .object({
    submissionId: z.string(),
    submittedAt: IsoDateTimeSchema,
    /**
     * Who posted it. `handle` is NULLABLE because an account's handle is, and a queue that refused
     * every launch from an account without one would be a queue nobody could clear.
     */
    author: z.object({ displayName: z.string(), handle: z.string().nullable() }).strip(),
    /** What the maker vouched for, so a moderator can hold the launch to it. */
    acceptedLaunchStatementIds: z.array(z.enum(SHOWCASE_LAUNCH_STATEMENT_IDS)),
    title: z.string(),
    tagline: z.string(),
    summary: z.string(),
    writeUp: z.string().nullable(),
    writeUpImages: z.array(BlueprintWriteUpImageSchema),
    headingImageUrl: createHttpsOrSiteRelativeUrlSchema(2048),
    launchedAt: IsoDateTimeSchema,
    difficulty: z.enum(BLUEPRINT_DIFFICULTIES),
    billOfMaterialsCostRange: z
      .object({
        minimumInCents: z.number().int().nonnegative(),
        maximumInCents: z.number().int().nonnegative(),
        currency: z.string(),
      })
      .strip()
      .nullable(),
    tags: z.array(z.string()),
    team: z.array(ShowcaseModerationTeamMemberSchema),
    builtFromBlueprintSlug: z.string().nullable(),
    callToAction: z.object({ label: z.string(), url: z.string() }).strip().nullable(),
  })
  .strip();
export type ShowcaseReviewItem = z.infer<typeof ShowcaseReviewItemSchema>;

/** `GET /blueprints/admin/showcases/review-queue`, oldest first. */
export const ShowcaseReviewQueuePageSchema = cursorPageOf(ShowcaseReviewItemSchema);
export type ShowcaseReviewQueuePage = z.infer<typeof ShowcaseReviewQueuePageSchema>;

export const SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS = 2000;

const MODERATOR_NOTE_TOO_LONG_MESSAGE = `Keep the note under ${SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS.toLocaleString("en-US")} characters.`;

/**
 * `POST /blueprints/admin/showcases/:submissionId/moderate` — the decision a moderator sends.
 *
 * ⚠️ A SEND-BACK MUST SAY WHY. The note is the only thing the maker sees. Publishing may carry a note
 * or none, and the key is present on both arms.
 */
export const ShowcaseModerationDecisionSchema = z.discriminatedUnion("decision", [
  z
    .object({
      decision: z.literal("published"),
      moderatorNote: z
        .string()
        .max(SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE)
        .nullable(),
    })
    .strict(),
  z
    .object({
      decision: z.literal("rejected"),
      moderatorNote: z
        .string()
        .min(1, "Sending back needs a note. It is the only thing the maker sees.")
        .max(SHOWCASE_MODERATOR_NOTE_MAXIMUM_CHARACTERS, MODERATOR_NOTE_TOO_LONG_MESSAGE),
    })
    .strict(),
]);
export type ShowcaseModerationDecision = z.infer<typeof ShowcaseModerationDecisionSchema>;

/** What a decision answers with. A published launch has its public address; a rejected one none. */
export const ShowcaseModerationResultSchema = z
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
        message: "A published launch has a public address; without one it is not published.",
      });
    }
    if (result.moderationState === "rejected" && result.publicSlug !== null) {
      context.addIssue({
        code: "custom",
        path: ["publicSlug"],
        message: "A launch that was sent back has no public address.",
      });
    }
  });
export type ShowcaseModerationResult = z.infer<typeof ShowcaseModerationResultSchema>;
