"use client";

// TRANSPORT: client-query — pages `GET /channels/:handle/videos` on top of the server's page one.

import LoadMoreControl from "@/components/home/shared/load-more-control";
import StatusPanel from "@/components/home/shared/status-panel";
import VideoCard from "@/components/home/shared/video-card";
import { useChannelVideosQuery } from "@/hooks/channels";
import { toVideoCardProps, type FeedVideo } from "@/lib/feed/schemas";

/**
 * The channel's video grid.
 *
 * `toVideoCardProps` AND `VideoCard`, UNCHANGED. The backend answers this route with the feed's
 * own row shape, so the card that renders a video on the home page renders it here — including
 * its `channelHref`, which now points at a page that exists. That circularity is the fix: the
 * grid on a channel page links to channel pages.
 *
 * THE SAME COLUMN COUNTS AS THE HOME FEED (`home.tsx`), because a video card has one size on
 * this platform and a channel is not a special case of it.
 */
export default function ChannelVideosGrid({
  handle,
  initialRows,
  initialNextCursor,
}: {
  readonly handle: string;
  /** Null when the server-side read FAILED; the island then fetches page one itself. */
  readonly initialRows: FeedVideo[] | null;
  readonly initialNextCursor: string | null;
}) {
  const videosList = useChannelVideosQuery({ handle, initialRows, initialNextCursor });

  if (videosList.isLoadingFirstPage) {
    return <p className="px-4 py-8 text-sm text-muted-foreground lg:px-6">Loading videos…</p>;
  }

  if (videosList.firstPageErrorMessage !== null) {
    return (
      <StatusPanel
        message={videosList.firstPageErrorMessage}
        className="mx-4 my-8 border border-border px-6 py-16 lg:mx-6"
      />
    );
  }

  if (videosList.rows.length === 0) {
    return (
      <StatusPanel
        // "Nothing PUBLIC", not "nothing". A creator reading their own channel may have drafts,
        // scheduled videos and unlisted ones this page will never show, and telling them they
        // have no videos would be false.
        message="This channel hasn't published any videos yet."
        className="mx-4 my-8 border border-border px-6 py-16 lg:mx-6"
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {videosList.rows.map((video) => (
          <VideoCard key={video.videoId} {...toVideoCardProps(video)} />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <LoadMoreControl
          hasNextPage={videosList.hasNextPage}
          isFetchingNextPage={videosList.isFetchingNextPage}
          errorMessage={videosList.loadMoreErrorMessage}
          onLoadNextPage={videosList.loadNextPage}
          label="Load more videos"
        />
      </div>
    </>
  );
}
