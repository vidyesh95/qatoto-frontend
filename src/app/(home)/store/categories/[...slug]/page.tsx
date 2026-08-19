import type { Metadata } from "next";

import CatalogCategoryPage from "@/components/home/store/catalog-category-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreCategory, listStoreCategories } from "@/lib/store/catalog.api";
import { prettifySlugForDisplay } from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * SINGLE-SEGMENT PARAMS ONLY, and that is a contract fact rather than a shortcut.
 *
 * `GET /store/categories/:slug` addresses a category by its own slug and returns no
 * ancestors, so a multi-segment path is neither generatable nor verifiable — there is
 * nothing to check `/furniture/chairs` against. Deep paths render on demand and the page
 * corroborates only the last segment, which is the one the backend resolved.
 *
 * `withSentinelValues` because `cacheComponents` fails the build on an empty
 * `generateStaticParams`, and the sentinel takes the same `notFound()` path a typo does.
 *
 * The slugs come from the LIVE category read. They used to come from a fixture array, which meant
 * every prerendered page was a `notFound()` for a slug no category had, and no real category page
 * was prerendered at all.
 */
export async function generateStaticParams() {
  const result = await listStoreCategories();
  const slugs = result.success ? result.data.items.map((category) => category.slug) : [];
  return withSentinelValues(slugs).map((categorySlug) => ({ slug: [categorySlug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const addressedSlug = slug.at(-1) ?? "";
  const result = await getStoreCategory(addressedSlug);

  // Falls back to the prettified slug rather than throwing: a metadata read that fails must
  // not take the page down with it, and the page will render its own error state anyway.
  const categoryName = result.success
    ? result.data.category.name
    : prettifySlugForDisplay(addressedSlug);

  return {
    title: `${categoryName} · Store`,
    description: `Browse ${categoryName} listings from verified sellers on Qatoto`,
    // THE WHOLE TRAIL, not the leaf. This is a catch-all, and the same category is addressable at
    // several depths; the canonical is the path as walked, which is also what `sitemap.ts` emits.
    alternates: { canonical: `/store/categories/${slug.join("/")}` },
  };
}

export default async function StoreCategoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <CatalogCategoryPage urlSegments={slug} searchParams={resolvedSearchParams} />;
}
