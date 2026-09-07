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
// It approximates the HUB (hero, category links, a rail), which is the heaviest of the routes it
// covers and the one most likely to be a visitor's first paint. An index grid settles slightly
// differently; a skeleton per remaining route would be four more files to keep honest for a
// fraction of a second each.
export default function BlueprintsLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pb-10">
      <div className="flex justify-center px-4 pt-1 pb-2 lg:px-6">
        <div className="aspect-video w-full rounded-xl bg-muted md:w-82" />
      </div>
      <div className="flex gap-4 px-4 py-2 lg:px-6">
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="size-10 shrink-0 rounded-full bg-muted" />
        <div className="size-10 shrink-0 rounded-full bg-muted" />
      </div>
      <div className="space-y-3 px-4 lg:px-6">
        <div className="h-4 w-32 rounded-full bg-muted" />
        <div className="flex gap-2 overflow-hidden">
          <div className="aspect-video w-44 shrink-0 rounded bg-muted" />
          <div className="aspect-video w-44 shrink-0 rounded bg-muted" />
          <div className="aspect-video w-44 shrink-0 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
