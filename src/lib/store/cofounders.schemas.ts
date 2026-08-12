// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for cofounder matching: the two public reads under `/store/cofounder-profiles`,
// and the eight writes under `/community/*`. `STORE_BACKEND_STRUCTURE.md` §6.7 and §18.
//
// THE BACKEND SHIPPED THIS (Phase 19, migrations `0104`–`0105`) AND IT SHIPPED THE LIFECYCLE THIS
// FILE FORGOT. As originally specified, `POST` answered `draft`, the public reads returned only
// `published`, and there was no submit route, no `/mine` read and no withdraw — §18.3's finding is
// that a user created a profile nobody could ever see, including themselves. All seven missing
// routes are below. `cofounders.api.ts` is still mock-backed.
//
// THE WRITE PATH MOVED FROM `/commerce` TO `/community` (§1.1), for the same reason the forum's
// did: a cofounder profile is not a commerce object, no organization is required to have one, and
// nothing on this surface may be read as a commercial fact about a party.
//
// AND THE ONE THING THE BACKEND DID NOT BUILD, which changes what this file may send:
//
//   THERE IS NO CAPITAL OR EQUITY COLUMN. `community_cofounder_profile` has no
//   `capital_range_*`, no `currency` and no `equity_expectation_basis_points`, because §14's legal
//   decision is open — publishing what a person will invest, beside a contact affordance, is close
//   to facilitating a securities solicitation and how close is a per-market answer. Phase 19
//   shipped everything else rather than waiting.
//
//   So `capitalRange` and `equityExpectationBasisPoints` STAY ON THE READ SCHEMAS, nullable, and
//   serve `null` today. They are ABSENT FROM EVERY WRITE INPUT, because the create schema is
//   `.strict()` and answers 422 rather than accepting and discarding a figure — silently dropping
//   a number somebody typed about themselves would let them believe it was recorded. Do not add
//   them back to a form.
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
//
//  4. `identity_verified` MEANS ONLY THAT THIS PERSON IS WHO THEY SAY THEY ARE. The backend derives
//     it from the same `requireIdentifiedUser` predicate the category-request write already runs
//     behind — one definition of "identified" on this platform, extracted rather than duplicated
//     (§18.4). It says nothing about their capital, their track record or their reach, none of
//     which anybody checked, which is why the tuple has two values and not a ladder: a third rung
//     would be read as verifying the claims.
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

// --- Write body: POST /community/cofounder-profiles -------------------------

/**
 * Your own profile.
 *
 * THE VIEWER POSTS ABOUT THEMSELVES, NOT ABOUT SOMEBODY ELSE. There is no route by which one person
 * lists another, deliberately: a directory of people who did not consent to being in it is a
 * different product with a different legal shape. No route on this surface takes a `:userId` for
 * the same reason — `/mine` is the only addressing an owner gets.
 *
 * NO CAPITAL AND NO EQUITY FIELD, AND THAT IS NOT AN OVERSIGHT. The four that used to be here —
 * `capitalRangeMinInCents`, `capitalRangeMaxInCents`, `currency`, `equityExpectationBasisPoints` —
 * have no column behind them (§14, and the file header). The backend's create schema is
 * `.strict()` and answers **422** for any of them, which fails the whole write rather than
 * discarding the number. Adding a capital input back to a form breaks profile creation outright.
 *
 * Optional fields are `?: T` and a blank one is OMITTED, never sent as `null`, `""` or `0`.
 *
 * Requires an `Idempotency-Key`. A retry without one is a duplicate profile of the same person —
 * and `userId` is unique server-side, so the retry fails rather than duplicating, which is worse
 * to explain than to prevent.
 */
export interface CreateCofounderProfileInput {
  /**
   * REQUIRED, and it was missing entirely — every create would have been a 422.
   *
   * The person's own name on the directory card. It is not derived from the account: a member's
   * account name is an identity fact and this is a listing they are choosing to publish under.
   */
  readonly displayName: string;
  readonly headline: string;
  readonly bio: string;
  readonly countryCode: string;
  readonly contributionKinds: readonly CofounderContributionKind[];
  readonly commitmentLevel: CofounderCommitmentLevel;
  /** REQUIRED on the wire — `min(8)`. It was optional here, which is a second 422. */
  readonly lookingFor: string;
  readonly sectors?: readonly string[];
  readonly languages?: readonly string[];
  readonly avatarUrl?: string | null;
}

