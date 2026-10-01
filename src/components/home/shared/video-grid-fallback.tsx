export function VideoGridFallback() {
  return (
    <div aria-hidden>
      <div className="h-14 w-full" />
      <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_unused, index) => index).map((skeletonIndex) => (
          <div key={skeletonIndex} className="space-y-2">
            <div className="aspect-video w-full rounded-xl bg-gray-200" />
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
