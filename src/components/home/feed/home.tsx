// TRANSPORT: props-only — composes the feed. Both fetching children are their own
// server-fetch components behind their own <Suspense> boundaries.

import { Suspense } from "react";

import FeedShell from "@/components/home/feed/feed-shell";
import PromoCarouselSection from "@/components/home/feed/promo-carousel-section";
import type { RawSearchParams } from "@/lib/filter-href";

export default function Home({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  // Layout already renders the page <main>. A second one nested here left
  // prior store / R&D routes visible after client navigation.
  return (
    <div className="relative bg-background">
      {/*
        TWO SEPARATE BOUNDARIES, NOT ONE AROUND BOTH, and not a route-level `loading.tsx`.

        A route-level boundary would make the entire page a dynamic hole under
        cacheComponents. One boundary around both children would tie the feed's render to the
        promotional read, so a slow carousel would hold back the video grid — and the grid is
        what the reader came for.

        The promo fallback matches the carousel height so the feed does not jump when the
        slides arrive. It collapses to nothing in the empty case, which is one shift on the
        rare path rather than one on every load.
      */}
      <Suspense fallback={<div className="h-65 w-full bg-gray-200" aria-hidden />}>
        <PromoCarouselSection />
      </Suspense>
      {/*
        `FeedShell` AWAITS `searchParams`, which makes it dynamic under cacheComponents. Its
        own boundary is what keeps that dynamism from spreading to the rest of the page — the
        promise is threaded down unawaited from `page.tsx` precisely so the await happens on
        this side of the boundary. Awaiting it any higher fails the build with "Uncached data
        was accessed outside of <Suspense>".

        The fallback is a chip-row-height bar plus a grid of skeletons so the first paint has
        the page's real shape rather than a blank column.
      */}
      <Suspense fallback={<FeedShellFallback />}>
        <FeedShell searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Chip row plus one screenful of card skeletons, at the real dimensions. */
function FeedShellFallback() {
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
