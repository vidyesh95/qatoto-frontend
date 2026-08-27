// TRANSPORT: server-fetch — public reads only, every one of them behind `"use cache"`.
//
// WHY THIS FILE EXISTS AT ALL, rather than the reads living in `app/sitemap.ts`: Next 16 refuses
// `"use cache"` inside a Route Handler body and tells you to extract it to a helper. The failure is
// SILENT — an uncached read does not break the build, it quietly degrades the sitemap to
// request-time rendering, re-fetched in full on every crawler hit. So every remote read the sitemap
// performs is an exported cached function here, and `sitemap.ts` only assembles what they return.
//
// FOUR RULES HOLD THROUGHOUT, and each has a way of failing quietly rather than loudly:
//
// 1. A FAILED READ DROPS ITS GROUP, NEVER THE BUILD. Every wrapper returns `ActionResponse`; on
//    `success === false` the group contributes zero entries and the rest of the sitemap still
//    ships. The backend is not running on most machines, and it is not running in CI.
// 2. NEVER `new Date()`. A non-deterministic call stops prerendering, and a manufactured
//    `lastModified` is a lie that teaches crawlers to distrust every date in the file. Most store
//    list projections carry no timestamp at all, so those entries carry no date — which is correct,
//    not a gap to fill.
// 3. NEVER `src/lib/server-http.ts`. `callerRequestOptions()` calls `cookies()`. Build-time
//    enumeration has no session anyway, and every endpoint used here is public: a bare call through
//    `src/lib/http.ts` sends no credentials of its own, so it IS the anonymous call.
// 4. PAGE TO EXHAUSTION, WITH A CEILING. The `limit: 24` at the `generateStaticParams` call sites is
//    a PRERENDER budget and copying it here would silently publish the first page of each surface as
//    though it were the whole catalogue. These loops walk to the end — but a backend that returns a
//    non-advancing cursor would otherwise spin forever, so each loop is bounded and says so.

import { listChannels } from "@/lib/channels/api";
import { getBlogs, getPressList } from "@/lib/cms";
import { listStoreCategories, searchStore } from "@/lib/store/catalog.api";
import { listCofounderProfiles } from "@/lib/store/cofounders.api";
import { listStoreFactories } from "@/lib/store/factories.api";
import { listForumThreads } from "@/lib/store/forum.api";
import { getStoreHome, listStorePathways } from "@/lib/store/merchandising.api";
import { listStoreProviders } from "@/lib/store/providers.api";
import { listProblemClusters } from "@/lib/rnd/discovery.api";
import { listResearchProgramSlugs } from "@/lib/rnd/research-programs.api";
import { listResearchProjectSlugs } from "@/lib/rnd/projects.api";
import { listSuppliers } from "@/lib/rnd/suppliers.api";

/**
 * One URL for the sitemap, as a site-relative path.
 *
 * `lastModified` IS OPTIONAL AND USUALLY ABSENT. Omitting it tells a crawler nothing; inventing it
 * tells a crawler something false. Only five surfaces on this platform carry a real content
 * timestamp on their list projection, and only those five set the field.
 */
export type SitemapEntry = {
  readonly path: string;
  readonly lastModified?: string;
};

/**
 * How many pages a single enumeration will walk before giving up.
 *
 * IT IS A RUNAWAY GUARD, NOT A BUDGET. At the backend's own maximum page sizes this is far more
 * than the catalogue holds; hitting it means a cursor stopped advancing or a page count is wrong,
 * and stopping is better than a build that never finishes. If a real surface ever approaches it,
 * split the sitemap with `generateSitemaps` rather than raising this.
 */
const MAX_PAGES_PER_SURFACE = 400;

/** The largest page each backend list route accepts. Asking for more is a 422, not a bigger page. */
const CURSOR_PAGE_LIMIT = 48;
const DIRECTORY_PAGE_LIMIT = 50;
const OFFSET_PAGE_LIMIT = 50;

// --- Editorial (CMS) --------------------------------------------------------

/**
 * WITH NO CMS CONFIGURED THIS PUBLISHES NOTHING, and that guard is the whole point of the function.
 *
 * `cmsFetch` returns `null` when `QATOTO_CMS_URL` is unset and `getBlogs()` then serves the
 * hardcoded `MOCK_BLOGS` array. Those mocks are fine as a rendering fallback — a visitor sees
 * example posts — but a sitemap is a claim to a search engine that a URL exists, and publishing
 * `/blogs/<mock-slug>` from a build with no CMS credentials is a claim that is false everywhere the
 * CMS is not configured, which is every environment today.
 */
