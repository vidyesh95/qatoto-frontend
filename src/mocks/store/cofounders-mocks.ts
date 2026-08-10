// TRANSPORT: props-only — static fixtures, no network.
//
// TEMPORARY. Deleted when `cofounders.api.ts` swaps `resolveMockRead` for `getJson`.
//
// EVERY FIXTURE IS EXPLICITLY ANNOTATED, never `satisfies`. `resolveMockRead` then parses each one
// through the real schema at runtime, which catches what types cannot.
//
// THESE ARE INVENTED PEOPLE. Not a single name or venture here belongs to anybody real. That has
// to be true of a fixture set on this surface in a way it does not for a fixture set of factories:
// a plausible person with a plausible nine-figure range is exactly the thing somebody screenshots.
//
// EVERY `capitalRange` AND EVERY `equityExpectationBasisPoints` IN THIS FILE IS `null`, AND THAT
// IS THE CONTRACT RATHER THAN A THIN FIXTURE SET. Phase 19 shipped this surface WITHOUT those
// columns: `community_cofounder_profile` has no `capital_range_*`, no `currency` and no
// `equity_expectation_basis_points`, because §14's legal question — whether publishing what a
// person will invest, beside a contact affordance, is close to facilitating a securities
// solicitation — is open per market. Both fields stay on the wire, nullable, and serve `null`
// unconditionally.
//
// So a fixture carrying a figure would model a response the backend CANNOT PRODUCE, which is the
// same rule that keeps `pending_review` out of the forum's public list fixtures. These rows used
// to carry ranges; they were nulled when the backend shipped, not thinned out. If §14 lands, the
// columns arrive in one additive migration and the figures come back here with it.
//
// WHAT THIS SET COVERS, chosen so the branches that would otherwise ship unseen are reachable:
//
//   · every profile with NO capital range and NO equity expectation, which is what the surface
//     actually serves — the renderer must show an absence, never a zero, and `null` is "they did
//     not say" rather than "they will put in nothing";
//   · all three engagement states, including `not_looking`, which stays in the directory and offers
//     no contact affordance;
//   · both identity states, so "Identity not checked" is seen rather than assumed;
//   · a prior venture with `outcomeSummary: null`, because plenty of ventures have no tidy ending
//     and a renderer that demands one invites people to invent one;
//   · a profile with an EMPTY `priorVentures` list, which is the honest state for a first-timer.

import type {
  CofounderDirectoryPage,
  CofounderProfileCard,
  CofounderProfileDetail,
  CofounderProfileStateChange,
  CreatedCofounderProfile,
  OwnCofounderProfile,
} from "@/lib/store/cofounders.schemas";

// --- Cards ------------------------------------------------------------------

/** Capital + expertise, with a stated range and a stated ask. The fully-populated row. */
const NADIA_OKONKWO: CofounderProfileCard = {
  id: "cfp_nadia_okonkwo",
  slug: "nadia-okonkwo",
  displayName: "Nadia Okonkwo",
  headline: "Cheque plus fifteen years of cold-chain operations in West Africa.",
  countryCode: "NG",
  avatarUrl: null,
  contributionKinds: ["capital", "expertise", "operations"],
  commitmentLevel: "part_time",
  engagementState: "open_to_intros",
  identityState: "identity_verified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Cold chain", "Agriculture", "Logistics"],
};

/**
 * The `null` capital range AND the `null` equity ask.
 *
 * She brings reach, not money, and has not decided what stake she wants. Both blanks are real
 * answers and must render as absences — a zero in either field would say something she never said.
 */
const MEI_LIN_CHAU: CofounderProfileCard = {
  id: "cfp_mei_lin_chau",
  slug: "mei-lin-chau",
  displayName: "Mei-Lin Chau",
  headline: "Built a 400k-subscriber home-goods channel. I can put a product in front of them.",
  countryCode: "SG",
  avatarUrl: null,
  contributionKinds: ["influence"],
  commitmentLevel: "advisory",
  engagementState: "open_to_intros",
  identityState: "identity_verified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Home goods", "Consumer brands"],
};

