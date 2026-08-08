import type { Metadata } from "next";

import Home from "@/components/home/feed/home";
import type { RawSearchParams } from "@/lib/filter-href";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: { absolute: "Qatoto" },
  description: "Welcome to Qatoto",
};

/**
 * `searchParams` carries the feed filter — `?mode=` and `?category=` (HOME_STRUCTURE §4).
 *
 * THE PROMISE IS PASSED DOWN UNAWAITED, DELIBERATELY. Awaiting it here would make the whole
 * route dynamic under `cacheComponents` — including the promotional carousel, which has
 * nothing to do with the filter — and the build fails outright with "Uncached data was
 * accessed outside of <Suspense>". `FeedShell` awaits it from inside its own boundary, so only
 * the feed region is dynamic.
 */
export default function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  return <Home searchParams={searchParams} />;
}
