export function StudioSubmissionsSkeleton({ loadingText }: { readonly loadingText: string }) {
  return (
    <div className="mt-6 max-w-3xl">
      <p className="sr-only">{loadingText}</p>
      <ul aria-hidden="true" className="animate-pulse">
        {[0, 1, 2].map((placeholderIndex) => (
          <li
            key={placeholderIndex}
            className="flex items-start justify-between gap-4 border-t border-border py-4"
          >
            <div className="w-full max-w-md space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-muted" />
              <div className="h-3 w-1/2 rounded-full bg-muted" />
            </div>
            <div className="h-6 w-20 shrink-0 rounded-full bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
