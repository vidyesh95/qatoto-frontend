import type { Metadata } from "next";

import RailPage from "@/components/home/store/rail-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreHome, getStoreRail } from "@/lib/store/merchandising.api";
import { prettifySlugForDisplay } from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender the rails the live home read publishes.
 *
 * THE HOME READ IS THE ONLY PLACE RAIL SLUGS EXIST. There is no `GET /store/rails` — a rail is a
 * curated strip of the home page, not a browsable collection — so its slugs are discovered exactly
 * where a visitor discovers them.
 *
 * A failed read yields `[]` and `withSentinelValues` turns that into one unresolvable param, which
 * `cacheComponents` requires and which the page renders as `notFound()`.
 */
export async function generateStaticParams() {
  const result = await getStoreHome();
  const slugs = result.success ? result.data.rails.map((rail) => rail.slug) : [];
  return withSentinelValues(slugs).map((railSlug) => ({ railSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ railSlug: string }>;
}): Promise<Metadata> {
  const { railSlug } = await params;
  const result = await getStoreRail(railSlug);

  const title = result.success ? result.data.rail.title : prettifySlugForDisplay(railSlug);

  return {
    title: `${title} · Store`,
    description: `${title} on the Qatoto B2B store`,
  };
}

export default async function StoreRailRoute({
  params,
  searchParams,
}: {
  params: Promise<{ railSlug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ railSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <RailPage railSlug={railSlug} searchParams={resolvedSearchParams} />;
}