export async function getBlogSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  if (!process.env.QATOTO_CMS_URL) return [];

  const posts = await getBlogs();
  return posts.map((post) => ({ path: `/blogs/${post.slug}`, lastModified: post.publishedAt }));
}

/** Same mock guard as `getBlogSitemapEntries` — `getPressList()` falls back the same way. */
export async function getPressSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  if (!process.env.QATOTO_CMS_URL) return [];

  const items = await getPressList();
  return items.map((item) => ({ path: `/press/${item.slug}`, lastModified: item.publishedAt }));
}

// --- Research and development ----------------------------------------------

/**
 * Published programmes. `GET /research-programs/slugs` returns EVERY published slug in one read —
 * it is not paginated, which is why there is no loop here.
 *
 * No `lastModified`: the slugs route returns bare strings. `publishedAt` exists only on the paged
 * feed, and paging a heavier endpoint to decorate an entry is not worth a date that changes once.
 */
export async function getResearchProgramSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const result = await listResearchProgramSlugs();
  if (!result.success) return [];

  return result.data.map((slug) => ({ path: `/research-and-development/programs/${slug}` }));
}

/** Active projects, same shape and same single unpaginated read as the programmes above. */
export async function getResearchProjectSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const result = await listResearchProjectSlugs();
  if (!result.success) return [];

  return result.data.map((slug) => ({ path: `/research-and-development/project/${slug}` }));
}

/**
 * Problem clusters, walked over `pagination.totalPages`.
 *
 * `lastReportedAt` is a real content timestamp — a cluster changes when somebody reports into it —
 * so this is one of the five surfaces that can honestly carry `lastModified`.
 */
export async function getProblemClusterSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const entries: SitemapEntry[] = [];

  for (let pageNumber = 1; pageNumber <= MAX_PAGES_PER_SURFACE; pageNumber += 1) {
    const result = await listProblemClusters({ page: pageNumber, limit: OFFSET_PAGE_LIMIT });
    if (!result.success) break;

    for (const cluster of result.data.rows) {
      entries.push({
        path: `/research-and-development/problem-map/cluster/${cluster.id}`,
        lastModified: cluster.lastReportedAt,
      });
    }

    if (pageNumber >= result.data.pagination.totalPages) break;
  }

  return entries;
}

/** Go-to-market suppliers. Offset-paged like the clusters; no timestamp on the row. */
export async function getSupplierSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const entries: SitemapEntry[] = [];

  for (let pageNumber = 1; pageNumber <= MAX_PAGES_PER_SURFACE; pageNumber += 1) {
    const result = await listSuppliers({ page: pageNumber, limit: OFFSET_PAGE_LIMIT });
    if (!result.success) break;

    for (const supplier of result.data.rows) {
      entries.push({ path: `/research-and-development/go-to-market/supplier/${supplier.slug}` });
    }

    if (pageNumber >= result.data.pagination.totalPages) break;
  }

  return entries;
}

// --- Store directories (cursor-paged) ---------------------------------------

/** The footer every cursor-paged store list carries, from `cursorPageOf` in `shared.schemas.ts`. */
type CursorPage<TRow> = {
  readonly items: TRow[];
  readonly page: { readonly nextCursor: string | null; readonly hasMore: boolean };
};

/**
 * Walk a cursor-paged list to the end and return every row.
 *
 * IT RETURNS ROWS, NOT ENTRIES, so a caller can read more than one field off each — the catalogue
 * crawl needs both `publicSlug` and `organizationSlug` from the same hit, and a helper that mapped
 * to an entry here would force it to smuggle the second one through a cast.
 *
 * THE CURSOR IS ALSO THE TERMINATION CONDITION, so both halves of it are checked: `hasMore` false
 * ends the walk, and so does a null cursor while `hasMore` is true — a combination that should not
 * occur and would otherwise re-request page one until the ceiling.
 */
async function collectCursorPagedRows<TRow>(
  readPage: (
    cursor: string | undefined,
  ) => Promise<{ success: true; data: CursorPage<TRow> } | { success: false; error: unknown }>,
): Promise<TRow[]> {
  const rows: TRow[] = [];
  let cursor: string | undefined = undefined;

  for (let pageCount = 0; pageCount < MAX_PAGES_PER_SURFACE; pageCount += 1) {
    const result = await readPage(cursor);
    if (!result.success) break;

    rows.push(...result.data.items);

    if (!result.data.page.hasMore || result.data.page.nextCursor === null) break;
    cursor = result.data.page.nextCursor;
  }

  return rows;
}

