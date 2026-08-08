// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for cofounder matching: `GET /store/cofounder-profiles`,
// `GET /store/cofounder-profiles/:profileSlug` and `POST /commerce/cofounder-profiles`.
//
// NO BACKEND EXISTS. A25 lists `find-cofounder` alongside `business-forum` as "not commerce and has
// no backend anywhere". This is a proposed contract.
//
// ─────────────────────────────────────────────────────────────────────────────
// THREE RULES THAT ARE NOT NEGOTIABLE ON THIS SURFACE, and every one of them is about a sentence the
// UI must be unable to write. They mirror the programme-contribution rule in CLAUDE.md, and the
// reason is the same: this platform has no money rail, so any copy implying one is a lie with a
// financial shape.
//
//  1. A STATED CAPITAL RANGE IS SELF-REPORTED AND UNVERIFIED. Nobody checked. `capitalRange` is what
//     a person typed about themselves, so no copy anywhere may say "committed", "funded", "raised",
//     "escrowed" or "available" — and the card must label the figure as declared, in the row, not in
//     a tooltip. A number that looks audited is worse than no number.
//
//  2. A PROFILE IS NOT AN OFFER AND QATOTO IS NOT A BROKER. Listing yourself is not soliciting
//     investment and reading a profile is not receiving advice. There is no "invest" affordance, no
//     "matched" language, and no ranking that could read as a recommendation.
//
//  3. THIS IS NOT EQUITY. Nothing on this surface mints, holds, transfers or records a stake.
//     `equityExpectationBasisPoints` IS AN ASK — the number someone hopes to negotiate towards — and
//     is rendered as an expectation, never as an allocation or a holding.
// ─────────────────────────────────────────────────────────────────────────────

import { z } from "zod";

import { cursorPageOf, IsoDateTimeSchema } from "@/lib/store/shared.schemas";

// --- Wire enums -------------------------------------------------------------

/**
 * What this person brings.
 *
 * THE FOUR ARE DELIBERATELY NOT INTERCHANGEABLE, and the filter exists because they are the thing a
 * founder is actually short of. `capital` is money. `expertise` is a domain somebody has already
 * done. `influence` is reach — distribution, an audience, a room you cannot get into. `operations`
 * is the person who runs the thing day to day.
 *
 * Someone may claim several, and claiming all four is a signal in itself.
 */
export const COFOUNDER_CONTRIBUTION_KINDS = [
  "capital",
  "expertise",
  "influence",
  "operations",
] as const;

export type CofounderContributionKind = (typeof COFOUNDER_CONTRIBUTION_KINDS)[number];

/** How much of themselves they are offering. `advisory` is hours a month, not a job. */
export const COFOUNDER_COMMITMENT_LEVELS = ["full_time", "part_time", "advisory"] as const;

export type CofounderCommitmentLevel = (typeof COFOUNDER_COMMITMENT_LEVELS)[number];

/**
 * Whether they want to hear from you right now.
 *
 * `not_looking` STAYS VISIBLE rather than being filtered out of the directory, because a profile is
 * also a record — and hiding it would make a person who is mid-conversation look as though they had
 * left. The row says so and offers no contact affordance.
 */
export const COFOUNDER_ENGAGEMENT_STATES = [
  "open_to_intros",
  "in_conversation",
  "not_looking",
] as const;

export type CofounderEngagementState = (typeof COFOUNDER_ENGAGEMENT_STATES)[number];

/**
 * A profile's own lifecycle.
 *
 * `POST` ANSWERS `draft`. Publishing is a separate act behind moderation, the same shape as a service
 * offering and a forum thread. Public reads only ever return `published`.
 */
export const COFOUNDER_PROFILE_STATES = [
  "draft",
  "pending_review",
  "published",
  "withdrawn",
] as const;

export type CofounderProfileState = (typeof COFOUNDER_PROFILE_STATES)[number];

