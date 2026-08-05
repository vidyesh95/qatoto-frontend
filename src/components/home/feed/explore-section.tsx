// TRANSPORT: client-query — seeded with the server's page-1 tail, then paginates.
//
// The infinite half of the homepage. Everything above it is server-rendered; this is the one
// section that keeps fetching, because it is the one the reader scrolls into.
//
// THE SEED IS THE WHOLE TRICK. Page one already arrived with the server render as part of the
// SAME `GET /feed/videos` response the Recommended grid was sliced from, so mounting this
// island costs zero requests. The `rankSeed` from that response is pinned and resent on every
// later page — without it page 2 ranks against a freshly minted seed, the exploration term
// reshuffles, and the reader meets a video they already scrolled past.

"use client";

import LoadMoreControl from "@/components/home/shared/load-more-control";
import SectionDivider from "@/components/home/feed/section-divider";
import VideoCard from "@/components/home/shared/video-card";
import { useFeedVideosInfiniteQuery } from "@/hooks/feed/queries";
import type { FeedVideoListFilter } from "@/hooks/feed/keys";
import { RECOMMENDED_SLICE_LENGTH } from "@/lib/feed/slice-feed-page";
import { toVideoCardProps, type FeedVideoPage } from "@/lib/feed/schemas";

export default function ExploreSection({
  filter,
  initialPage,
  limit,
}: {
  readonly filter: FeedVideoListFilter;
  readonly initialPage: FeedVideoPage;
  readonly limit: number;
}) {
  const feed = useFeedVideosInfiniteQuery({ filter, initialPage, limit });

  // The accumulated list still contains page one IN FULL, including the eight rows the
  // Recommended grid rendered above. Slicing here rather than seeding the hook with a trimmed
  // page is deliberate: the hook must page against what the server actually returned, and a
  // seed missing eight rows would make its `pagination` describe a page that never existed.
  const exploreVideos = feed.videos.slice(RECOMMENDED_SLICE_LENGTH);

  // Page one had 8 or fewer rows AND there is nothing after it. Not an error and not worth a
  // panel — Recommended above already said what there is.
  if (exploreVideos.length === 0 && !feed.hasNextPage) return null;

  return (
    <div>
      <SectionDivider title="EXPLORE" />
      <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {exploreVideos.map((video) => (
          <VideoCard key={video.videoId} {...toVideoCardProps(video)} />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <LoadMoreControl
          hasNextPage={feed.hasNextPage}
          isFetchingNextPage={feed.isFetchingNextPage}
          errorMessage={feed.loadMoreErrorMessage}
          onLoadNextPage={feed.loadNextPage}
          label="Load more videos"
        />
      </div>
    </div>
  );
}
