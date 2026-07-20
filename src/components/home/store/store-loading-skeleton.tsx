// Minimal route-segment loading placeholder shared by every store route
// (landing, category, pathway, product). Pure pulsing blocks approximating a
// hero banner plus a few product rails — no props, no data, no logic (UI +
// mock data phase, see CLAUDE.md).
export default function StoreLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-8 pb-8">
      <div className="aspect-video w-full bg-muted lg:aspect-[21/9]" />
      <div className="space-y-3 px-4 lg:px-6">
        <div className="h-4 w-32 rounded-full bg-muted" />
        <div className="flex gap-4 overflow-hidden">
          <div className="aspect-square w-24 shrink-0 rounded-xl bg-muted" />
          <div className="aspect-square w-24 shrink-0 rounded-xl bg-muted" />
          <div className="aspect-square w-24 shrink-0 rounded-xl bg-muted" />
          <div className="aspect-square w-24 shrink-0 rounded-xl bg-muted" />
        </div>
      </div>
      <div className="space-y-3 px-4 lg:px-6">
        <div className="h-4 w-40 rounded-full bg-muted" />
        <div className="flex gap-4 overflow-hidden">
          <div className="aspect-square w-40 shrink-0 rounded-xl bg-muted" />
          <div className="aspect-square w-40 shrink-0 rounded-xl bg-muted" />
          <div className="aspect-square w-40 shrink-0 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