/**
 * How far identity checking has gone.
 *
 * TWO STATES, AND `identity_verified` MEANS ONLY THAT THIS PERSON IS WHO THEY SAY THEY ARE. It says
 * nothing whatever about their capital, their track record or their reach — those are all
 * self-reported and none of them is checked by anybody. The label map below spells that out in the
 * string itself, because a bare "Verified" beside a nine-figure capital range would be read as
 * verifying the nine figures.
 */
export const COFOUNDER_IDENTITY_STATES = ["unverified", "identity_verified"] as const;

export type CofounderIdentityState = (typeof COFOUNDER_IDENTITY_STATES)[number];

// --- Money ------------------------------------------------------------------

/**
 * A declared capital range.
 *
 * A RANGE AND NOT A FIGURE, on purpose: nobody writes one number here honestly, and a single number
 * would read as a commitment. Both ends are required together — half a range is not "a floor with no
 * ceiling", it is an unanswerable question — so the whole object is nullable rather than its fields.
 *
 * `null` MEANS THEY DID NOT SAY. It is not zero, and a renderer must show an absence.
 */
export const CofounderCapitalRangeSchema = z
  .object({
    minimumInCents: z.number().int(),
    maximumInCents: z.number().int(),
    currency: z.string(),
  })
  .strip();

// --- Directory --------------------------------------------------------------

export const CofounderProfileCardSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
    /** One line in their own words. Never generated from the enums. */
    headline: z.string(),
    countryCode: z.string(),
    avatarUrl: z.string().nullable(),
    contributionKinds: z.array(z.enum(COFOUNDER_CONTRIBUTION_KINDS)),
    commitmentLevel: z.enum(COFOUNDER_COMMITMENT_LEVELS),
    engagementState: z.enum(COFOUNDER_ENGAGEMENT_STATES),
    identityState: z.enum(COFOUNDER_IDENTITY_STATES),
    /** Self-reported and unverified. See rule 1. `null` when they did not say. */
    capitalRange: CofounderCapitalRangeSchema.nullable(),
    /**
     * The stake they hope to negotiate towards, in basis points (100 bp = 1%).
     *
     * BASIS POINTS AND NOT A FLOAT PERCENTAGE, for the same reason money is integer cents: `0.075`
     * and `7.5` are one careless division apart, and an equity figure off by two orders of magnitude
     * is the worst rendering bug this surface could ship. `null` means they did not say — which is
     * common and entirely reasonable at this stage.
     */
    equityExpectationBasisPoints: z.number().int().nullable(),
    /** Free-text sector labels. Not an enum: the long tail here is the whole point. */
    sectors: z.array(z.string()),
  })
  .strip();

export const CofounderDirectoryPageSchema = cursorPageOf(CofounderProfileCardSchema);

// --- Detail -----------------------------------------------------------------

/**
 * Something they have done before.
 *
 * `outcomeSummary` IS NULLABLE AND STAYS NULLABLE. Plenty of ventures have no tidy outcome, and a
 * renderer that requires one invites people to invent one. An absent outcome renders as absent.
 */
export const CofounderPriorVentureSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    roleLabel: z.string(),
    yearsActiveLabel: z.string(),
    outcomeSummary: z.string().nullable(),
  })
  .strip();

/** `GET /store/cofounder-profiles/:profileSlug`. */
export const CofounderProfileDetailSchema = z
  .object({
    profile: CofounderProfileCardSchema,
    bio: z.string(),
    /** What they want from the other side. Their words, not a form's summary. */
    lookingFor: z.string(),
    priorVentures: z.array(CofounderPriorVentureSchema),
    languages: z.array(z.string()),
    publishedAt: IsoDateTimeSchema,
  })
  .strip();

// --- Filter input -----------------------------------------------------------

