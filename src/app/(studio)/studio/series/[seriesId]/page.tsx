import type { Metadata } from "next";

import SeriesDetailPage from "@/components/studio/series/series-detail-page";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * A dynamic route needs `generateStaticParams` under `cacheComponents`, and an EMPTY one fails
 * the build with `EmptyGenerateStaticParamsError`.
 *
 * THIS USED TO RETURN TWO HARDCODED SLUGS — `stellar-drift` and `moonlit-dojo` — which were
 * fixture ids from the deleted mock context. They now prerender two pages for series that do not
 * exist in any database.
 *
 * Nothing real can replace them: `GET /series/mine` is `requireAuth` and owner-scoped, so a build
 * machine has no session and every series belongs to somebody. The sentinel is the honest answer;
 * real ids render on demand and the page shows its own not-found state.
 */
export function generateStaticParams() {
  return withSentinelValues([]).map((seriesId) => ({ seriesId }));
}

export const metadata: Metadata = {
  title: "Series details",
  description: "Series detail page for Qatoto Creator Studio",
};

export default async function Page({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;
  return <SeriesDetailPage seriesId={seriesId} />;
}
