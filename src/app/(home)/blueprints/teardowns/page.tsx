import type { Metadata } from "next";

import TeardownsIndexPage from "@/components/home/blueprints/teardowns/teardowns-index-page";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  // `noindex` WHILE THE SEEDED CONTENT IS INVENTED — the same flag the hub carries, for the same
  // reason, and the hub's comment holds the full reasoning. ⚠️ NINE ROUTES HOLD IT AND SEVEN GET
  // RESTORED: the three `/new` wizards and `/teardowns/[slug]/report` are forms and stay noindexed
  // whatever happens to the content.
  robots: { index: false, follow: false },
  title: "Teardowns · Blueprints",
  description:
    "Engineering teardowns — schematics, CAD breakdowns and bills of materials, pulled apart part by part.",
  // The BARE path, with no query. Every filter permutation is a different URL, and a canonical
  // that carried the query would have each one declare itself canonical.
  alternates: { canonical: "/blueprints/teardowns" },
};

// `searchParams` carries the filter state, which the page body applies server-side. Reading it
// makes this route dynamic under `cacheComponents`; the segment-level `blueprints/loading.tsx`
// above is the Suspense boundary that covers it.
export default function TeardownsRoute({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  return <TeardownsIndexPage searchParams={searchParams} />;
}
