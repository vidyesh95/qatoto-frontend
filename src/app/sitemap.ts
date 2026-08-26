import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { UNRESOLVABLE_PARAM_VALUE } from "@/lib/static-params";
import {
  getBlogSitemapEntries,
  getCatalogSitemapEntries,
  getCategorySitemapEntries,
  getCofounderProfileSitemapEntries,
  getFactorySitemapEntries,
  getForumThreadSitemapEntries,
  getPathwaySitemapEntries,
  getPressSitemapEntries,
  getProblemClusterSitemapEntries,
  getProviderSitemapEntries,
  getResearchProgramSitemapEntries,
  getResearchProjectSitemapEntries,
  getStoreRailSitemapEntries,
  getSupplierSitemapEntries,
  type SitemapEntry,
} from "@/lib/sitemap-sources";

// THE SITE ANNOUNCED NOTHING BEFORE THIS FILE. There was no sitemap at all, so the entire public
// catalogue — every product, every storefront, every forum thread — was discoverable only by a
// crawler following links from the home page, which is the slowest path there is.
//
// THIS FILE ASSEMBLES; IT DOES NOT FETCH. Next 16 refuses `"use cache"` inside a Route Handler body,
// so every remote read lives in `src/lib/sitemap-sources.ts` behind that directive, and the failure
// mode of getting that wrong is silent: an uncached read degrades this route to request-time and
// re-runs the whole crawl on every hit. Add new groups there, not here.
//
// NOTHING HERE CALLS `new Date()`. A non-deterministic call stops prerendering, and a manufactured
// `lastModified` is a lie a crawler will believe. Only the surfaces that carry a real content
// timestamp emit the field; the rest omit it, which is honest rather than incomplete.
//
// EXCLUSIONS ARE AS LOAD-BEARING AS INCLUSIONS. Nothing `noindex`, nothing auth-gated, no stub, no
// redirect-only route and no searchParam-driven shell appears below — see each list's comment. A
// sitemap entry for a page that answers with a sign-in wall is filed by Google as a soft 404, which
// is worse for the whole domain than never having announced it.

/**
 * Public pages with real, authored content and a stable URL.
 *
 * FOUR DELIBERATE ABSENCES, each of which would otherwise look like an oversight:
 *
 * - `/watch`, `/anime/watch`, `/search` and `/store/search` are driven by search params (`?v=`,
 *   `?query=`). The bare path renders a placeholder, so announcing it advertises an empty page.
 * - The six `/anime/*` routes are backed entirely by `@/mocks/anime-mocks` — real UI over
 *   fabricated content. They come back when they read real data.
 * - `/research-and-development/new` and `/programs/new` are wizard forms with nothing to index.
 * - The remaining stub routes render a bare `<h1>` and already carry `noindex`. There are twelve
 *   now rather than sixteen: `/report-history` shipped with video content reporting, and
 *   `/customer-service`, `/advertise-with-us` and `/policies-and-safety` gained real content and
 *   are listed below. The twelve that are left are all under `(studio)`, which is noindexed as a
 *   group in its layout.
 */
const STATIC_PUBLIC_PATHS: readonly string[] = [
  "/",

  // (information)
  "/about",
  "/blogs",
  "/careers",
  "/contact-us",
  "/creator",
  "/developers",
  "/how-qatoto-works",
  "/press",
  "/roadmap",

  // (home) — informational pages that are not part of the app shell.
  "/advertise-with-us",
  "/customer-service",
  "/policies-and-safety",

  // (disclaimers)
  "/community-guidelines",
  "/copyright-policy",
  "/privacy-policy",
  "/terms-and-conditions",
  "/vulnerability-disclosure-policy",

  // Store hubs. `/store/search` is excluded above; the RFQ, quote and inquiry surfaces are private.
  "/store",
  "/store/business",
  "/store/categories",
  "/store/factories",
  "/store/find-cofounder",
  "/store/forum",
  "/store/pathways",
  "/store/providers",

  // R&D hubs. `/knowledge-hub`, `/talent` and `/applications` are `noindex` and stay out.
  "/research-and-development",
  "/research-and-development/build-log",
  "/research-and-development/funding",
  "/research-and-development/go-to-market",
  "/research-and-development/governance",
  "/research-and-development/problem-map",
  "/research-and-development/programs",
  "/research-and-development/team-building",
];

/**
 * `/research-and-development/talent/[handle]` is excluded ON PURPOSE and should stay excluded.
 *
 * Both of its reads are `requireAuth` — they are the only §6 reads that return other people's
 * personal data — and the page's own comment says prerendering it would cache one person's profile
 * for every visitor. Bulk-indexing profiles of real people is a privacy decision, not an oversight,
 * so it is written down here rather than left as a gap somebody helpfully closes later.
 */
function toSitemapUrl(entry: SitemapEntry): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${entry.path}`,
    ...(entry.lastModified === undefined ? {} : { lastModified: entry.lastModified }),
  };
}

/**
 * The fourteen enumerations, run ONE AT A TIME.
 *
 * `Promise.all` WAS TRIED AND IS WRONG HERE, measurably. Each of these walks a paginated surface to
 * exhaustion, so fourteen of them at once is dozens of concurrent requests against a backend whose
 * Postgres allows twenty connections in total. Two consecutive builds produced sitemaps with
 * different contents — one dropped every factory and every provider, the next included them — and
 * nothing failed: a read that errors contributes `[]` by design, so the sitemap simply came out
 * short and silent. That rule exists so an unreachable backend cannot fail the build; it is not a
 * licence to lose a surface to load.
 *
 * A sitemap is generated once, at build time, and nothing waits on it. Sequential costs seconds and
 * buys a file whose contents are the same every time.
 */
const SITEMAP_SOURCES: readonly (() => Promise<SitemapEntry[]>)[] = [
  getBlogSitemapEntries,
  getPressSitemapEntries,
  getResearchProgramSitemapEntries,
  getResearchProjectSitemapEntries,
  getProblemClusterSitemapEntries,
  getSupplierSitemapEntries,
  getFactorySitemapEntries,
  getCofounderProfileSitemapEntries,
  getForumThreadSitemapEntries,
  getPathwaySitemapEntries,
  getProviderSitemapEntries,
  getStoreRailSitemapEntries,
  getCategorySitemapEntries,
  getCatalogSitemapEntries,
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicEntries: SitemapEntry[] = [];
  for (const readSitemapEntries of SITEMAP_SOURCES) {
    dynamicEntries.push(...(await readSitemapEntries()));
  }

  // THE SENTINEL MUST NEVER BE PUBLISHED. `withSentinelValues` substitutes `"__none__"` when a read
  // comes back empty, because `cacheComponents` throws `EmptyGenerateStaticParamsError` on an empty
  // `generateStaticParams`. None of the reads above goes through it — but they share their
  // enumeration sources with routes that do, so this filter is the guard against a future helper
  // being reused here and quietly publishing `https://qatoto.com/store/rails/__none__`.
  const publishableEntries = dynamicEntries.filter(
    (entry) => !entry.path.split("/").includes(UNRESOLVABLE_PARAM_VALUE),
  );

  return [
    ...STATIC_PUBLIC_PATHS.map((path) => toSitemapUrl({ path })),
    ...publishableEntries.map(toSitemapUrl),
  ];
}
