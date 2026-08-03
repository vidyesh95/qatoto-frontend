// TRANSPORT: props-only — composes the search route. The only fetching child is its own
// server-fetch component behind its own <Suspense> boundary.

import { Suspense } from "react";

import SearchResultsShell from "@/components/home/search/search-results-shell";
import type { RawSearchParams } from "@/lib/filter-href";

export default function SearchPage({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  return (
    <main>
      {/*
        `SearchResultsShell` AWAITS `searchParams`, which makes it dynamic under
        cacheComponents. Its own boundary is what keeps that dynamism from spreading — the
        promise is threaded down unawaited from `page.tsx` precisely so the await happens on
        this side of it. Awaiting any higher fails the build with "Uncached data was accessed
        outside of <Suspense>".
      */}
      <Suspense fallback={<SearchResultsFallback />}>
        <SearchResultsShell searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** One screenful of card skeletons at the real grid dimensions, so nothing jumps on arrival. */
function SearchResultsFallback() {
  return (
    <div aria-hidden>
      <div className="h-14 w-full" />
      <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_unused, index) => index).map((skeletonIndex) => (
          <div key={skeletonIndex} className="space-y-2">
            <div className="aspect-video w-full rounded-xl bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
