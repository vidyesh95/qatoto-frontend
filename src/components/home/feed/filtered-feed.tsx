// TRANSPORT: client-query — seeded with the server's first filtered page, then paginates.
//
// ONE GRID INSTEAD OF FOUR SECTIONS, not four filtered sections.
//
// Spotlight means "the three trending videos" and has no meaning inside a category filter; a
// "Recommended for you" heading over a `recently_uploaded` list is a lie about what the reader
// asked for; and the tile grid is a way IN to a filter, not something to show once you are
// already inside one. So when any chip is active the page collapses to a single titled grid
// (HOME_STRUCTURE §5.1).

"use client";

import LoadMoreControl from "@/components/home/shared/load-more-control";
import SectionDivider from "@/components/home/feed/section-divider";
import FeedStatusPanel from "@/components/home/feed/feed-status-panel";
import VideoCard from "@/components/home/shared/video-card";
import type { FeedVideoListFilter } from "@/hooks/feed/keys";
import { useFeedVideosInfiniteQuery } from "@/hooks/feed/queries";
import { toVideoCardProps, type FeedVideoPage } from "@/lib/feed/schemas";

/**
 * The heading for the active facet.
 *
 * A category shows its own LABEL, not its slug — `solar-cold-storage` is a URL identity, not a
 * thing to put in a `<h2>`. The label is resolved by the caller from `/feed/categories`,
 * because this island has no reason to hold the whole taxonomy.
 */
function toFilteredHeading(filter: FeedVideoListFilter, categoryLabel: string | undefined): string {
  if (filter.categorySlug !== undefined)
    return (categoryLabel ?? filter.categorySlug).toUpperCase();
  switch (filter.mode) {
    case "trending":
      return "TRENDING";
    case "new_to_you":
      return "NEW TO YOU";
    case "recently_uploaded":
      return "RECENTLY UPLOADED";
    case "watched":
      return "WATCHED";
    case "all":
      return "ALL VIDEOS";
    default: {
      const exhaustiveCheck: never = filter.mode;
      return exhaustiveCheck;
    }
  }
}

/** What "nothing here" means for each facet — a generic line would say nothing useful. */
function toEmptyMessage(filter: FeedVideoListFilter): string {
  if (filter.categorySlug !== undefined) {
    return "No videos in this category yet.";
  }
  return filter.mode === "watched"
    ? "You haven't watched anything yet."
    : "No videos match this filter yet.";
}

export default function FilteredFeed({
  filter,
  initialPage,
  limit,
  categoryLabel,
}: {
  readonly filter: FeedVideoListFilter;
  readonly initialPage: FeedVideoPage;
  readonly limit: number;
  readonly categoryLabel?: string;
}) {
  const feed = useFeedVideosInfiniteQuery({ filter, initialPage, limit });

  return (
    <section className="space-y-8 py-8">
      <div>
        <SectionDivider title={toFilteredHeading(filter, categoryLabel)} />
        {feed.videos.length === 0 ? (
          <FeedStatusPanel message={toEmptyMessage(filter)} />
        ) : (
          <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
            {feed.videos.map((video, index) => (
              <VideoCard
                key={video.videoId}
                {...toVideoCardProps(video, { isPriority: index < 6 })}
              />
            ))}
          </div>
        )}
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
    </section>
  );
}
