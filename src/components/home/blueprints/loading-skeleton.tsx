// TRANSPORT: props-only — a pulsing placeholder. No props, no data, no logic.
//
// The segment-level fallback for every Blueprints route EXCEPT `/showcase`: the hub, the
// `/teardowns` and `/case-studies` indexes and the detail page under each. It sits at
// `blueprints/loading.tsx`, so it covers the nested segments too — which is why those two index
// routes, both of which read `searchParams` and are therefore dynamic, need no `loading.tsx` of
// their own. `/showcase` has its own (`showcase/loading.tsx` → `ShowcaseFeedSkeleton`): a launch
// feed settles into a column of rows, and a hero-shaped placeholder over it was a visible lie.
//
// The route names in this comment were previously "landing, ranking, favorite, daily, genre" —
// stale copy inherited verbatim from the `/anime` page this replaced. None of those routes ever
// existed here.
//
// It approximates the HUB (masthead, then the first lane), which is the heaviest of the routes it
// covers and the one most likely to be a visitor's first paint. An index grid settles slightly
// differently; a skeleton per remaining route would be four more files to keep honest for a
// fraction of a second each.
//
// ⚠️ IT TRACKS THE HUB'S LAYOUT, AND THE LAYOUT CHANGED TWICE. The header comes first and the hero
// second, and from `lg` up the two share one masthead row with the hero on the right. The first
// lane opens on its inset hairline rule with heading and question on one line. The hero block
// matches `blueprints-hero-carousel.tsx` exactly, mobile cap included; if that frame or the
// masthead grid changes again, this changes with it or the page jumps when the slides resolve.
export default function BlueprintsLoadingSkeleton() {
  return (
    <div className="animate-pulse pb-12">
      <div className="grid gap-5 px-4 pt-6 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10 lg:px-6 lg:pt-8 lg:pb-10">
        <div className="space-y-3">
          <div className="h-8 w-44 rounded-full bg-muted lg:h-9" />
          <div className="h-4 w-full max-w-xl rounded-full bg-muted" />
          <div className="h-4 w-2/3 max-w-md rounded-full bg-muted" />
        </div>
        <div className="h-44 w-full rounded-xl bg-muted md:aspect-video md:h-auto md:w-82" />
      </div>

      {/* The first lane: its rule, heading and question, and one row of teardown cards. */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <div className="h-6 w-28 rounded-full bg-muted" />
          <div className="h-4 w-56 rounded-full bg-muted" />
        </div>
        <div className="mt-4 grid gap-x-4 gap-y-8 sm:grid-cols-2 xl:grid-cols-4">
          <div className="aspect-video rounded-lg bg-muted" />
          <div className="aspect-video rounded-lg bg-muted" />
          <div className="hidden aspect-video rounded-lg bg-muted xl:block" />
          <div className="hidden aspect-video rounded-lg bg-muted xl:block" />
        </div>
      </div>
    </div>
  );
}
