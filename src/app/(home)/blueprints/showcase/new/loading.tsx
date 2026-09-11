// TRANSPORT: props-only — a pulsing placeholder shaped like the launch form. No data.
//
// ⚠️ IT EXISTS BECAUSE `showcase/loading.tsx` WOULD OTHERWISE COVER THIS ROUTE TOO, and that one is
// shaped like the launch FEED. Navigating to the form would flash a column of launch rows that never
// arrives, which is the "skeleton promising a layout that does not exist" failure the hub skeleton's
// own comment records.
export default function NewShowcaseLaunchLoading() {
  return (
    <div className="animate-pulse px-4 pt-5 pb-12 lg:px-6" aria-hidden="true">
      <div className="max-w-2xl">
        <div className="h-3 w-20 rounded-full bg-muted" />
        <div className="mt-2 h-7 w-44 rounded-full bg-muted" />
        <div className="mt-3 h-4 w-full rounded-full bg-muted" />
        <div className="mt-2 h-4 w-3/4 rounded-full bg-muted" />

        <div className="mt-8 space-y-5">
          <div className="h-4 w-24 rounded-full bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
          <div className="h-20 w-full rounded-lg bg-muted" />
        </div>

        <div className="mt-8 flex items-start gap-4 border-t border-border pt-6">
          <div className="size-32 shrink-0 rounded-xl bg-muted" />
          <div className="w-full space-y-2">
            <div className="h-4 w-1/2 rounded-full bg-muted" />
            <div className="h-9 w-32 rounded-full bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
