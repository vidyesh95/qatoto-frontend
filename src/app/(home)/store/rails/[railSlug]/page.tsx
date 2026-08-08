import type { Metadata } from "next";

import RailPage from "@/components/home/store/rail-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreRail } from "@/lib/store/merchandising.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_RAIL_SLUGS } from "@/mocks/store/merchandising-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Three fixtures prerender, and one of them is deliberately empty: the `trending_placeholder`
 * strategy returns nothing unconditionally and always will. Prerendering it means the "an empty rail
 * is a healthy rail" branch is exercised on every build rather than discovered in production.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_RAIL_SLUGS]).map((railSlug) => ({ railSlug }));
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
