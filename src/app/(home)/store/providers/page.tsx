import type { Metadata } from "next";

import ProviderDirectoryPage from "@/components/home/store/provider-directory-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Trade services · Store",
  description:
    "Freight forwarders, customs brokers, inspection agencies, laboratories, warehousing and settlement providers on Qatoto",
};

export default async function StoreProvidersRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ProviderDirectoryPage searchParams={resolvedSearchParams} />;
}
