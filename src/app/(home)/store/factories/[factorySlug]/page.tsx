import type { Metadata } from "next";

import FactoryDetailPage from "@/components/home/store/factory-detail-page";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreFactory } from "@/lib/store/factories.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_FACTORY_SLUGS } from "@/mocks/store/factories-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `withSentinelValues` because `cacheComponents` fails the build on an empty
 * `generateStaticParams`, and the sentinel slug takes the same `notFound()` path a typo does.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_FACTORY_SLUGS]).map((factorySlug) => ({
    factorySlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ factorySlug: string }>;
}): Promise<Metadata> {
  const { factorySlug } = await params;
  const result = await getStoreFactory(factorySlug);

  // A failed metadata read must not take the page down — the page renders its own error or 404.
  const displayName = result.success
    ? result.data.factory.displayName
    : prettifySlugForDisplay(factorySlug);

  return {
    title: `${displayName} · Factories worldwide`,
    description: `Capabilities, capacity, certifications and sample policy for ${displayName} on Qatoto`,
  };
}

export default async function StoreFactoryRoute({
  params,
}: {
  params: Promise<{ factorySlug: string }>;
}) {
  const { factorySlug } = await params;
  return <FactoryDetailPage factorySlug={factorySlug} />;
}
