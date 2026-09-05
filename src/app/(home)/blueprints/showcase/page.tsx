import type { Metadata } from "next";

import ShowcaseFeedPage from "@/components/home/blueprints/showcase/showcase-feed-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Showcase · Blueprints",
  description:
    "Working prototypes and finished builds made from the teardowns — what was built, by whom, and how it held up.",
  alternates: { canonical: "/blueprints/showcase" },
};

export default function ShowcaseRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <ShowcaseFeedPage searchParams={searchParams} />;
}
