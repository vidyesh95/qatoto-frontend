import type { Metadata } from "next";

import ProviderDetailPage from "@/components/home/store/provider-detail-page";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreProvider } from "@/lib/store/providers.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_PROVIDER_SLUGS } from "@/mocks/store/providers-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `withSentinelValues` because `cacheComponents` fails the build on an empty
 * `generateStaticParams`, and the sentinel slug takes the same `notFound()` path a typo does.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_PROVIDER_SLUGS]).map((organizationSlug) => ({
    organizationSlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}): Promise<Metadata> {
  const { organizationSlug } = await params;
  const result = await getStoreProvider(organizationSlug);

  // A failed metadata read must not take the page down — the page renders its own error or 404.
  const displayName = result.success
    ? result.data.provider.displayName
    : prettifySlugForDisplay(organizationSlug);

  return {
    title: `${displayName} · Trade services`,
    description: `Services, coverage and track record for ${displayName} on Qatoto`,
  };
}

export default async function StoreProviderRoute({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  return <ProviderDetailPage organizationSlug={organizationSlug} />;
}
