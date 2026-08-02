"use client";

// TRANSPORT: client-query — React Query over `@/lib/feed/api`.
//
// Every hook here is SEEDED FROM THE SERVER. The page bodies these islands sit inside are
// server components that already read page one with the caller's cookie; passing that page as
// `initialData` is what stops the browser repeating the request on mount. Without it the
// homepage fetches its feed twice on first paint and the second fetch is the one the user
// waits for.

import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { useRef } from "react";

import { feedKeys, type FeedVideoListFilter } from "@/hooks/feed/keys";
import {
  listFeedCategories,
  listFeedVideos,
  listVideoComments,
  type ListVideoCommentsFilter,
} from "@/lib/feed/api";
import type { ContentCategory, FeedVideo, FeedVideoPage, VideoComment } from "@/lib/feed/schemas";
import { unwrap, type ApiRequestError } from "@/lib/http";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";

/**
 * The category list, seeded from the server render.
 *
 * `staleTime: Infinity` because categories change by product decision — a moderator publishing
 * one — not by the minute, and a refetch on every window focus would re-render the chip row
 * under the user's cursor for nothing.
 */
export function useFeedCategoriesQuery(initialCategories: ContentCategory[]) {
  return useQuery<ContentCategory[], ApiRequestError>({
    queryKey: feedKeys.categories(),
    queryFn: async () => unwrap(await listFeedCategories()),
    initialData: initialCategories,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export interface FeedVideosInfiniteResult {
  readonly videos: FeedVideo[];
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly loadMoreErrorMessage: string | null;
  readonly loadNextPage: () => void;
}

/**
 * Accumulates OFFSET-paginated feed pages on top of a server-rendered first page.
 *
 * NOT `useKeysetList`. That hook exists for reads whose next-page token is opaque and
 * server-issued; `GET /feed/videos` pages by an arithmetic `?page=` and carries a `rankSeed`
 * that must survive across requests. The two are different enough that sharing one hook would
 * mean a token type of `string | number | { page, seed }`, which is not a token any more.
 *
 * THE SEED IS PINNED IN A REF, NOT IN THE QUERY KEY. It is minted server-side on the first
 * request and echoed on every response; sending page one's seed back with page two is the
 * entire mechanism that makes exploration deterministic. A random exploration term would
 * reshuffle the feed between pages and show the same video twice — which is also why the
 * backend forbids `Math.random()` in its scorer.
 *
 * A ref rather than state because writing it must not re-render: the value is an input to the
 * NEXT request, never something rendered.
 */
export function useFeedVideosInfiniteQuery({
  filter,
  initialPage,
  limit,
}: {
  readonly filter: FeedVideoListFilter;
  readonly initialPage: FeedVideoPage;
  readonly limit: number;
}): FeedVideosInfiniteResult {
  const pinnedRankSeedRef = useRef(initialPage.rankSeed);

  // Typed explicitly rather than passed as a literal: an object literal here makes TypeScript
  // fall through to `useInfiniteQuery`'s last overload.
  const seededData: InfiniteData<FeedVideoPage, number> = {
    pages: [initialPage],
    pageParams: [initialPage.pagination.page],
  };

  const query = useInfiniteQuery<
    FeedVideoPage,
    ApiRequestError,
    InfiniteData<FeedVideoPage, number>,
    QueryKey,
    number
  >({
    queryKey: feedKeys.videos(filter),
    queryFn: async ({ pageParam }) => {
      const page = unwrap(
        await listFeedVideos({
          mode: filter.mode,
          ...(filter.categorySlug === undefined ? {} : { categorySlug: filter.categorySlug }),
          page: pageParam,
          limit,
          rankSeed: pinnedRankSeedRef.current,
        }),
      );
      // The server echoes the seed it actually ranked with. Trusting its answer rather than
      // our own request means a seed the backend rejected as malformed — it silently mints a
      // replacement — does not leave every later page asking for one it will not honour.
      pinnedRankSeedRef.current = page.rankSeed;
      return page;
    },
    initialPageParam: initialPage.pagination.page,
    getNextPageParam: (lastPage) =>
      // BOTH CLAUSES ARE LOAD-BEARING. `pagination.total` is counted under the candidate
      // filter, BEFORE the diversity permutation and the page slice — so `totalPages` can
      // promise a page that comes back empty. Stopping only on `page >= totalPages` leaves an
      // infinite scroll spinning on nothing; stopping only on an empty page never terminates
      // a well-behaved list early. `undefined`, not null, is how React Query is told to stop.
      lastPage.data.length === 0 || lastPage.pagination.page >= lastPage.pagination.totalPages
        ? undefined
        : lastPage.pagination.page + 1,
    initialData: seededData,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    videos: query.data.pages.flatMap((page) => page.data),
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    // Only a load-more failure can surface here: page one came from the server, so
    // `query.error` is never the initial read.
    loadMoreErrorMessage: query.error === null ? null : query.error.message,
    loadNextPage: () => {
      void query.fetchNextPage();
    },
  };
}

/**
 * The comment thread — keyset, unlike the feed, because `GET /videos/:id/comments` answers a
 * server-issued `nextCursor` beside a bare `data` array.
 *
 * `parentCommentId` is part of the query key: the top-level thread and one comment's replies
 * are different lists in different sort orders served by the same route.
 */
export function useVideoCommentsList({
  videoId,
  parentCommentId,
  initialRows,
  initialNextCursor,
  limit,
}: {
  readonly videoId: string;
  readonly parentCommentId?: string;
  readonly initialRows: VideoComment[];
  readonly initialNextCursor: string | null;
  readonly limit: number;
}): KeysetListResult<VideoComment> {
  return useKeysetList<VideoComment>({
    queryKey: feedKeys.comments(videoId, parentCommentId),
    initialPage: { rows: initialRows, nextToken: initialNextCursor },
    fetchPage: (token) => {
      const filter: ListVideoCommentsFilter = {
        limit,
        ...(parentCommentId === undefined ? {} : { parentCommentId }),
        ...(typeof token === "string" ? { cursor: token } : {}),
      };
      return listVideoComments(videoId, filter).then(toCursorKeysetPage);
    },
  });
}