// NO `capitalRange` AND NO `equityExpectationBasisPoints`, AND THEIR ABSENCE IS LOAD-BEARING.
// §14 has not decided whether Qatoto may publish what a person will invest beside a contact
// affordance — it is close to a securities solicitation and how close is a per-market legal
// answer. So the columns deliberately do not exist, `verify-store-phase-19-constraints` asserts
// their ABSENCE as its first check, and the create body is `.strict()`: sending either is a 422
// rather than a value quietly discarded. Do not add them here before that decision lands.

/**
 * What `POST /community/cofounder-profiles` answers with: `201` and the raw row.
 *
 * `state` COMES BACK `draft`. Creating is not publishing — the profile is visible to nobody, and the
 * success screen must not say "live", "listed" or "you are now discoverable".
 */
// THE LIFECYCLE WRITES ALL ANSWER THE OWNED PROFILE, and it is NESTED.
//
// `create`, `PATCH /mine`, `submit`, `withdraw` and the engagement-state route every one return
// `OwnedCofounderProfileProjection` — `{ profile: <card>, bio, lookingFor, priorVentures,
// languages, publishedAt, state, decisionReason, createdAt }`. The flat `id`/`slug`/`headline`
// these schemas used to require live under `profile`, so none of the five parsed.

// --- The owner's own profile ------------------------------------------------
//
// `GET|PATCH /community/cofounder-profiles/mine`, `…/mine/submit`, `…/mine/withdraw`,
// `…/mine/engagement-state` (§6.7, §18.3).
//
// THE LIFECYCLE THE ORIGINAL CONTRACT OMITTED. Without these a `draft` is a write into a hole:
// public reads return `published` only, so its author could never read back what they wrote.

/**
 * The viewer's own profile, in any state.
 *
 * A SUPERSET OF THE CARD, not a different shape — `profile` is the same object the directory
 * projects, so a preview of "how this will look" needs no second renderer. What is added is the
 * things only the owner may see: the state, the moderator's note and the timestamps.
 *
 * `capitalRange` AND `equityExpectationBasisPoints` ARE ON `profile` AND SERVE `null`. The owner
 * cannot set them either — see the file header. Render the absence; do not offer a field.
 */
export const OwnCofounderProfileSchema = z
  .object({
    profile: CofounderProfileCardSchema,
    state: z.enum(COFOUNDER_PROFILE_STATES),
    bio: z.string(),
    lookingFor: z.string(),
    priorVentures: z.array(CofounderPriorVentureSchema),
    languages: z.array(z.string()),
    /**
     * Why a moderator rejected it, or `null`.
     *
     * A REJECTED PROFILE RETURNS TO `draft` so its owner can fix it and submit again — unlike a
     * forum thread, which stays `pending_review` because nobody edits a posted question. The note
     * is what makes the difference actionable.
     */
    decisionReason: z.string().nullable(),
    publishedAt: IsoDateTimeSchema.nullable(),
    // NO `updatedAt`. `OwnedCofounderProfileProjection` does not carry one, and requiring it failed
    // every read and every one of the four lifecycle writes.
    createdAt: IsoDateTimeSchema,
  })
  .strip();

/**
 * `PATCH /community/cofounder-profiles/mine` — edit while `draft` or `withdrawn`.
 *
 * NOT VALID WHILE `published` OR `pending_review`, and that is deliberate rather than an
 * oversight: everything here is content a moderator approved, so changing it after approval must
 * go back through `submit`. The one exception is the engagement state, which has its own route
 * below precisely because it is the edit a published profile may make.
 *
 * Every field optional — this is a patch — and still no capital or equity field (see the header).
 */
export interface UpdateCofounderProfileInput {
  readonly headline?: string;
  readonly bio?: string;
  readonly countryCode?: string;
  readonly contributionKinds?: readonly CofounderContributionKind[];
  readonly commitmentLevel?: CofounderCommitmentLevel;
  readonly lookingFor?: string;
  readonly sectors?: readonly string[];
}

