// TRANSPORT: props-only — pure contract, no network of its own.
//
// Client-side contract for the Blueprints hub: engineering teardowns, working prototypes and
// commercialization case studies. NOTHING BEHIND IT IS REAL YET — `@/lib/blueprints/api` serves
// fixtures from `@/mocks/blueprints-mocks` — but the shapes below are written as if the payload
// arrived over the wire, because one day it will and the swap should touch one file.
//
// Every object ends `.strip()` so a backend minor release that adds a field is a no-op here
// rather than a parse failure (CLAUDE.md Pattern 2). Note the house-documented failure mode of
// `.strip()` before relying on it for a WRITE path: `src/lib/products/schemas.ts:98-107` records
// how a stripped field silently destroyed sellers' declared lead times on every edit. These are
// read shapes only, so that trap does not apply.

import { z } from "zod";

import {
  createExternalHttpsUrlSchema,
  createHttpsOrSiteRelativeUrlSchema,
} from "@/lib/blueprints/url-source.schemas";

// --- Enum tuples -------------------------------------------------------------
//
// SNAKE_CASE, NOT KEBAB, and this is not a style preference. Enum values are data that must
// byte-match a Postgres `pgEnum` label in both directions — `z.enum(["case_study"])` rejects
// `"case-study"`, and `?category=case-study` would be a 422 from a `.strict()` query schema
// rather than an ignored value. Kebab-case governs FILE NAMES, DIRECTORIES, PATH SEGMENTS and
// SLUGS; `/blueprints/solar-cold-storage-teardown` is kebab and `category=case_study` is snake,
// and both are correct at the same time. See CLAUDE.md, "Naming — wire casing".

/**
 * The 70/20/10 content split the hub is organised around.
 *
 * - `teardown` (70%) — PCB schematics, CAD breakdowns, BOM costs, tolerances, reverse engineering.
 * - `showcase` (20%) — working proof-of-concept demos and finished builds from those blueprints.
 * - `case_study` (10%) — go-to-market metrics, manufacturing volume stories, unit economics.
 */
export const BLUEPRINT_CATEGORIES = ["teardown", "showcase", "case_study"] as const;
export const BlueprintCategorySchema = z.enum(BLUEPRINT_CATEGORIES);
export type BlueprintCategory = z.infer<typeof BlueprintCategorySchema>;

export const BLUEPRINT_CATEGORY_LABELS: Record<BlueprintCategory, string> = {
  teardown: "Teardown",
  showcase: "Showcase",
  case_study: "Case study",
};

/** One-line framing for each rail heading. Kept beside the labels so the two never drift. */
export const BLUEPRINT_CATEGORY_BLURBS: Record<BlueprintCategory, string> = {
  teardown: "Schematics, CAD breakdowns and bills of materials, pulled apart part by part.",
  showcase: "Working prototypes and finished builds, made from the blueprints above.",
  case_study: "What happened after the build — volumes, unit economics, go-to-market.",
};

/**
 * The PATH SEGMENT each category lives under. Kebab, and two of the three are PLURAL while the
 * enum label is singular — which is why the reverse map below is written out rather than derived
 * with `replaceAll("-", "_")`. String munging is wrong for two of these three.
 *
 * Extends the casing note above: `case_study` is the wire value and `case-studies` is the URL,
 * and both are correct at the same time.
 */
export const BLUEPRINT_CATEGORY_SEGMENTS: Record<BlueprintCategory, string> = {
  teardown: "teardowns",
  showcase: "showcase",
  case_study: "case-studies",
};

/** The segments a blueprint slug may NOT take, because a static route already owns them. */
export const RESERVED_BLUEPRINT_SLUGS: readonly string[] = Object.values(
  BLUEPRINT_CATEGORY_SEGMENTS,
);

export const BLUEPRINT_CATEGORY_BY_SEGMENT: Record<string, BlueprintCategory> = {
  teardowns: "teardown",
  showcase: "showcase",
  "case-studies": "case_study",
};

/**
 * THE ONLY PLACE A BLUEPRINT URL IS BUILT.
 *
 * Every card, rail and back-link goes through this. The flat `/blueprints/<slug>` shape these
 * URLs used to have still resolves — `[slug]/page.tsx` permanently redirects it — but nothing
 * should mint one, and a single function is what makes that checkable with a grep.
 */
