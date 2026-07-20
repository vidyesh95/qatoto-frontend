// Minimal route-segment loading placeholder shared by every R&D route. Pure
// pulsing blocks approximating a header bar plus a few content cards — no
// props, no data, no logic (UI + mock data phase, see CLAUDE.md).
export default function ResearchAndDevelopmentLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8 px-4 pb-8 lg:px-6">
      <div className="space-y-3 pt-4">
        <div className="h-6 w-48 rounded-full bg-muted" />
        <div className="h-4 w-72 rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="aspect-video rounded-2xl bg-muted" />
        <div className="aspect-video rounded-2xl bg-muted" />
        <div className="aspect-video rounded-2xl bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-32 rounded-full bg-muted" />
        <div className="h-24 w-full rounded-xl bg-muted" />
        <div className="h-24 w-full rounded-xl bg-muted" />
      </div>
    </div>
  );
}
