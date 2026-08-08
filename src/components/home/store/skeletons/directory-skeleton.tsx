// TRANSPORT: props-only — static shapes, no network.
//
// The Suspense fallback for a tile directory: the category index, and the provider directory
// in Batch B. Distinct from `catalog-results-skeleton.tsx` because a directory is a coarse
// grid of large tiles with no filter row above it, and animating five chips that never
// arrive is its own small lie.

export default function DirectorySkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 lg:px-6" aria-hidden>
      <div className="h-7 w-40 rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-72 rounded bg-muted" />

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_unused, tileIndex) => (
          <div key={tileIndex} className="flex flex-col gap-2">
            <div className="aspect-video w-full rounded-xl bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
