// TRANSPORT: props-only — a pulsing placeholder shaped like the feed it resolves into. No props,
// no data, no logic.
//
// Mounted by `showcase/loading.tsx`, which also covers `showcase/[slug]`; those pages are
// prerendered by `generateStaticParams`, so a feed-shaped fallback there is rarely painted and no
// worse than the hub-shaped one `blueprints/loading.tsx` used to serve for this route.
//
// The row count is `SHOWCASE_PAGE_LIMIT` rather than a literal, so the placeholder cannot drift
// from the page it stands in for — `catalog-results-skeleton.tsx` makes the case that a skeleton
// must match the layout it resolves into.

import { SHOWCASE_PAGE_LIMIT } from "@/lib/blueprints/api";

export default function ShowcaseFeedSkeleton() {
  return (
    <div className="animate-pulse pb-10" aria-hidden>
      <div className="px-4 pt-6 lg:px-6 lg:pt-8">
        <div className="h-8 w-40 rounded-full bg-muted lg:h-9" />
        <div className="mt-3 h-4 w-72 max-w-full rounded-full bg-muted" />
      </div>
      <div className="mt-4 space-y-2 px-4 lg:px-6">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-12 rounded-full bg-muted" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_unused, chipIndex) => (
            <div key={chipIndex} className="h-6 w-20 shrink-0 rounded-full bg-muted" />
          ))}
        </div>
      </div>
      <ul className="mt-6 space-y-6 px-4 sm:space-y-8 lg:px-6">
        {Array.from({ length: SHOWCASE_PAGE_LIMIT }, (_unused, rowIndex) => (
          <li
            key={rowIndex}
            className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3 sm:gap-x-4"
          >
            <div className="h-11 w-10 rounded-md bg-muted" />
            <div className="flex items-center gap-x-4 sm:gap-x-6">
              <div className="size-14 shrink-0 rounded-md bg-muted sm:size-16" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/5 rounded-full bg-muted" />
                <div className="h-4 w-4/5 rounded-full bg-muted" />
                <div className="h-3 w-2/5 rounded-full bg-muted" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