export function buildBlueprintHref(blueprint: {
  readonly category: BlueprintCategory;
  readonly slug: string;
}): string {
  return `/blueprints/${BLUEPRINT_CATEGORY_SEGMENTS[blueprint.category]}/${blueprint.slug}`;
}

/** The list route for one category. */
export function buildBlueprintCategoryHref(category: BlueprintCategory): string {
  return `/blueprints/${BLUEPRINT_CATEGORY_SEGMENTS[category]}`;
}

/**
 * The axis case studies are colour-coded on — the local equivalent of the Heuristic / Principle /
 * Gestalt split a reference index like lawsofux.com tints its cards by. A manufacturing lesson is
 * about ONE of these, and which one is the first thing a reader scanning the index wants.
 */
export const BLUEPRINT_DISCIPLINES = [
  "tooling",
  "supply_chain",
  "quality",
  "distribution",
  "unit_economics",
] as const;
export const BlueprintDisciplineSchema = z.enum(BLUEPRINT_DISCIPLINES);
export type BlueprintDiscipline = z.infer<typeof BlueprintDisciplineSchema>;

export const BLUEPRINT_DISCIPLINE_LABELS: Record<BlueprintDiscipline, string> = {
  tooling: "Tooling",
  supply_chain: "Supply chain",
  quality: "Quality",
  distribution: "Distribution",
  unit_economics: "Unit economics",
};

/** What kind of file a teardown published. */
export const BLUEPRINT_DOCUMENT_KINDS = [
  "schematic",
  "bill_of_materials",
  "assembly_guide",
  "datasheet",
] as const;
export const BlueprintDocumentKindSchema = z.enum(BLUEPRINT_DOCUMENT_KINDS);
export type BlueprintDocumentKind = z.infer<typeof BlueprintDocumentKindSchema>;

export const BLUEPRINT_DOCUMENT_KIND_LABELS: Record<BlueprintDocumentKind, string> = {
  schematic: "Schematic",
  bill_of_materials: "Bill of materials",
  assembly_guide: "Assembly guide",
  datasheet: "Datasheet",
};

/** How much prior hardware experience a build assumes. */
export const BLUEPRINT_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const BlueprintDifficultySchema = z.enum(BLUEPRINT_DIFFICULTIES);
export type BlueprintDifficulty = z.infer<typeof BlueprintDifficultySchema>;

export const BLUEPRINT_DIFFICULTY_LABELS: Record<BlueprintDifficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

// --- Object shapes -----------------------------------------------------------

/**
 * The indicative bill-of-materials cost band, in integer cents.
 *
 * A RANGE AND NOT A FIGURE, on purpose — the same argument `CofounderCapitalRangeSchema`
 * (`src/lib/store/cofounders.schemas.ts:141`) makes about capital: nobody writes one number here
 * honestly, and a single number reads as a quote rather than an estimate.
 *
 * BOTH ENDS ARE REQUIRED TOGETHER, so the whole object is nullable rather than its fields. Half a
 * range is not "a floor with no ceiling", it is an unanswerable question.
 *
 * `null` MEANS NOBODY COSTED IT. It is not zero, and a renderer must show an absence — see
 * `formatCentsRangeLabel`, which returns `null` rather than inventing a band.
 *
 * INTEGER CENTS, NEVER A DISPLAY STRING. A stored `"$45 - $60"` cannot be filtered, sorted,
 * converted or localised, and it fixes the currency at author time. Formatting is the view
 * layer's job and belongs to `formatCentsRangeLabel`, not the contract.
 */
export const BlueprintCostRangeSchema = z
  .object({
    minimumInCents: z.number().int().nonnegative(),
    maximumInCents: z.number().int().nonnegative(),
    /** ISO 4217, e.g. "USD". Spelled `currency` to match every other money shape in `src/lib`. */
    currency: z.string(),
  })
  .strip();
export type BlueprintCostRange = z.infer<typeof BlueprintCostRangeSchema>;

export const BlueprintAuthorSchema = z
  .object({
    displayName: z.string(),
    /** The channel handle, without a leading "@" — the "@" is added at render time. */
    handle: z.string(),
    avatarUrl: z.string(),
  })
  .strip();
export type BlueprintAuthor = z.infer<typeof BlueprintAuthorSchema>;

// --- Media and link value objects --------------------------------------------

