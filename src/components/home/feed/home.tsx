// TRANSPORT: props-only — composes the feed. The promotional slot is its own server-fetch
// child behind <Suspense> so the rest of the page stays prerendered under cacheComponents.

import { Suspense } from "react";

import AllContent from "@/components/home/feed/all-content";
import Filter from "@/components/home/feed/filter";
import PromoCarouselSection from "@/components/home/feed/promo-carousel-section";

export default function Home() {
  return (
    <main>
      {/*
        A COMPONENT-LEVEL BOUNDARY, not a route `loading.tsx`. A route-level one would make
        the ENTIRE home feed a dynamic hole under cacheComponents — `Filter` and `AllContent`
        are static and have no reason to wait on the promotional read. This streams only the
        slot that actually fetches.

        The fallback matches the carousel's height so the feed does not jump when the slides
        arrive. It collapses to nothing in the empty case, which is one shift on the rare
        path rather than one on every load.
      */}
      <Suspense fallback={<div className="h-65 w-full bg-gray-200" aria-hidden />}>
        <PromoCarouselSection />
      </Suspense>
      <Filter />
      <AllContent />
    </main>
  );
}
