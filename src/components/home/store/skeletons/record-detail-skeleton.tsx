// TRANSPORT: props-only — static shapes, no network.
//
// The Suspense fallback for a single record: a service offering now, and order / quote / RFQ /
// engagement detail in later batches. Header, then label-value pairs, then two more blocks — the
// shape every commercial detail page shares.

export default function RecordDetailSkeleton() {
  return (
    <div className="animate-pulse px-4 py-4 lg:px-6" aria-hidden>
      <div className="h-6 w-32 rounded-full bg-muted" />
      <div className="mt-3 h-7 w-3/4 rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-1/3 rounded bg-muted" />
      <div className="mt-3 h-4 w-full rounded bg-muted" />
      <div className="mt-1.5 h-4 w-5/6 rounded bg-muted" />

      {/* Two CTAs. */}
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-36 rounded-full bg-muted" />
        <div className="h-9 w-32 rounded-full bg-muted" />
      </div>

      {/* Terms block — the definition-list shape. */}
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }, (_unused, rowIndex) => (
          <div key={rowIndex} className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <div className="h-3 w-32 shrink-0 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* A following section of stacked cards. */}
      <div className="mt-6 space-y-2">
        {Array.from({ length: 3 }, (_unused, cardIndex) => (
          <div key={cardIndex} className="h-16 rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
