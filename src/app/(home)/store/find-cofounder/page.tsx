import type { Metadata } from "next";

import CofounderDirectoryPage from "@/components/home/store/cofounder-directory-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Find a cofounder · Store",
  description:
    "People offering capital, expertise, reach or operating time to businesses on Qatoto",
};

export default async function StoreFindCofounderRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <CofounderDirectoryPage searchParams={resolvedSearchParams} />;
}
