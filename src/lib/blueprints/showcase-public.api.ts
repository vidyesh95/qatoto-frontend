// TRANSPORT: server-fetch — every read here is public and is awaited by a server component.
// `RequestOptions` is threaded anyway so a client island can call one later without the signature
// changing.
//
// WIRED. These three reads call the Express backend. They are the showcase half of
// `@/lib/blueprints/api`, which still serves teardowns and case studies from fixtures because those
// have no tables yet — so the two files sit side by side on purpose until they do.
//
// `@/lib/blueprints/api` IS NOT A MODEL FOR THIS FILE, and neither is `@/lib/cms`. Those getters
// return a bare value and fall back to fixtures when a fetch fails, which makes "the backend is
// down" and "there is nothing here" the same answer — on a public page that means a visitor is
// shown invented builds under real headings, with nothing to say so. Everything here returns
// `ActionResponse` and the pages branch on it, the way `@/lib/store/catalog.api` does.
//
// NO `"use cache"`. `getJson` sends `credentials: "include"`, and a cache boundary over a
// cookie-bearing fetch is a cache-key question these reads do not need to answer.

import { buildQueryString, getJson, type ActionResponse, type RequestOptions } from "@/lib/http";
import {
  ShowcaseBlueprintSchema,
  ShowcaseFeedPageSchema,
  ShowcaseSlugListSchema,
  type ShowcaseBlueprint,
  type ShowcaseFeedPage,
  type ShowcaseSort,
} from "@/lib/blueprints/schemas";

export interface ListPublicShowcasesFilter {
  readonly tag?: string;
  readonly sort?: ShowcaseSort;
  readonly cursor?: string;
  readonly limit?: number;
}

/**
 * One page of published launches, newest or most-upvoted first, with the tag counts beside them.
 *
 * THE FACETS ARRIVE IN THE SAME PAYLOAD rather than from a second call, because they are counted
 * over the same population this list filters. Two calls could disagree — chips promising launches
 * the list never returns — and the second could fail on its own.
 *
 * ⚠️ `sort=top` CURRENTLY MATCHES `sort=newest`. Nothing writes an upvote yet, because the UI
 * offers no control that would, so every launch ties at zero and the order falls through to the
 * launch date. That is the server being honest, not a bug to work around here.
 *
 * Paging means echoing `page.nextCursor` back as `?cursor=`. The token is opaque: the server minted
 * it, encodes the sort inside it, and answers 422 for anything it did not mint.
 */
export function listPublicShowcases(
  filter: ListPublicShowcasesFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseFeedPage>> {
  const path = `/blueprints/showcases${buildQueryString({ ...filter })}`;
  return getJson(path, ShowcaseFeedPageSchema, options);
}

/**
 * One published launch by its public address.
 *
 * A launch that is not published is a **404**, identical to a slug that never existed. The two are
 * indistinguishable on purpose, so a stranger cannot probe which launches are waiting for review.
 */
export function getPublicShowcase(
  slug: string,
  options?: RequestOptions,
): Promise<ActionResponse<ShowcaseBlueprint>> {
  return getJson(
    `/blueprints/showcases/${encodeURIComponent(slug)}`,
    ShowcaseBlueprintSchema,
    options,
  );
}

/** Every published slug, for `generateStaticParams`. Unpaged: it is one short string per launch. */
export function listPublicShowcaseSlugs(
  options?: RequestOptions,
): Promise<ActionResponse<string[]>> {
  return getJson("/blueprints/showcases/slugs", ShowcaseSlugListSchema, options);
}
