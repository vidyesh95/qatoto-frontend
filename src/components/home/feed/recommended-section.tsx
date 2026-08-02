// TRANSPORT: props-only — rows come from `feed-shell`'s server read. Fetches nothing.
//
// SERVER-RENDERED ON PURPOSE: this is the top of the feed, so its first thumbnail is the LCP
// candidate for the whole page. Rendering it in a client island would put the largest image
// behind a hydrate-then-fetch round trip and cost the metric outright.
//
// "Recommended" and "Explore" are ONE backend stream sliced by `splitFeedPage` — there is no
// second request and no `recommended` field on the wire.

import SectionDivider from "@/components/home/feed/section-divider";
import FeedStatusPanel from "@/components/home/feed/feed-status-panel";
import VideoCard from "@/components/home/shared/video-card";
import { toVideoCardProps, type FeedVideo } from "@/lib/feed/schemas";

/**
 * How many cards get `priority` on their thumbnail.
 *
 * Roughly one desktop row. Marking every card priority would make none of them priority in
 * practice — the browser would fetch twelve full-size images at once and the one that matters
 * would queue behind eleven that do not.
 */
const EAGER_THUMBNAIL_COUNT = 6;

export default function RecommendedSection({ videos }: { readonly videos: FeedVideo[] }) {
  return (
    <div>
      <SectionDivider title="RECOMMENDED FOR YOU" />
      {videos.length === 0 ? (
        // Reached on a genuinely empty catalogue, or when a viewer has watched everything and
        // the backend's relaxation ladder still came up short. Not an error — the read
        // succeeded, there is simply nothing to show.
        <FeedStatusPanel message="Nothing to recommend yet. Check back once more creators publish." />
      ) : (
        <div className="grid grid-cols-1 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
          {videos.map((video, index) => (
            <VideoCard
              key={video.videoId}
              {...toVideoCardProps(video, { isPriority: index < EAGER_THUMBNAIL_COUNT })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
