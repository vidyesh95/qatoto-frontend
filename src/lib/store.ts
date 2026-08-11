// TRANSPORT: props-only — pure string helpers, no network of their own.
//
// THIS FILE USED TO BE A SECOND DATA LAYER, AND THAT IS WHY IT IS NOW THREE LINES OF LOGIC.
//
// It fetched against its own env var (`QATOTO_STORE_API_URL`, not the `NEXT_PUBLIC_API_URL` every
// other module uses) and, when that was unset or the call failed, returned a mock fixture with no
// signal that it had. An unconfigured deploy therefore rendered fabricated hero slides, pathways,
// rails and — worst of all — a seller's measured on-time rate, while looking entirely healthy.
// CLAUDE.md forbids a parallel fetcher for exactly this reason.
//
// Where its readers went:
//   getStoreHome              -> `getStoreHome` in `@/lib/store/merchandising.api` (GET /store/home)
//   getOrganizationStorefront -> `getOrganizationStorefront` in `@/lib/store/organizations.api`
//   getPathway                -> `getStorePathway` in `@/lib/store/merchandising.api`
//   getCategory               -> `getStoreCategory` in `@/lib/store/catalog.api`
//
// Deleted outright, because they had no callers and no durable endpoint behind them:
// `getCategorySlugs`, `getPathwaySlugs`, `getOrganizationSlugs`. All three called
// `/store/category-slugs`-style routes the backend never served and never will — the doc names
// them as not-durable API. Routes that prerendered from them now use `withSentinelValues([])`
// from `@/lib/static-params`, which is what the rest of the repo does with a dynamic segment
// whose universe is not enumerable at build time.

/** Turns a kebab-case slug into a display title, e.g. `living-room` -> `Living room`. */
export function prettifySlugForDisplay(slug: string): string {
  const spaced = slug.replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
