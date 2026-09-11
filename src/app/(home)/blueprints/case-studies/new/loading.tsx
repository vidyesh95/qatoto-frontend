// TRANSPORT: props-only — a pulsing placeholder shaped like the case-study form. No data.
//
// ⚠️ IT EXISTS BECAUSE `blueprints/loading.tsx` WOULD OTHERWISE COVER THIS ROUTE, and that one is
// shaped like the HUB. Navigating to the form would flash lanes that never arrive, the "skeleton
// promising a layout that does not exist" failure `showcase/new/loading.tsx` records.
export default function NewCaseStudyLoading() {
  return (
    <div className="animate-pulse px-4 pt-5 pb-12 lg:px-6" aria-hidden="true">
      <div className="max-w-2xl">
        <div className="h-3 w-24 rounded-full bg-muted" />
        <div className="mt-2 h-7 w-52 rounded-full bg-muted" />
        <div className="mt-3 h-4 w-full rounded-full bg-muted" />
        <div className="mt-2 h-4 w-3/4 rounded-full bg-muted" />

        <div className="mt-8 space-y-5">
          <div className="h-4 w-24 rounded-full bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
          <div className="h-10 w-full rounded-lg bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 w-full rounded-lg bg-muted" />
            <div className="h-10 w-full rounded-lg bg-muted" />
          </div>
        </div>

        <div className="mt-8 space-y-2 border-t border-border pt-6">
          <div className="h-4 w-32 rounded-full bg-muted" />
          <div className="h-16 w-full rounded-xl bg-muted" />
          <div className="h-16 w-full rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