/** Unverified identity, full-time, no money. The row that must not look second-class or verified. */
const TOMASZ_WIERZBICKI: CofounderProfileCard = {
  id: "cfp_tomasz_wierzbicki",
  slug: "tomasz-wierzbicki",
  displayName: "Tomasz Wierzbicki",
  headline: "Manufacturing engineer. I will move to wherever the factory is.",
  countryCode: "PL",
  avatarUrl: null,
  contributionKinds: ["expertise", "operations"],
  commitmentLevel: "full_time",
  engagementState: "open_to_intros",
  identityState: "unverified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Industrial", "Injection moulding"],
};

/** Mid-conversation. Stays in the directory, with no way to contact them — see the enum's comment. */
const RAFAEL_SANTOS: CofounderProfileCard = {
  id: "cfp_rafael_santos",
  slug: "rafael-santos",
  displayName: "Rafael Santos",
  headline: "Ran customs and trade compliance for a mid-size importer for nine years.",
  countryCode: "BR",
  avatarUrl: null,
  contributionKinds: ["expertise"],
  commitmentLevel: "part_time",
  engagementState: "in_conversation",
  identityState: "identity_verified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Trade compliance", "Import/export"],
};

/** Not looking. Same reasoning as above, one step further. */
const SOFIA_LINDQVIST: CofounderProfileCard = {
  id: "cfp_sofia_lindqvist",
  slug: "sofia-lindqvist",
  displayName: "Sofia Lindqvist",
  headline: "Angel cheques into physical-product businesses. Currently committed elsewhere.",
  countryCode: "SE",
  avatarUrl: null,
  contributionKinds: ["capital"],
  commitmentLevel: "advisory",
  engagementState: "not_looking",
  identityState: "identity_verified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Consumer hardware", "Packaging"],
};

const AMARA_DIALLO: CofounderProfileCard = {
  id: "cfp_amara_diallo",
  slug: "amara-diallo",
  displayName: "Amara Diallo",
  headline: "First-time founder looking for a technical partner. I handle everything else.",
  countryCode: "SN",
  avatarUrl: null,
  contributionKinds: ["operations", "influence"],
  commitmentLevel: "full_time",
  engagementState: "open_to_intros",
  identityState: "unverified",
  capitalRange: null,
  equityExpectationBasisPoints: null,
  sectors: ["Textiles", "Retail"],
};

// --- Directory pages --------------------------------------------------------

export const MOCK_COFOUNDER_DIRECTORY_PAGE: CofounderDirectoryPage = {
  items: [
    NADIA_OKONKWO,
    MEI_LIN_CHAU,
    TOMASZ_WIERZBICKI,
    AMARA_DIALLO,
    RAFAEL_SANTOS,
    SOFIA_LINDQVIST,
  ],
  page: { nextCursor: null, hasMore: false },
};

/** Point `listCofounderProfiles` at this to reach `StoreEmptyPanel`. */
export const MOCK_COFOUNDER_DIRECTORY_PAGE_EMPTY: CofounderDirectoryPage = {
  items: [],
  page: { nextCursor: null, hasMore: false },
};

export const MOCK_FEATURED_COFOUNDER_SLUGS: readonly string[] =
  MOCK_COFOUNDER_DIRECTORY_PAGE.items.map((profile) => profile.slug);

// --- Details ----------------------------------------------------------------

const NADIA_DETAIL: CofounderProfileDetail = {
  profile: NADIA_OKONKWO,
  bio: "Fifteen years building and running refrigerated distribution across Lagos, Accra and Abidjan. I know what breaks, which is almost never the equipment.\n\nI am looking for a product business that needs cold chain to work and does not yet have anyone who has done it. I will put money in and I will be in the warehouse.",
  lookingFor:
    "A founder who has the demand side figured out and is honest about what they do not know operationally. I do not want to be the only adult in the room.",
  priorVentures: [
    {
      id: "ven_nadia_coldlink",
      name: "ColdLink Distribution",
      roleLabel: "Co-founder & COO",
      yearsActiveLabel: "2014–2021",
      outcomeSummary: "Acquired by a regional logistics group.",
    },
    {
      id: "ven_nadia_freshroute",
      name: "FreshRoute",
      roleLabel: "Operating partner",
      yearsActiveLabel: "2022–present",
      // NO TIDY OUTCOME. Still running, and forcing a summary here would invite invention.
      outcomeSummary: null,
    },
  ],
  languages: ["English", "Igbo", "French"],
  publishedAt: "2026-05-14T10:00:00.000Z",
};

