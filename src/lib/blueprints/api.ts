// TRANSPORT: mock — every getter below serves `@/mocks/blueprints-mocks`. No network call is
// made yet, and there is no `/blueprints` read on the Express backend to make one against.
//
// THE GETTER IS THE POINT. `src/lib/cms.ts` is the precedent: import sites see only these
// functions, never the fixture array, so wiring a real endpoint later is an edit to this file
// rather than a rewrite of every component. `@/mocks/anime-mocks` was wired the other way — its
// components imported the arrays directly — and that is exactly why the surface stayed mock.
//
// WHEN THE BACKEND ARRIVES, each getter becomes the `remote ?? MOCK` shape `cms.ts:48-71` uses,
// and the parse below stops being a fixture check and starts being CLAUDE.md Pattern 2 — an
// untrusted payload through `.strip()`. The parse is written now so that swap changes one line.

import { MOCK_BLUEPRINTS } from "@/mocks/blueprints-mocks";
import {
  type Blueprint,
  type BlueprintCategory,
  type BlueprintOfCategory,
  BlueprintSchema,
  RESERVED_BLUEPRINT_SLUGS,
} from "@/lib/blueprints/schemas";

/**
 * Parse a fixture through the contract.
 *
 * A malformed fixture is a DEVELOPER ERROR, not a runtime state, so this throws rather than
 * returning a tagged result — there is no user-facing story for "the file in this repo is wrong",
 * and swallowing it would let a typo render as a blank card. Once these rows arrive over the
 * network the failure becomes ordinary and this returns a result instead.
 */
function parseBlueprint(candidate: unknown): Blueprint {
  return BlueprintSchema.parse(candidate);
}

/** Newest first — the order every rail and the hub index rely on. */
function byNewestFirst(left: Blueprint, right: Blueprint): number {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

/**
 * A slug a static route already owns, so no blueprint may answer on it.
 *
 * `/blueprints/showcase` is a list route; a blueprint slugged `showcase` would be permanently
 * unreachable, and a visitor would get a 200 showing the WRONG page — worse than a 404. The
 * guard lives here rather than in a route file because `getBlueprint`, `listBlueprintSlugs` and
 * the sitemap each reach the data independently, and a guard in one of them leaks through the
 * other two. Derived from `BLUEPRINT_CATEGORY_SEGMENTS` so the segments and the guard cannot drift.
 */
function isReservedSlug(slug: string): boolean {
  return RESERVED_BLUEPRINT_SLUGS.includes(slug);
}

/**
 * The narrowing both category getters below rely on, written as a TYPE PREDICATE rather than a
 * cast. `blueprint.category === category` does not narrow a generic arm on its own, and the
 * obvious fix — `as BlueprintOfCategory<TCategory>` — is the assertion CLAUDE.md Pattern 2 rules
 * out. A predicate makes the same claim in the one place a reader can check it.
 */
function isBlueprintOfCategory<TCategory extends BlueprintCategory>(
  blueprint: Blueprint,
  category: TCategory,
): blueprint is BlueprintOfCategory<TCategory> {
  return blueprint.category === category;
}

export async function listBlueprints(): Promise<Blueprint[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map(parseBlueprint).toSorted(byNewestFirst);
}

/**
 * One category's blueprints, NARROWED to that category's arm.
 *
 * The narrowing is the reason this exists rather than each list route filtering `listBlueprints`.
 * `blueprints.filter((blueprint) => blueprint.category === category)` returns the full union —
 * `.filter` without a type predicate does not narrow the element type — so a showcase feed built
 * that way could not read `launchedAt` without a cast, and CLAUDE.md Pattern 2 forbids the cast.
 */
export async function listBlueprintsByCategory<TCategory extends BlueprintCategory>(
  category: TCategory,
): Promise<BlueprintOfCategory<TCategory>[]> {
  "use cache";
  // The callback carries the predicate signature explicitly rather than leaning on TS 5.5's
  // inferred predicates — an inferred one through a delegating call is not something to bet the
  // arm fields of three list routes on.
  const matching = MOCK_BLUEPRINTS.map(parseBlueprint).filter(
    (blueprint): blueprint is BlueprintOfCategory<TCategory> =>
      isBlueprintOfCategory(blueprint, category),
  );
  return matching.toSorted(byNewestFirst);
}

export async function getBlueprint(slug: string): Promise<Blueprint | null> {
  "use cache";
  if (isReservedSlug(slug)) return null;
  const match = MOCK_BLUEPRINTS.find((blueprint) => blueprint.slug === slug);
  return match ? parseBlueprint(match) : null;
}

/**
 * One blueprint, but only if it lives under the category that was asked for.
 *
 * A teardown slug requested at `/blueprints/showcase/<slug>` must 404. Returning it would render
 * a teardown through the launch-feed layout, reading arm fields that are not there — so the
 * category is part of the lookup, not a thing the page checks afterwards and forgets to.
 */
export async function getBlueprintByCategory<TCategory extends BlueprintCategory>(
  category: TCategory,
  slug: string,
): Promise<BlueprintOfCategory<TCategory> | null> {
  "use cache";
  const blueprint = await getBlueprint(slug);
  if (blueprint === null) return null;
  return isBlueprintOfCategory(blueprint, category) ? blueprint : null;
}

/**
 * Every published slug, for `generateStaticParams`.
 *
 * NO `withSentinelValues` HERE, and that is deliberate rather than an oversight. The sentinel
 * exists because a failed backend read returns `[]` and `cacheComponents` throws
 * `EmptyGenerateStaticParamsError` on an empty list. A fixture array cannot be empty, so the
 * blogs precedent (`src/app/(information)/blogs/[slug]/page.tsx`) applies instead. Add the
 * sentinel at the same moment this starts reading a real endpoint, not before — and when you do,
 * FILTER FIRST AND WRAP SECOND. `withSentinelValues(filtered)` is right; filtering the wrapped
 * list can drop the sentinel itself, which is the exact throw the sentinel exists to prevent.
 */
export async function listBlueprintSlugs(): Promise<string[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map((blueprint) => blueprint.slug).filter((slug) => !isReservedSlug(slug));
}

/** One category's slugs, for that category's nested `generateStaticParams`. */
export async function listBlueprintSlugsByCategory(category: BlueprintCategory): Promise<string[]> {
  "use cache";
  return MOCK_BLUEPRINTS.filter((blueprint) => blueprint.category === category)
    .map((blueprint) => blueprint.slug)
    .filter((slug) => !isReservedSlug(slug));
}
