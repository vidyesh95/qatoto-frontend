// TRANSPORT: server-fetch — one read of `GET /feed/search` with the caller's cookie forwarded,
// then the island below paginates from it.
//
// THE EMPTY QUERY IS A STATE, NOT A FAILED READ. The backend requires at least one character
// after trimming, so `/search` with no `?query=` must render a prompt and issue NO request —
// calling anyway would turn "the reader has not typed anything" into a 422 error panel.

import FeedStatusPanel, {
  describeFeedError,
  FeedErrorPanel,
} from "@/components/home/feed/feed-status-panel";
import SearchResultsList from "@/components/home/search/search-results-list";
import { searchVideos } from "@/lib/feed/api";
import type { SearchVideoPage } from "@/lib/feed/schemas";
import { readSingleParam, type RawSearchParams } from "@/lib/filter-href";
import { callerRequestOptions } from "@/lib/server-http";

/** The backend's own default, restated so the seed and every later page agree on it. */
const SEARCH_PAGE_LIMIT = 24;

/**
 * The search page as the view renders it.
 *
 * No `loading` variant: this is a server component that awaits its data before it renders at
 * all, so loading is the `<Suspense>` boundary above it.
 */
type SearchViewState =
  | { readonly status: "no_query" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly query: string; readonly page: SearchVideoPage };

export default async function SearchResultsShell({
  searchParams,
}: {
  readonly searchParams: Promise<RawSearchParams>;
}) {
  // AWAITED HERE AND NOWHERE HIGHER. This component sits inside its own <Suspense>, so the
  // dynamism this await introduces stays scoped to the results region; `page.tsx` threads the
  // promise down untouched for exactly that reason.
  const resolvedSearchParams = await searchParams;

  // `query` is the name the navbar's <form> gives its input, so this key is fixed by the
  // markup a reader submits — not chosen here.
  const rawQuery = readSingleParam(resolvedSearchParams, "query");
  const query = rawQuery?.trim();

  const viewState: SearchViewState = await (async () => {
    if (query === undefined || query.length === 0) return { status: "no_query" } as const;

    const requestOptions = await callerRequestOptions();
    const result = await searchVideos({ query, limit: SEARCH_PAGE_LIMIT }, requestOptions);
    if (!result.success) {
      return { status: "error", message: describeFeedError(result.error) } as const;
    }
    return { status: "ready", query, page: result.data } as const;
  })();

  // Exhaustive switch with a `never` default (CLAUDE.md Pattern 1): adding a variant becomes a
  // compile error here rather than a silently unhandled state.
  switch (viewState.status) {
    case "no_query":
      return (
        <section className="py-8">
          <FeedStatusPanel message="Type something in the search bar to find videos." />
        </section>
      );
    case "error":
      return (
        <section className="py-8">
          <FeedErrorPanel message={viewState.message} />
        </section>
      );
    case "ready":
      return (
        <SearchResultsList
          query={viewState.query}
          initialPage={viewState.page}
          limit={SEARCH_PAGE_LIMIT}
        />
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}
