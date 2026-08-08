// TRANSPORT: props-only — static shapes, no network.
//
// The Suspense fallback for a list of rows: the provider directory, and the RFQ / order / offering
// queues in later batches. Rows rather than tiles, because a row-shaped skeleton resolving into a
// row-shaped list is the only version that does not visibly reflow.

export default function WorkQueueSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 lg:px-6" aria-hidden>
      <div className="h-7 w-48 rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-muted" />

      {/* Filter chip row. */}
      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }, (_unused, chipIndex) => (
          <div key={chipIndex} className="h-7 w-28 shrink-0 rounded-full bg-muted" />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }, (_unused, rowIndex) => (
          <div key={rowIndex} className="rounded-xl border border-border px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="size-10 shrink-0 rounded-full bg-muted" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            </div>
            <div className="mt-3 h-3 w-4/5 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
