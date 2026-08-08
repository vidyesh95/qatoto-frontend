import type { Metadata } from "next";

import ServiceOfferingPage from "@/components/home/store/service-offering-page";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreServiceOffering } from "@/lib/store/providers.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_OFFERING_SLUGS } from "@/mocks/store/providers-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * All nine fixtures prerender, one per provider kind.
 *
 * That is deliberate rather than incidental: the offering page switches exhaustively over
 * `detail.kind`, so prerendering every kind means a build failure — not a runtime one — if an arm
 * stops compiling. It is the cheapest coverage available for a nine-way union.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_OFFERING_SLUGS]).map((offeringSlug) => ({
    offeringSlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ offeringSlug: string }>;
}): Promise<Metadata> {
  const { offeringSlug } = await params;
  const result = await getStoreServiceOffering(offeringSlug);

  const title = result.success ? result.data.offering.title : prettifySlugForDisplay(offeringSlug);

  return {
    title: `${title} · Trade services`,
    description: result.success
      ? (result.data.offering.summary ??
        `${title}, offered by ${result.data.provider.displayName} on Qatoto`)
      : `Trade service on Qatoto`,
  };
}

export default async function StoreServiceOfferingRoute({
  params,
}: {
  params: Promise<{ offeringSlug: string }>;
}) {
  const { offeringSlug } = await params;
  return <ServiceOfferingPage offeringSlug={offeringSlug} />;
}
