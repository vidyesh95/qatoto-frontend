import type { Metadata } from "next";

import ServiceOfferingPage from "@/components/home/store/service-offering-page";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreServiceOffering } from "@/lib/store/providers.api";
import { prettifySlugForDisplay } from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * PRERENDERS NOTHING, and that is the backend's shape rather than an oversight here.
 *
 * There is no global service-offering list route. An offering is reachable two ways — through its
 * provider's detail read (`GET /store/providers/:slug` carries `offerings`) and through the home
 * page's provider shortcuts — so a build-time list would mean fanning out one request per provider
 * to collect slugs, which is a lot of round trips for a page that renders fine on demand.
 *
 * This used to prerender a fixture array of slugs that resolve to nothing, so every prerendered
 * page was a `notFound()`. One sentinel is the honest version of the same thing, and it is what
 * `cacheComponents` needs instead of the empty array it refuses.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((offeringSlug) => ({ offeringSlug }));
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
