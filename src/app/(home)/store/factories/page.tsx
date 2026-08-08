import type { Metadata } from "next";

import FactoryDirectoryPage from "@/components/home/store/factory-directory-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Factories worldwide · Store",
  description:
    "ODM and OEM manufacturers on Qatoto, by capability, country, order minimum and certification",
};

export default async function StoreFactoriesRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <FactoryDirectoryPage searchParams={resolvedSearchParams} />;
}
