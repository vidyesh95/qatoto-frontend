// TRANSPORT: props-only — composes the /history route. The only fetching child is its own
// server-fetch component behind its own <Suspense> boundary.

import { Suspense } from "react";

import HistoryShell from "@/components/home/history/history-shell";

/**
 * NO `<main>` HERE, unlike `search-page.tsx` and `home.tsx`.
 *
 * `(home)/layout.tsx:43` already renders one around every route in this group, and a page is
 * allowed exactly one `main` landmark — a nested second one makes a screen reader's "skip to
 * main" ambiguous. Those two files predate this and are left alone; this one does not add a
 * third.
 */
export default function HistoryPage() {
  return (
    <div>
      {/*
        `HistoryShell` reads the caller's cookie via `callerRequestOptions()`, which makes it
        dynamic under cacheComponents. Its own boundary is what keeps that dynamism scoped to
        the list — without it the build fails with "Uncached data was accessed outside of
        <Suspense>". Same arrangement as `search-page.tsx`.
      */}
      <Suspense fallback={<HistoryFallback />}>
        <HistoryShell />
      </Suspense>
    </div>
  );
}

/** One screenful of card skeletons at the real grid dimensions, so nothing jumps on arrival. */
function HistoryFallback() {
  return (
    <div aria-hidden>
      <div className="h-20 w-full" />
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
