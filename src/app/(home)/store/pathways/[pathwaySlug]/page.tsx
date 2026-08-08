import type { Metadata } from "next";

import PathwaySetPage from "@/components/home/store/pathway-set-page";
import type { RawSearchParams } from "@/lib/filter-href";
import { withSentinelValues } from "@/lib/static-params";
import { getStorePathway } from "@/lib/store/merchandising.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_PATHWAY_SLUGS } from "@/mocks/store/merchandising-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Both fixtures prerender: one curated set that is deliberately INCOMPLETE, and one anchored set
 * that is complete. Between them they cover every slot state the renderer branches on, so a broken
 * degradation path fails the build rather than waiting for someone to open the right URL.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_PATHWAY_SLUGS]).map((pathwaySlug) => ({
    pathwaySlug,
  }));
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
