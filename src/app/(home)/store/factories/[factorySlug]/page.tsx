import type { Metadata } from "next";

import FactoryDetailPage from "@/components/home/store/factory-detail-page";
import { withSentinelValues } from "@/lib/static-params";
import { getStoreFactory, listStoreFactories } from "@/lib/store/factories.api";
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
  const result = await listStoreFactories({ limit: 24 });
  const slugs = result.success ? result.data.items.map((item) => item.slug) : [];
  return withSentinelValues(slugs).map((factorySlug) => ({ factorySlug }));
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
