// TRANSPORT: props-only — renders links, no network.
//
// The "next page" control for a keyset-paginated server read.
//
// THIS IS NOT `LoadMoreControl` AND MUST NOT REUSE IT. That one takes
// `onLoadNextPage: () => void` and belongs to a client island driving `useInfiniteQuery`.
// Every public store list is a SERVER component, so its next page is a URL — the same way
// `filter-chip-row.tsx`'s chips are URLs. Both controls survive because there are two
// transports, and collapsing them would force a page to become a client component in order
// to paginate.
//
// The URL matters beyond tidiness: a cursor in the query string is shareable, bookmarkable
// and survives back-navigation, and a filtered page-3 link sent to a colleague opens on
// page 3. A `useState` cursor does none of that.

import Link from "next/link";

/**
 * A link to the next keyset page, or nothing when there is no next page.
 *
 * `nextCursor` is an OPAQUE server token. It is handed straight to `buildCursorHref` and
 * never parsed, compared or incremented — the backend encodes a sort key and a tie-break id
 * into it and answers `422` for anything it did not mint.
 *
 * Both `hasMore` and a non-null `nextCursor` are required before a link renders. They should
 * always agree, and if they ever do not, the honest reading is "no more pages": a Next
 * button that navigates to a page the server cannot build is worse than a missing one.
 *
 * `scroll={false}` because the results region is below the filters — scrolling to the top of
 * the document on page 2 puts the visitor above the thing they just paged.
 */
export default function CursorPageControl({
  nextCursor,
  hasMore,
  buildCursorHref,
  label,
}: {
  nextCursor: string | null;
  hasMore: boolean;
  buildCursorHref: (cursor: string) => string;
  label: string;
}) {
  if (!hasMore || nextCursor === null) return null;

  return (
    <nav className="flex justify-center px-4 py-6 lg:px-6" aria-label={label}>
      <Link
        href={buildCursorHref(nextCursor)}
        scroll={false}
        className="rounded-full bg-background px-5 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted"
      >
        {label}
      </Link>
    </nav>
  );
}