/**
 * `PATCH /community/cofounder-profiles/mine/engagement-state`.
 *
 * ITS OWN ROUTE, NOT A FIELD ON THE PATCH ABOVE. It is the one edit a `published` profile may make
 * without re-entering moderation: "I am mid-conversation" is a fact about availability, not
 * content somebody approved.
 *
 * Moving to `not_looking` DOES NOT REMOVE THE PROFILE from the directory. A profile is also a
 * record, and hiding it makes a person who is mid-conversation look as though they had left. The
 * row says so and offers no contact affordance.
 */
export interface UpdateCofounderEngagementStateInput {
  readonly engagementState: CofounderEngagementState;
}

/** What `submit`, `withdraw` and the engagement-state patch all answer with. */
// SUBMIT, WITHDRAW AND THE ENGAGEMENT-STATE ROUTE ALL ANSWER THE OWNED PROFILE.
//
// This described a flat `{id, slug, state, engagementState, updatedAt}` summary. All three routes
// return `OwnedCofounderProfileProjection` instead, where `id`, `slug` and `engagementState` live
// under `profile` and `updatedAt` does not exist at all — so none of the three parsed. Returning
// the whole profile is also the better shape: a state change that answers with the full row means
// the page after it cannot disagree with the page before.
export const CofounderProfileStateChangeSchema = OwnCofounderProfileSchema;

// `POST /community/cofounder-profiles` answers the same owned projection as everything else in the
// lifecycle. It comes back `state: "draft"` — creating is not publishing, the profile is visible to
// nobody, and the success screen must not say "live", "listed" or "you are now discoverable".
export const CreatedCofounderProfileSchema = OwnCofounderProfileSchema;

// --- Moderation, gated by `moderate_content` --------------------------------
//
// `GET /community/admin/cofounder-profiles`,
// `POST /community/admin/cofounder-profiles/:profileId/moderate` (§6.7).

export const AdminCofounderProfileSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    displayName: z.string(),
    headline: z.string(),
    bio: z.string(),
    lookingFor: z.string(),
    countryCode: z.string(),
    state: z.enum(COFOUNDER_PROFILE_STATES),
    identityState: z.enum(COFOUNDER_IDENTITY_STATES),
    contributionKinds: z.array(z.enum(COFOUNDER_CONTRIBUTION_KINDS)),
    commitmentLevel: z.enum(COFOUNDER_COMMITMENT_LEVELS),
    sectors: z.array(z.string()),
    priorVentures: z.array(CofounderPriorVentureSchema),
    submittedAt: IsoDateTimeSchema,
  })
  .strip();

export const AdminCofounderProfileQueuePageSchema = cursorPageOf(AdminCofounderProfileSchema);

export interface ListAdminCofounderProfilesFilter {
  readonly state?: CofounderProfileState;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `POST /community/admin/cofounder-profiles/:profileId/moderate`.
 *
 * A discriminated union, `note` required only on `reject`. Rejecting returns the profile to
 * `draft` with the note attached, so its owner can act on it rather than guess.
 */
/**
 * `reasonNote`, REQUIRED ON BOTH ARMS. This was `note` and optional on `publish` — two 422s against
 * a `.strict()` body that demands `{ decision, reasonNote }`.
 *
 * A rejection sends the profile back to `draft` so its owner can fix and resubmit, which is why the
 * note matters more here than on a forum thread: it is the instruction, not just the record.
 */
export type ModerateCofounderProfileInput =
  | { readonly decision: "publish"; readonly reasonNote: string }
  | { readonly decision: "reject"; readonly reasonNote: string };

// --- Inferred types ---------------------------------------------------------

export type CofounderCapitalRange = z.infer<typeof CofounderCapitalRangeSchema>;
export type CofounderProfileCard = z.infer<typeof CofounderProfileCardSchema>;
export type CofounderDirectoryPage = z.infer<typeof CofounderDirectoryPageSchema>;
export type CofounderPriorVenture = z.infer<typeof CofounderPriorVentureSchema>;
export type CofounderProfileDetail = z.infer<typeof CofounderProfileDetailSchema>;
export type CreatedCofounderProfile = z.infer<typeof CreatedCofounderProfileSchema>;
export type OwnCofounderProfile = z.infer<typeof OwnCofounderProfileSchema>;
export type CofounderProfileStateChange = z.infer<typeof CofounderProfileStateChangeSchema>;
export type AdminCofounderProfile = z.infer<typeof AdminCofounderProfileSchema>;
export type AdminCofounderProfileQueuePage = z.infer<typeof AdminCofounderProfileQueuePageSchema>;

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