const MEI_LIN_DETAIL: CofounderProfileDetail = {
  profile: MEI_LIN_CHAU,
  bio: "I have spent six years building an audience that trusts me on home goods. That trust is the asset and it is spendable exactly once per product, so I am careful about what I attach it to.\n\nI am not an operator and I will not pretend to be one. What I can do is take a product that is genuinely good and make its first ten thousand customers appear.",
  lookingFor:
    "Somebody who has already made the thing and can make more of it. I am useless at the part before there is a product.",
  priorVentures: [
    {
      id: "ven_mei_channel",
      name: "The Ordinary Kitchen",
      roleLabel: "Founder",
      yearsActiveLabel: "2020–present",
      outcomeSummary: null,
    },
  ],
  languages: ["English", "Mandarin", "Hokkien"],
  publishedAt: "2026-06-02T08:30:00.000Z",
};

const TOMASZ_DETAIL: CofounderProfileDetail = {
  profile: TOMASZ_WIERZBICKI,
  bio: "Twelve years in injection moulding, the last five running a tool room. I can take a drawing to a validated mould and I can tell you in an afternoon whether a part is manufacturable at your target price.\n\nNo money to put in. Time and a skill, full time, for a real stake.",
  lookingFor:
    "A product business at the point where the design stops being a rendering. Willing to relocate — I would rather be at the factory than on a call about it.",
  priorVentures: [],
  languages: ["Polish", "English", "German"],
  publishedAt: "2026-07-21T15:45:00.000Z",
};

const RAFAEL_DETAIL: CofounderProfileDetail = {
  profile: RAFAEL_SANTOS,
  bio: "Nine years owning customs and trade compliance for an importer doing about 40 containers a month. Classification, valuation, preferential origin, the arguments with brokers.\n\nCurrently talking to one team, so I am slow to reply, but the profile stays up.",
  lookingFor:
    "A business importing at enough volume that getting classification wrong actually costs something.",
  priorVentures: [
    {
      id: "ven_rafael_importer",
      name: "Grupo Pontal",
      roleLabel: "Head of trade compliance",
      yearsActiveLabel: "2016–2025",
      outcomeSummary: "Left when the group consolidated its compliance function.",
    },
  ],
  languages: ["Portuguese", "Spanish", "English"],
  publishedAt: "2026-04-08T12:15:00.000Z",
};

const SOFIA_DETAIL: CofounderProfileDetail = {
  profile: SOFIA_LINDQVIST,
  bio: "I write angel cheques into physical-product businesses, usually pre-revenue, usually where somebody has already made one by hand.\n\nMy capacity is committed for now. Leaving this up so people know I exist for later.",
  lookingFor: "Not taking introductions at the moment. Worth checking back after the new year.",
  priorVentures: [
    {
      id: "ven_sofia_angel",
      name: "Independent angel investing",
      roleLabel: "Angel",
      yearsActiveLabel: "2018–present",
      outcomeSummary: null,
    },
  ],
  languages: ["Swedish", "English"],
  publishedAt: "2026-03-19T09:00:00.000Z",
};

const AMARA_DETAIL: CofounderProfileDetail = {
  profile: AMARA_DIALLO,
  bio: "I have the customers, the storefront and the supplier relationships. What I do not have is anybody who can build the production side properly, and I have learned the hard way that I cannot do it by reading.\n\nSmall amount of my own money in, and I am full time on this already.",
  lookingFor:
    "Somebody technical who wants to own the making. I will not micromanage it — that is the whole point of finding you.",
  priorVentures: [
    {
      id: "ven_amara_market",
      name: "Teranga Textiles",
      roleLabel: "Founder",
      yearsActiveLabel: "2023–present",
      outcomeSummary: null,
    },
  ],
  languages: ["French", "Wolof", "English"],
  publishedAt: "2026-07-30T11:20:00.000Z",
};

