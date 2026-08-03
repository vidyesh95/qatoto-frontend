// TRANSPORT: client-query — seeded with the server's first page of results, then paginates.
//
// ONE GRID, NO SECTIONS. A search result set has no Recommended / Spotlight / Explore split to
// make: the reader asked for one thing and the page's whole job is to rank the answers to it.

"use client";

import SectionDivider from "@/components/home/feed/section-divider";
import FeedStatusPanel from "@/components/home/feed/feed-status-panel";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import VideoCard from "@/components/home/shared/video-card";
import { useSearchVideosInfiniteQuery } from "@/hooks/feed/queries";
import { toVideoCardProps, type SearchVideoPage } from "@/lib/feed/schemas";

export default function SearchResultsList({
  query,
  initialPage,
  limit,
}: {
  readonly query: string;
  readonly initialPage: SearchVideoPage;
  readonly limit: number;
}) {
  const results = useSearchVideosInfiniteQuery({ query, initialPage, limit });

  return (
    <section className="space-y-8 py-8">
      <div>
        {/*
          The heading quotes the reader's own words rather than restating the count — the
          count is already visible as the grid, and a "3 results" line goes stale the moment
          Load more runs.
        */}
        <SectionDivider title={`RESULTS FOR “${query}”`} />
        {results.videos.length === 0 ? (
          <FeedStatusPanel message={`No videos match “${query}”.`} />
        ) : (
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
            {results.videos.map((video, index) => (
              <VideoCard
                key={video.videoId}
                {...toVideoCardProps(video, { isPriority: index < 6 })}
              />
            ))}
          </div>
        )}
        <div className="px-4 lg:px-6">
          <LoadMoreControl
            hasNextPage={results.hasNextPage}
            isFetchingNextPage={results.isFetchingNextPage}
            errorMessage={results.loadMoreErrorMessage}
            onLoadNextPage={results.loadNextPage}
            label="Load more results"
          />
        </div>
      </div>
    </section>
  );
}
