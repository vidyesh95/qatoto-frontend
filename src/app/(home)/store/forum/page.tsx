import type { Metadata } from "next";

import ForumIndexPage from "@/components/home/store/forum-index-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Business forum · Store",
  description:
    "Sourcing, logistics, customs, compliance, payments and manufacturing, asked and answered on Qatoto",
};

export default async function StoreForumRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  return <ForumIndexPage searchParams={resolvedSearchParams} />;
}
