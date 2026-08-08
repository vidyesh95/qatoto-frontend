import type { Metadata } from "next";

import PathwaysIndexPage from "@/components/home/store/pathways-index-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Pathways · Store",
  description: "Sourcing sets on Qatoto — everything one job needs, bought together",
};

export default async function StorePathwaysRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <PathwaysIndexPage searchParams={resolvedSearchParams} />;
}
