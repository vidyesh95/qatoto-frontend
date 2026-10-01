// TRANSPORT: props-only — composes the feed. Both fetching children are their own
// server-fetch components behind their own <Suspense> boundaries.

import { Suspense } from "react";

import FeedShell from "@/components/home/feed/feed-shell";
import PromoCarouselSection from "@/components/home/feed/promo-carousel-section";
import { VideoGridFallback } from "@/components/home/shared/video-grid-fallback";
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
      <Suspense fallback={<VideoGridFallback />}>
        <FeedShell searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
