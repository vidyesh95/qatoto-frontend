// TRANSPORT: props-only — static shapes, no network.
//
// The Suspense fallback for a filtered result grid: search and category.
//
// A SEPARATE SHAPE FROM `store-loading-skeleton.tsx`, which is rails-shaped — a hero band
// and horizontal strips. Reusing it here would animate a layout the page never resolves
// into, which reads as a broken load rather than a pending one. The skeleton's job is to
// hold the space the content will occupy, so it has to be the right space: a chip row, then
// a grid.

export default function CatalogResultsSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 lg:px-6" aria-hidden>
      <div className="h-7 w-56 rounded-lg bg-muted" />

      {/* Filter chip row. */}
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_unused, chipIndex) => (
          <div key={chipIndex} className="h-8 w-24 shrink-0 rounded-full bg-muted" />
        ))}
      </div>

      {/* Result grid. Twelve is the page size, so the space does not jump on resolve. */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }, (_unused, cardIndex) => (
          <div key={cardIndex} className="flex flex-col gap-2">
            <div className="aspect-square w-full rounded-xl bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-1/3 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
