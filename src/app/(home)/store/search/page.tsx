import type { Metadata } from "next";

import StoreSearchPage from "@/components/home/store/store-search-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Search · Store",
  description: "Search products and trade services on the Qatoto B2B store",
};

/**
 * `/store/search` searches the STORE. `/search` searches videos — two different indexes on
 * two different routes, and the navbar form submits to the second one. Anything linking
 * here must build its own query string.
 */
export default async function StoreSearchRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <StoreSearchPage searchParams={resolvedSearchParams} />;
}