export async function getFactorySitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const factories = await collectCursorPagedRows((cursor) =>
    listStoreFactories({ limit: DIRECTORY_PAGE_LIMIT, cursor }),
  );
  return factories.map((factory) => ({ path: `/store/factories/${factory.slug}` }));
}

/** Published cofounder profiles only — the list route never returns an unpublished one. */
export async function getCofounderProfileSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const profiles = await collectCursorPagedRows((cursor) =>
    listCofounderProfiles({ limit: DIRECTORY_PAGE_LIMIT, cursor }),
  );
  return profiles.map((profile) => ({ path: `/store/find-cofounder/${profile.slug}` }));
}

/**
 * Forum threads. `lastActivityAt` is the best recrawl signal on the whole store — a thread with a
 * new reply genuinely has new content — and the list route never returns a `pending_review` thread,
 * so nothing unpublished can leak in through here.
 */
/**
 * Creator channels — the ones whose owners asked to be listed.
 *
 * WHY THIS EXISTS NOW AND NOT BEFORE. `/channel/:handle` has been public since it shipped, and it
 * was in no sitemap for one reason: there was no public handle-enumeration read to build a list
 * from. `GET /channels` is that read, and it answers the question building one raises — a directory
 * of PEOPLE is not a directory of products, so it is **opt-in** and defaults off.
 *
 * ⚠️ EXPECT THIS TO BE EMPTY FOR A WHILE, AND THAT IS CORRECT RATHER THAN BROKEN. Nobody is listed
 * until they tick the box in their channel profile, and the backend additionally requires at least
 * one publicly-servable video — because an entry for a channel page with no videos is a soft 404,
 * which this file's own header calls worse for the whole domain than never announcing it.
 *
 * NO `lastModified`. A channel's page changes when its videos do, and there is no timestamp on this
 * read that tracks that. Inventing one would be a lie a crawler believes, which is the rule
 * `sitemap.ts` states for every other surface here.
 *
 * IT DOES NOT USE `collectCursorPagedRows`. That helper expects the store's `{ items, page }` shape;
 * the channels routes answer with `nextCursor` as a SIBLING of `data`, so the walk is written out
 * rather than the shapes bent into each other.
 */
export async function getChannelSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const entries: SitemapEntry[] = [];
  let cursor: string | undefined = undefined;

  for (let pageCount = 0; pageCount < MAX_PAGES_PER_SURFACE; pageCount += 1) {
    const result = await listChannels({ limit: DIRECTORY_PAGE_LIMIT, cursor });
    if (!result.success) break;

    entries.push(...result.data.rows.map((channel) => ({ path: `/channel/${channel.handle}` })));

    if (result.data.nextCursor === null) break;
    cursor = result.data.nextCursor;
  }

  return entries;
}

export async function getForumThreadSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const threads = await collectCursorPagedRows((cursor) =>
    listForumThreads({ limit: DIRECTORY_PAGE_LIMIT, cursor }),
  );
  return threads.map((thread) => ({
    path: `/store/forum/${thread.slug}`,
    lastModified: thread.lastActivityAt,
  }));
}

export async function getPathwaySitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const pathways = await collectCursorPagedRows((cursor) =>
    listStorePathways({ limit: CURSOR_PAGE_LIMIT, cursor }),
  );
  return pathways.map((pathway) => ({ path: `/store/pathways/${pathway.slug}` }));
}

export async function getProviderSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const providers = await collectCursorPagedRows((cursor) =>
    listStoreProviders({ limit: CURSOR_PAGE_LIMIT, cursor }),
  );
  return providers.map((provider) => ({ path: `/store/providers/${provider.slug}` }));
}

/**
 * Merchandising rails. One read: the rails ride on `GET /store/home` and there is no
 * `/store/rails` index route to page.
 */
export async function getStoreRailSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const result = await getStoreHome();
  if (!result.success) return [];

  return result.data.rails.map((rail) => ({ path: `/store/rails/${rail.slug}` }));
}

