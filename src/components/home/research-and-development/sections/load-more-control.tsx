// TRANSPORT: props-only — presentational. Fetches nothing; it renders whatever a
// keyset island's `useKeysetList` is currently doing.

/**
 * The one load-more control on the R&D surface.
 *
 * IT RENDERS NOTHING WHEN THERE IS NO NEXT PAGE. Every keyset read here answers with a
 * token or `null`, and `null` means the server has no more rows — so the control's absence
 * is the end-of-list signal. A permanently visible button that returns nothing reads as a
 * broken feed.
 *
 * A FAILED LOAD-MORE KEEPS THE ROWS AND SAYS SO. The rows already on screen came from a
 * successful read and stay; the failure is reported beside the button with the backend's
 * own message, verbatim. Swallowing it would leave a button that appears to do nothing —
 * and on these lists a `422` about a cursor the server itself issued is a real finding, not
 * noise. Never retry it silently: a feed that restarts itself shows duplicate rows and gets
 * reported as a backend bug.
 */
export default function LoadMoreControl({
  hasNextPage,
  isFetchingNextPage,
  errorMessage,
  onLoadNextPage,
  label,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  errorMessage: string | null;
  onLoadNextPage: () => void;
  /** Names what is being loaded — "Load older entries", "Load more claims". */
  label: string;
}) {
  if (!hasNextPage && errorMessage === null) return null;

  return (
    <div className="space-y-2 pt-2">
      {hasNextPage && (
        <button
          type="button"
          onClick={onLoadNextPage}
          disabled={isFetchingNextPage}
          className="w-full rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 disabled:opacity-50"
        >
          {isFetchingNextPage ? "Loading…" : label}
        </button>
      )}
      {errorMessage !== null && (
        <p role="alert" className="text-xs text-red-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
