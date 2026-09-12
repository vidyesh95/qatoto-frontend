// TRANSPORT: server-fetch — every read here is public and is awaited by a server component.
// `RequestOptions` is threaded anyway so a client island can call one later without the signature
// changing.
//
// WIRED. These five reads call the Express backend. They are the teardown half of
// `@/lib/blueprints/api`, which still serves case studies and the market signal from fixtures
// because those have no tables yet — so the two files sit side by side on purpose until they do.
//
// `@/lib/blueprints/api` IS NOT A MODEL FOR THIS FILE, and neither is `@/lib/cms`. Those getters
// return a bare value and fall back to fixtures when a fetch fails, which makes "the backend is
// down" and "there is nothing here" the same answer — on a public page that means a visitor is
// shown invented teardowns under real headings, with nothing to say so. Everything here returns
// `ActionResponse` and the pages branch on it, the way `@/lib/store/catalog.api` does.
//
// NO `"use cache"`. `getJson` sends `credentials: "include"`, and a cache boundary over a
// cookie-bearing fetch is a cache-key question these reads do not need to answer.

import {
  TeardownBlueprintSchema,
  TeardownClaimTargetsSchema,
  TeardownIndexPageSchema,
  TeardownOptionListSchema,
  TeardownSlugListSchema,
  type BlueprintDifficulty,
  type TeardownBlueprint,
  type TeardownClaimTargets,
  type TeardownIndexPage,
  type TeardownMediaFilter,
  type TeardownOption,
} from "@/lib/blueprints/schemas";
import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";

export interface ListPublicTeardownsFilter {
  readonly difficulty?: BlueprintDifficulty;
  readonly media?: TeardownMediaFilter;
  readonly tag?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * One page of listable teardowns, newest first, with the tag counts beside them.
 *
 * ⚠️ THE INDEX AND THE DETAIL PAGE DO NOT SEE THE SAME TEARDOWNS. This read is gated on LIST
 * (`published`, `flagged`); a quarantined teardown is under an unresolved rights claim and is not
 * advertised, but its address still answers. So a slug missing from every page of this list is not
 * a slug that 404s.
 *
 * THE FACETS ARRIVE IN THE SAME PAYLOAD rather than from a second call, because they are counted
 * over the same population this list filters. Two calls could disagree — chips promising teardowns
 * the list never returns — and the second could fail on its own.
 *
 * NO SORT PARAMETER: this surface offers no sort control, and the server drops one rather than
 * honouring an order the caller was never shown.
 *
 * Paging means echoing `page.nextCursor` back as `?cursor=`. The token is opaque: the server minted
 * it and answers 422 for anything it did not mint, rather than silently restarting the list.
 */
export function listPublicTeardowns(
  filter: ListPublicTeardownsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<TeardownIndexPage>> {
  const path = `/blueprints/teardowns${buildQueryString({ ...filter })}`;
  return getJson(path, TeardownIndexPageSchema, options);
}

/**
 * One readable teardown by its address.
 *
 * ⚠️ A QUARANTINED TEARDOWN ANSWERS 200 WITH ITS FILES WITHHELD — `assembly`, `documents`,
 * `manufacturingFiles`, `materials`, `assemblySteps`, `fasteners`, `simulationTelemetry`,
 * `walkthroughVideo`, `billOfMaterialsCostRange` and `repairabilityIndex` all arrive empty or null,
 * and `moderationState` says why. That is the design, not a degraded response: the withholding is
 * the server's, and no component may re-derive it or work around it.
 *
 * A `pending_review` teardown is a **404**, identical to a slug that never existed, so a stranger
 * cannot probe which teardowns are waiting for review.
 */
export function getPublicTeardown(
  slug: string,
  options?: RequestOptions,
): Promise<ActionResponse<TeardownBlueprint>> {
  return getJson(
    `/blueprints/teardowns/${encodeURIComponent(slug)}`,
    TeardownBlueprintSchema,
    options,
  );
}

/**
 * Every readable slug, for `generateStaticParams`.
 *
 * The READABLE gate, so the quarantined slug is in the list — see `TeardownSlugListSchema`.
 * Unpaged: it is one short string per teardown and the caller needs all of them to prerender.
 */
export function listPublicTeardownSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/blueprints/teardowns/slugs", TeardownSlugListSchema, options);
}

/**
 * Slug and title for every listable teardown, sorted by title, for the launch composer's select.
 *
 * THE LIST GATE, not the readable one: naming a teardown as what you built from is a
 * recommendation, and a quarantined teardown is one nobody should be steered toward while the claim
 * is open. This is also what finally makes that select name rows that exist.
 */
export function listTeardownOptions(
  options?: RequestOptions,
): Promise<ActionResponse<TeardownOption[]>> {
  return getJson("/blueprints/teardowns/options", TeardownOptionListSchema, options);
}

/**
 * What a rights claim on this teardown can name — ids and titles, no URLs.
 *
 * ⚠️ THE REPORT PAGE READS THIS INSTEAD OF THE DETAIL PAYLOAD, and must keep doing so. The picker
 * used to build its radio list from `documents`, `manufacturingFiles` and `assembly.parts`; those
 * are exactly the arrays a quarantine empties, and a quarantined teardown still accepts a claim
 * because a second rights holder may have an entirely different objection from the first. Reading
 * the detail here would silently reduce that claimant to "the whole teardown".
 */
export function getTeardownClaimTargets(
  slug: string,
  options?: RequestOptions,
): Promise<ActionResponse<TeardownClaimTargets>> {
  return getJson(
    `/blueprints/teardowns/${encodeURIComponent(slug)}/claim-targets`,
    TeardownClaimTargetsSchema,
    options,
  );
}
