import type { Metadata } from "next";

import OrganizationStorefront from "@/components/home/store/organization-storefront";
import { getOrganizationStorefront } from "@/lib/store/organizations.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { SITE_URL } from "@/lib/site";
import { withSentinelValues } from "@/lib/static-params";
import { StructuredData, buildOrganizationStructuredData } from "@/lib/structured-data";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// A literal `organizations/` segment is safe beside the `[...slug]` catch-all — static
// segments win over catch-alls in the App Router, and `product/` and `pathway/` already
// prove it in this exact directory.
//
// NOTHING IS PRERENDERED. `getOrganizationSlugs` used to seed this from mock keys by way of a
// `/store/organization-slugs` route the backend never served; the store enumerates no slug
// universe at build time. `withSentinelValues([])` yields the one sentinel `cacheComponents`
// needs to accept a dynamic segment at all, and that sentinel takes the same `notFound()` path a
// typo does.
//
// `src/app/sitemap.ts` DOES enumerate storefronts, and it needs no new endpoint to do it:
// `organizationSlug` rides on every `GET /store/search` hit, so crawling products and offerings
// yields every organization that lists anything. The residue is organizations with zero of both,
// which have nothing to rank for.
export function generateStaticParams() {
  return withSentinelValues([]).map((organizationSlug) => ({ organizationSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  const result = await getOrganizationStorefront(organizationSlug);
  // A failed metadata read must not take the page down — the page renders its own error or 404.
  const title = result.success ? result.data.displayName : prettifySlugForDisplay(organizationSlug);
  return {
    title: `${title} · Store`,
    alternates: { canonical: `/store/organizations/${organizationSlug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ organizationSlug: string }> }) {
  const { organizationSlug } = await params;
  const storefrontResult = await getOrganizationStorefront(organizationSlug);

  return (
    <>
      {storefrontResult.success && (
        <StructuredData
          data={buildOrganizationStructuredData({
            name: storefrontResult.data.displayName,
            canonicalUrl: `${SITE_URL}/store/organizations/${organizationSlug}`,
            // `summary` is null when the seller has never described itself, and the builder omits
            // the field rather than substituting the country or the slug.
            description: storefrontResult.data.summary,
            logoUrl: storefrontResult.data.logoUrl,
          })}
        />
      )}
      <OrganizationStorefront organizationSlug={organizationSlug} />
    </>
  );
}
