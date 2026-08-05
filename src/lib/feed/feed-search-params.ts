// TRANSPORT: props-only — pure reading of `searchParams`, no network.
//
// The URL is the single source of truth for what the homepage is showing (HOME_STRUCTURE §4).
// This module is the one place it is interpreted, so a server page, the chip row and the query
// key all agree on what `?mode=&category=` means.
//
// EVERY VALUE IS UNTRUSTED. `searchParams` is hand-editable, and every backend query schema is
// `.strict()` with `z.enum` — so forwarding `?mode=banana` turns a typo in the address bar into
// a 422 error page instead of a feed. `readEnumParam` drops what it does not recognise, which
// makes an unknown facet mean "no filter" rather than "crash".

import { FEED_MODES, type FeedMode } from "@/lib/feed/schemas";
import { readEnumParam, readSingleParam, type RawSearchParams } from "@/lib/filter-href";

/** Kebab-case, matching the backend's `SLUG_PATTERN` on `?categorySlug=`. */
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** The backend's `.max(64)` on the same param. */
const CATEGORY_SLUG_MAX_LENGTH = 64;

export interface FeedSelection {
  readonly mode: FeedMode;
  readonly categorySlug: string | undefined;
}

/**
 * The mode the URL asks for, defaulting to `all`.
 *
 * Note the URL key is `mode` and the backend query key is also `mode`, so no translation is
 * needed. The category is not so lucky — see below.
 */
export function readFeedMode(searchParams: RawSearchParams): FeedMode {
  return readEnumParam(searchParams, "mode", FEED_MODES) ?? "all";
}

/**
 * The category slug the URL asks for.
 *
 * THE URL KEY IS `category`, THE WIRE KEY IS `categorySlug`. The short one is what a person
 * reads and shares; the long one is what the backend's `.strict()` schema declares. Both
 * spellings are correct in their own place and neither may be "harmonised" into the other —
 * `?categorySlug=` in the address bar is ugly, and `?category=` on the wire is a 422.
 *
 * Validated against the pattern and length the backend enforces, so a mangled slug is dropped
 * here rather than round-tripped into an error page.
 */
export function readCategorySlug(searchParams: RawSearchParams): string | undefined {
  const slug = readSingleParam(searchParams, "category");
  if (slug === undefined) return undefined;
  if (slug.length > CATEGORY_SLUG_MAX_LENGTH) return undefined;
  return CATEGORY_SLUG_PATTERN.test(slug) ? slug : undefined;
}

/** Both facets in one read, for the pages and islands that need the pair. */
export function readFeedSelection(searchParams: RawSearchParams): FeedSelection {
  return {
    mode: readFeedMode(searchParams),
    categorySlug: readCategorySlug(searchParams),
  };
}

/**
 * True when the page should render the four default sections rather than one filtered grid.
 *
 * Spotlight is the admin-curated three-video rail and has no meaning inside a category filter,
 * and a "Recommended" heading over a `recently_uploaded` list is a lie about what the user
 * asked for — so any active facet collapses the page to a single grid (HOME_STRUCTURE §5.1).
 */
export function isDefaultFeedSelection(selection: FeedSelection): boolean {
  return selection.mode === "all" && selection.categorySlug === undefined;
}