/**
 * The whole category TREE, not just its roots.
 *
 * `listStoreCategories()` returns ROOTS ONLY unless it is given a `parentCategoryId`, so the
 * route's own `generateStaticParams` covers top-level categories alone. The route is a catch-all
 * (`[...slug]`) that holds deeper paths, and each URL is built from the ACCUMULATED ancestor path
 * rather than the leaf slug — `/store/categories/a/b/c`, not `/store/categories/c`.
 *
 * `visitedCategoryIds` guards against a cycle in the parent graph. The data should not contain one;
 * a build that never terminates is a bad way to find out that it does.
 */
export async function getCategorySitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const entries: SitemapEntry[] = [];
  const visitedCategoryIds = new Set<string>();

  async function walkCategoryLevel(
    parentCategoryId: string | undefined,
    ancestorSlugs: readonly string[],
  ): Promise<void> {
    if (ancestorSlugs.length > 8) return;

    const result = await listStoreCategories(
      parentCategoryId === undefined ? {} : { parentCategoryId },
    );
    if (!result.success) return;

    for (const category of result.data.items) {
      if (visitedCategoryIds.has(category.id)) continue;
      visitedCategoryIds.add(category.id);

      const pathSlugs = [...ancestorSlugs, category.slug];
      entries.push({ path: `/store/categories/${pathSlugs.join("/")}` });
      await walkCategoryLevel(category.id, pathSlugs);
    }
  }

  await walkCategoryLevel(undefined, []);
  return entries;
}

// --- Catalogue: products, service offerings, storefronts ---------------------

/**
 * Products, service offerings and — as a by-product — every storefront that lists either.
 *
 * THREE ROUTE COMMENTS SAY THIS SURFACE CANNOT BE ENUMERATED. They were written about
 * `generateStaticParams`, where prerendering the whole catalogue at build time genuinely is not
 * worth it, and a sitemap has the opposite economics. `GET /store/search` is public and
 * cursor-paged, `hit.publicSlug` IS the slug for both kinds, and with no `query` the backend takes
 * its stable keyset branch over `(title, id)` — a full crawl rather than a relevance ranking.
 *
 * `documentKind` MUST BE PASSED, and this is the one place in the file where omitting an optional
 * filter would lose data silently. The backend also indexes `organization`, which is absent from
 * the frontend's `SEARCH_DOCUMENT_KINDS`; a single organization row in an unfiltered page fails Zod
 * for the WHOLE page, dropping every product on it and reporting only a parse error.
 *
 * Organizations need no read of their own: `organizationSlug` rides on every hit, so the two crawls
 * below already name every storefront that lists anything. The residue is organizations with zero
 * products and zero offerings, which have nothing to rank for.
 */
export async function getCatalogSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  const productHits = await collectCursorPagedRows((cursor) =>
    searchStore({ documentKind: "product", limit: CURSOR_PAGE_LIMIT, cursor }),
  );
  const offeringHits = await collectCursorPagedRows((cursor) =>
    searchStore({ documentKind: "provider_offering", limit: CURSOR_PAGE_LIMIT, cursor }),
  );

  // `lastModified` ON PRODUCT AND SERVICE PAGES, and this is the whole of §12's value. The
  // search document's `updatedAt` moves when the listing itself changes — the backend enqueues
  // a re-projection after a mutation and re-reads the authoritative row, rather than sweeping
  // nightly — so it is a real content date rather than the manufactured one this file's header
  // refuses. Before it, 6 of 128 entries carried a date and every product looked equally stale.
  const entries: SitemapEntry[] = [
    ...productHits.map((hit) => ({
      path: `/store/product/${hit.publicSlug}`,
      lastModified: hit.updatedAt,
    })),
    ...offeringHits.map((hit) => ({
      path: `/store/services/${hit.publicSlug}`,
      lastModified: hit.updatedAt,
    })),
  ];

  // NO `lastModified` ON THE STOREFRONT PAGES, deliberately. These slugs are DERIVED from the
  // hits above — a storefront has no search document of its own here — so the only date
  // available is the newest of its listings, and a storefront changes for reasons no listing
  // records (its profile, its verification state, its banner). Dating it by proxy would be the
  // invented timestamp one paragraph up, arrived at more slowly.
  const organizationSlugs = new Set(
    [...productHits, ...offeringHits].map((hit) => hit.organizationSlug),
  );
  for (const organizationSlug of organizationSlugs) {
    entries.push({ path: `/store/organizations/${organizationSlug}` });
  }

  return entries;
}