export const MOCK_COFOUNDER_DETAILS_BY_SLUG: Readonly<Record<string, CofounderProfileDetail>> = {
  "nadia-okonkwo": NADIA_DETAIL,
  "mei-lin-chau": MEI_LIN_DETAIL,
  "tomasz-wierzbicki": TOMASZ_DETAIL,
  "rafael-santos": RAFAEL_DETAIL,
  "sofia-lindqvist": SOFIA_DETAIL,
  "amara-diallo": AMARA_DETAIL,
};

// --- Write response ---------------------------------------------------------

/**
 * What the mocked `POST /community/cofounder-profiles` answers with.
 *
 * `state: "draft"` — creating a profile does not publish it and does not make anybody discoverable.
 * A fixed row rather than an echo, so the success screen cannot link to a slug that resolves to
 * nothing.
 */
export const MOCK_CREATED_COFOUNDER_PROFILE: CreatedCofounderProfile = {
  id: "cfp_01JQZ6T4P9W2N5MD",
  slug: "your-draft-profile",
  state: "draft",
  headline: "Your profile",
  createdAt: "2026-08-08T09:26:00.000Z",
};

// --- The owner's own profile ------------------------------------------------

/**
 * `GET /community/cofounder-profiles/mine`.
 *
 * `state: "draft"` WITH A `moderationNote` — the rejected case, which is the one worth modelling
 * because it is the only state where the owner has something to act on. A cofounder profile
 * returns to `draft` when a moderator rejects it, unlike a forum thread, which stays
 * `pending_review`: nobody edits a posted question, everybody edits their own profile.
 *
 * `publishedAt` IS `null` HERE AND STAYS NULL until a moderator publishes. A renderer that treats
 * a non-null `publishedAt` as "this was live once" is right; treating `null` as "brand new" is
 * not — this profile has been submitted and turned down.
 */
export const MOCK_OWN_COFOUNDER_PROFILE: OwnCofounderProfile = {
  profile: {
    id: "cfp_own_viewer",
    slug: "your-draft-profile",
    displayName: "Priya Raman",
    headline: "Operator who has run a factory floor, looking for the person with the product",
    countryCode: "IN",
    avatarUrl: null,
    contributionKinds: ["operations", "expertise"],
    commitmentLevel: "full_time",
    engagementState: "open_to_intros",
    identityState: "identity_verified",
    // `null` because there is no column, not because this person declined to answer. See header.
    capitalRange: null,
    equityExpectationBasisPoints: null,
    sectors: ["Consumer hardware", "Contract manufacturing"],
  },
  state: "draft",
  bio: "Eleven years in production management, the last four running a 200-person plant making small appliances. I have hired, fired, retooled a line mid-quarter and shipped through two port strikes.\n\nWhat I do not have is a product I believe in. That is the half I am looking for.",
  lookingFor:
    "Somebody with a product and demand who does not want to learn manufacturing the expensive way.",
  priorVentures: [
    {
      id: "ven_own_plantworks",
      name: "Plantworks Appliances",
      roleLabel: "Head of production",
      yearsActiveLabel: "2022–present",
      outcomeSummary: null,
    },
  ],
  languages: ["English", "Tamil", "Hindi"],
  moderationNote:
    "The headline reads as an advertisement for a service rather than a description of a person. Rewrite it in the first person about what you have done, and resubmit — everything else is fine.",
  publishedAt: null,
  updatedAt: "2026-08-06T14:12:00.000Z",
  createdAt: "2026-08-03T09:40:00.000Z",
};

/**
 * What `submit`, `withdraw` and the engagement-state patch answer with.
 *
 * ONE FIXTURE FOR THREE ROUTES, which is honest about how little a mock can say here: the wire
 * shape is identical and only the values differ per route. This is also the limit of the mock
 * transport — the state does not actually advance on a click, because every call re-resolves the
 * same constant.
 */
export const MOCK_COFOUNDER_PROFILE_STATE_CHANGE: CofounderProfileStateChange = {
  id: "cfp_own_viewer",
  slug: "your-draft-profile",
  state: "pending_review",
  engagementState: "open_to_intros",
  updatedAt: "2026-08-09T12:30:00.000Z",
};
