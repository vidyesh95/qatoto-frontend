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
// It approximates the HUB (header, hero, the first lane), which is the heaviest of the routes it
// covers and the one most likely to be a visitor's first paint. An index grid settles slightly
// differently; a skeleton per remaining route would be four more files to keep honest for a
// fraction of a second each.
//
// ⚠️ IT TRACKS THE HUB'S ORDER, AND THE ORDER CHANGED. The header now comes FIRST and the hero
// second, and the row of four circles is gone with `CategoryLinks` — a skeleton that still drew it
// would promise a control that no longer exists, which is a worse lie than no skeleton. The hero
// block matches `blueprints-hero-carousel.tsx` exactly, mobile cap included; if that frame changes
// again, this changes with it or the page jumps when the slides resolve.
export default function BlueprintsLoadingSkeleton() {
  return (
    <div className="animate-pulse pb-10">
      <div className="space-y-2 px-4 pt-4 lg:px-6">
        <div className="h-6 w-40 rounded-full bg-muted" />
        <div className="h-4 w-full max-w-2xl rounded-full bg-muted" />
      </div>

      <div className="flex px-4 pt-3 pb-2 lg:px-6">
        <div className="h-44 w-full rounded-xl bg-muted md:aspect-video md:h-auto md:w-82" />
      </div>

      {/* The first lane: heading, its question, and one row of teardown cards. */}
      <div className="mt-4 space-y-3">
        <div className="space-y-2 px-4 lg:px-6">
          <div className="h-5 w-32 rounded-full bg-muted" />
          <div className="h-3 w-56 rounded-full bg-muted" />
        </div>
        <div className="grid gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
          <div className="aspect-video rounded bg-muted" />
          <div className="aspect-video rounded bg-muted" />
          <div className="hidden aspect-video rounded bg-muted xl:block" />
          <div className="hidden aspect-video rounded bg-muted xl:block" />
        </div>
      </div>
    </div>
  );
}
