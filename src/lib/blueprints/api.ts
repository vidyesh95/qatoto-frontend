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
import { type Blueprint, BlueprintSchema } from "@/lib/blueprints/schemas";

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

export async function listBlueprints(): Promise<Blueprint[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map(parseBlueprint).toSorted(byNewestFirst);
}

export async function getBlueprint(slug: string): Promise<Blueprint | null> {
  "use cache";
  const match = MOCK_BLUEPRINTS.find((blueprint) => blueprint.slug === slug);
  return match ? parseBlueprint(match) : null;
}

/**
 * Every published slug, for `generateStaticParams`.
 *
 * NO `withSentinelValues` HERE, and that is deliberate rather than an oversight. The sentinel
 * exists because a failed backend read returns `[]` and `cacheComponents` throws
 * `EmptyGenerateStaticParamsError` on an empty list. A fixture array cannot be empty, so the
 * blogs precedent (`src/app/(information)/blogs/[slug]/page.tsx`) applies instead. Add the
 * sentinel at the same moment this starts reading a real endpoint, not before.
 */
export async function listBlueprintSlugs(): Promise<string[]> {
  "use cache";
  return MOCK_BLUEPRINTS.map((blueprint) => blueprint.slug);
}
