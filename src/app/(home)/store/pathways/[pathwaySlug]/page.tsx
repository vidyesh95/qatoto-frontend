import type { Metadata } from "next";

import PathwaySetPage from "@/components/home/store/pathway-set-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getStorePathway, listStorePathways } from "@/lib/store/merchandising.api";
import { prettifySlugForDisplay } from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender the slugs the live list read returns, capped at 24.
 *
 * IT USED TO PRERENDER A FIXTURE ARRAY, which was the only honest option while the read was
 * mocked and is the wrong one now: those slugs resolve to nothing, so every prerendered page was a
 * `notFound()` and no real page was prerendered at all.
 *
 * A FAILED READ YIELDS `[]`, deliberately — an unreachable backend must not fail the build, and
 * `withSentinelValues` turns the empty list into one unresolvable param rather than the empty array
 * `cacheComponents` refuses. Those params then render on demand, and the sentinel takes the same
 * `notFound()` path a typo does.
 *
 * NO SESSION IS FORWARDED. The prerender list is shared by every visitor, so it must be the
 * anonymous answer.
 */
export async function generateStaticParams() {
  const result = await listStorePathways({ limit: 24 });
  const slugs = result.success ? result.data.items.map((item) => item.slug) : [];
  return withSentinelValues(slugs).map((pathwaySlug) => ({ pathwaySlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pathwaySlug: string }>;
}): Promise<Metadata> {
  const { pathwaySlug } = await params;
  const result = await getStorePathway(pathwaySlug);

  const title = result.success ? result.data.pathway.title : prettifySlugForDisplay(pathwaySlug);

  return {
    title: `${title} · Pathways`,
    description: result.success
      ? (result.data.pathway.summary ?? `${title} — a sourcing set on Qatoto`)
      : "A sourcing set on Qatoto",
  };
}

export default async function StorePathwayRoute({
  params,
  searchParams,
}: {
  params: Promise<{ pathwaySlug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const [{ pathwaySlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <PathwaySetPage pathwaySlug={pathwaySlug} searchParams={resolvedSearchParams} />;
}
