// TRANSPORT: props-only — composes the search route. The only fetching child is its own
// server-fetch component behind its own <Suspense> boundary.

import { Suspense } from "react";

import SearchResultsShell from "@/components/home/search/search-results-shell";
import { VideoGridFallback } from "@/components/home/shared/video-grid-fallback";
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
      <Suspense fallback={<VideoGridFallback />}>
        <SearchResultsShell searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
