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

/**
 * One blueprint as it appears in a rail AND on its own page.
 *
 * THERE IS NO SEPARATE CARD/DETAIL SPLIT YET, deliberately. A real list projection will almost
 * certainly return less than a detail read does, and inventing that boundary now would mean
 * guessing where the backend puts it. One shape until a real endpoint says otherwise.
 *
 * FLAT, NOT NESTED under `metrics` / `specs`. Four scalars do not need two wrapper objects, and a
 * flat field survives a projection change without moving.
 */
export const BlueprintSchema = z
  .object({
    id: z.string(),
    /** URL identity, kebab-case, stable once published. */
    slug: z.string(),
    title: z.string(),
    category: BlueprintCategorySchema,
    summary: z.string(),
    thumbnailUrl: z.string(),
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
  })
  .strip();
export type Blueprint = z.infer<typeof BlueprintSchema>;