/**
 * A video attached to a build — a teardown walkthrough or a showcase demo.
 *
 * `durationSeconds` IS AN INTEGER, NOT `"8:12"`. Same argument the cost range makes above about
 * display strings: a stored label cannot be summed, sorted or localised, and it fixes the
 * formatting at author time. `formatDurationLabel` (`src/lib/feed/format.ts`) turns it into a
 * badge, and returns `null` rather than "0:00" when there is nothing to show.
 */
export const BlueprintVideoSchema = z
  .object({
    url: createHttpsOrSiteRelativeUrlSchema(2048),
    /** The still shown before playback starts. Required — a play button over nothing is a bug. */
    posterUrl: createHttpsOrSiteRelativeUrlSchema(2048),
    durationSeconds: z.number().int().positive(),
    /** A WebVTT track. `null` when nobody captioned it — which is a gap, not a state to hide. */
    captionsUrl: createHttpsOrSiteRelativeUrlSchema(2048).nullable(),
  })
  .strip();
export type BlueprintVideo = z.infer<typeof BlueprintVideoSchema>;

/**
 * One published file on a teardown: the schematic, the BOM, the assembly guide.
 *
 * `byteSize` is INTEGER BYTES for the same reason the duration is seconds. `formatFileSizeFromBytes`
 * (`src/lib/rnd/format.ts`) renders it.
 */
export const BlueprintDocumentSchema = z
  .object({
    id: z.string(),
    kind: BlueprintDocumentKindSchema,
    title: z.string(),
    url: createHttpsOrSiteRelativeUrlSchema(2048),
    byteSize: z.number().int().nonnegative(),
    /** `null` when the backend never counted the pages. Not zero — a zero-page PDF is not a file. */
    pageCount: z.number().int().positive().nullable(),
  })
  .strip();
export type BlueprintDocument = z.infer<typeof BlueprintDocumentSchema>;

/** A labelled link that may leave the site. */
export const BlueprintLinkSchema = z
  .object({
    label: z.string(),
    url: createExternalHttpsUrlSchema(2048),
  })
  .strip();
export type BlueprintLink = z.infer<typeof BlueprintLinkSchema>;

/** One person on a showcase build. Shaped like `BlueprintAuthor` plus what they did. */
export const BlueprintTeamMemberSchema = z
  .object({
    displayName: z.string(),
    handle: z.string(),
    avatarUrl: createHttpsOrSiteRelativeUrlSchema(2048),
    /** Free text, e.g. "Firmware". Not an enum — a two-person build invents its own titles. */
    role: z.string(),
  })
  .strip();
export type BlueprintTeamMember = z.infer<typeof BlueprintTeamMemberSchema>;

/**
 * A number a case study reports, carrying WHAT KIND OF NUMBER IT IS.
 *
 * "3,400 units", "$4.12 landed cost" and "18% scrap" are three different things and only one of
 * them is money. A single `value: string` would have flattened all three into text that cannot be
 * converted, compared or localised — and would have fixed the currency at author time, which is
 * exactly the failure `billOfMaterialsCostRange` is written in cents to avoid.
 *
 * Percentages are BASIS POINTS so a fraction survives the integer: 1825 is 18.25%.
 */
export const BlueprintMetricValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("count"), amount: z.number().int() }).strip(),
  z
    .object({
      kind: z.literal("money"),
      amountInCents: z.number().int(),
      currency: z.string(),
    })
    .strip(),
  z.object({ kind: z.literal("percentage"), basisPoints: z.number().int() }).strip(),
]);
export type BlueprintMetricValue = z.infer<typeof BlueprintMetricValueSchema>;

export const BlueprintOutcomeMetricSchema = z
  .object({
    label: z.string(),
    value: BlueprintMetricValueSchema,
  })
  .strip();
export type BlueprintOutcomeMetric = z.infer<typeof BlueprintOutcomeMetricSchema>;

// --- The blueprint union -----------------------------------------------------
//
// ONE SHAPE PER CATEGORY, because the three surfaces ask different questions of a build. A
// teardown publishes files; a showcase is an announcement with a date and a team; a case study is
// a numbered lesson with outcome figures. Modelling that as one object with fifteen optional
// fields would allow a case study with a walkthrough video and a teardown with an upvote count —
// states nothing can render and nothing should be able to express (CLAUDE.md Pattern 1).
//
// THE SHARED FIELDS ARE A SPREAD CONST, NOT A BASE `.extend()`. `z.discriminatedUnion` needs the
// discriminator to be a `z.literal` on each member and `.strip()` to land on the final object;
// `src/lib/store/rfqs.schemas.ts:169` and `src/lib/store/providers.schemas.ts:221` are the two
// precedents this copies.
//
// `difficulty`, `cadFormat` AND `billOfMaterialsCostRange` STAY SHARED even though they read as
// teardown concerns. A rail card renders all three for every category, and moving them into one
// arm would push an exhaustive `switch` down into a card — the wrong place for one. Arms only add.