/** camelCase keys, snake_case values — see the wire-casing rule in CLAUDE.md. */
export interface ListCofounderProfilesFilter {
  readonly contributionKind?: string;
  readonly commitmentLevel?: string;
  readonly countryCode?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

// --- Write body: POST /commerce/cofounder-profiles --------------------------

/**
 * Your own profile.
 *
 * THE VIEWER POSTS ABOUT THEMSELVES, NOT ABOUT SOMEBODY ELSE. There is no route by which one person
 * lists another, deliberately: a directory of people who did not consent to being in it is a
 * different product with a different legal shape.
 *
 * The capital range is BOTH-OR-NEITHER — the pair is refused half-filled, the same way a service
 * offering's indicative price range is. Optional fields are `?: T` and a blank one is omitted; `0`
 * for a blank capital minimum would publish an offer of nothing, and `0` basis points would publish
 * an expectation of no stake, which nobody means.
 *
 * Requires an `Idempotency-Key`. A retry without one is a duplicate profile of the same person.
 */
export interface CreateCofounderProfileInput {
  readonly headline: string;
  readonly bio: string;
  readonly countryCode: string;
  readonly contributionKinds: readonly CofounderContributionKind[];
  readonly commitmentLevel: CofounderCommitmentLevel;
  readonly capitalRangeMinInCents?: number;
  readonly capitalRangeMaxInCents?: number;
  readonly currency?: string;
  readonly equityExpectationBasisPoints?: number;
  readonly lookingFor?: string;
  readonly sectors?: readonly string[];
}

/**
 * What `POST /commerce/cofounder-profiles` answers with: `201` and the raw row.
 *
 * `state` COMES BACK `draft`. Creating is not publishing — the profile is visible to nobody, and the
 * success screen must not say "live", "listed" or "you are now discoverable".
 */
export const CreatedCofounderProfileSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    state: z.enum(COFOUNDER_PROFILE_STATES),
    headline: z.string(),
    createdAt: IsoDateTimeSchema,
  })
  .strip();

// --- Inferred types ---------------------------------------------------------

export type CofounderCapitalRange = z.infer<typeof CofounderCapitalRangeSchema>;
export type CofounderProfileCard = z.infer<typeof CofounderProfileCardSchema>;
export type CofounderDirectoryPage = z.infer<typeof CofounderDirectoryPageSchema>;
export type CofounderPriorVenture = z.infer<typeof CofounderPriorVentureSchema>;
export type CofounderProfileDetail = z.infer<typeof CofounderProfileDetailSchema>;
export type CreatedCofounderProfile = z.infer<typeof CreatedCofounderProfileSchema>;

// --- Display maps -----------------------------------------------------------

export const COFOUNDER_CONTRIBUTION_LABELS: Record<CofounderContributionKind, string> = {
  capital: "Capital",
  expertise: "Expertise",
  influence: "Reach & influence",
  operations: "Operations",
};

/** What each contribution actually means, for the composer's field hints and the index copy. */
export const COFOUNDER_CONTRIBUTION_DESCRIPTIONS: Record<CofounderContributionKind, string> = {
  capital: "Money into the business, on terms you agree between yourselves.",
  expertise: "A domain they have already done — not an interest in it.",
  influence: "Distribution, an audience, or a room you cannot get into on your own.",
  operations: "Running the thing day to day while somebody else builds it.",
};

export const COFOUNDER_COMMITMENT_LABELS: Record<CofounderCommitmentLevel, string> = {
  full_time: "Full time",
  part_time: "Part time",
  advisory: "Advisory — hours a month",
};

export const COFOUNDER_ENGAGEMENT_LABELS: Record<CofounderEngagementState, string> = {
  open_to_intros: "Open to introductions",
  in_conversation: "Already in conversation",
  not_looking: "Not looking right now",
};

/**
 * Copy for the identity state.
 *
 * SAYS WHAT WAS CHECKED AND, IN THE VERIFIED CASE, WHAT WAS NOT. A bare "Verified" next to a declared
 * capital range would be read as verifying the range, which nobody did — see rule 3 in the header.
 */
export const COFOUNDER_IDENTITY_LABELS: Record<CofounderIdentityState, string> = {
  unverified: "Identity not checked",
  identity_verified: "Identity checked — claims below are not",
};

export const COFOUNDER_PROFILE_STATE_LABELS: Record<CofounderProfileState, string> = {
  draft: "Draft — visible only to you",
  pending_review: "Waiting for review",
  published: "Published",
  withdrawn: "Withdrawn",
};
