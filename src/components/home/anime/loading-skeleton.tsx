// Minimal route-segment loading placeholder shared by every anime route
// (landing, ranking, favorite, daily, genre). Pure pulsing blocks
// approximating a hero banner plus a media row — no props, no data, no logic
// (UI + mock data phase, see CLAUDE.md).
export default function AnimeLoadingSkeleton() {
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