const BlueprintSharedShape = {
  id: z.string(),
  /** URL identity, kebab-case, stable once published. */
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  thumbnailUrl: createHttpsOrSiteRelativeUrlSchema(2048),
  author: BlueprintAuthorSchema,
  viewCount: z.number().int().nonnegative(),
  likeCount: z.number().int().nonnegative(),
  difficulty: BlueprintDifficultySchema,
  /** e.g. "STEP / Fusion 360". `null` when no CAD source is published. */
  cadFormat: z.string().nullable(),
  billOfMaterialsCostRange: BlueprintCostRangeSchema.nullable(),
  tags: z.array(z.string()),
  /** ISO 8601. */
  createdAt: z.string(),
};

export const TeardownBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("teardown"),
    /** `null` when nobody filmed it. Most teardowns are documents only. */
    walkthroughVideo: BlueprintVideoSchema.nullable(),
    /** `[]` when nothing is published yet — an ARRAY, never null: "no files" is a countable state. */
    documents: z.array(BlueprintDocumentSchema),
    /** `null` when nobody counted. Not zero — a zero-part teardown is not a teardown. */
    partCount: z.number().int().positive().nullable(),
  })
  .strip();

export const ShowcaseBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("showcase"),
    /** One line beside the title in the feed. Not the summary — this is the pitch. */
    tagline: z.string(),
    /**
     * ISO 8601. THE FEED SORTS BY THIS, NOT `createdAt`. A launch is announced on a date its
     * author chose; the row's creation timestamp is an implementation detail of when it was typed.
     */
    launchedAt: z.string(),
    /**
     * DISPLAY ONLY. There is no vote endpoint and no vote button — a counter a client can
     * increment is a business rule enforced on an untrusted layer, which CLAUDE.md §1.1 forbids
     * outright. This renders; nothing in this repo changes it.
     */
    upvoteCount: z.number().int().nonnegative(),
    team: z.array(BlueprintTeamMemberSchema),
    /** The teardown this was built from, `null` when it was built from nothing published here. */
    builtFromBlueprintSlug: z.string().nullable(),
    demoVideo: BlueprintVideoSchema.nullable(),
    callToAction: BlueprintLinkSchema.nullable(),
  })
  .strip();

export const CaseStudyBlueprintSchema = z
  .object({
    ...BlueprintSharedShape,
    category: z.literal("case_study"),
    /** The numeral on the card. Unique across case studies; the index is ordered by it. */
    conceptNumber: z.number().int().positive(),
    discipline: BlueprintDisciplineSchema,
    /** The single sentence the index card carries under the title. */
    oneLineDefinition: z.string(),
    takeaways: z.array(z.string()),
    outcomeMetrics: z.array(BlueprintOutcomeMetricSchema),
    furtherReading: z.array(BlueprintLinkSchema),
  })
  .strip();

export const BlueprintSchema = z.discriminatedUnion("category", [
  TeardownBlueprintSchema,
  ShowcaseBlueprintSchema,
  CaseStudyBlueprintSchema,
]);
export type Blueprint = z.infer<typeof BlueprintSchema>;

export type TeardownBlueprint = z.infer<typeof TeardownBlueprintSchema>;
export type ShowcaseBlueprint = z.infer<typeof ShowcaseBlueprintSchema>;
export type CaseStudyBlueprint = z.infer<typeof CaseStudyBlueprintSchema>;

/** The arm belonging to one category — what the narrowed getters in `api.ts` return. */
export type BlueprintOfCategory<TCategory extends BlueprintCategory> = Extract<
  Blueprint,
  { category: TCategory }
>;

/** Everything a card renders, whichever arm it came from. */
export type BlueprintCardFields = Pick<
  Blueprint,
  | "slug"
  | "title"
  | "category"
  | "summary"
  | "thumbnailUrl"
  | "author"
  | "difficulty"
  | "billOfMaterialsCostRange"
>;
