// TRANSPORT: props-only — rows come from `feed-shell`'s server read. Fetches nothing.
//
// The three trending videos. Backed by `GET /feed/videos?mode=trending&limit=3` — the SAME
// route as the rest of the feed, not a second endpoint. One ranking contract, one cache story,
// one place a ranking bug can live (HOME_BACKEND §0 Rule 3).
//
// Trending is recomputed HOURLY on the backend, unlike the nightly quality scores. A
// "trending" rail rebuilt once a day is a lie about what the word means.

import SectionDivider from "@/components/home/feed/section-divider";
import SpotlightVideoCards, {
  type SpotlightVideoCardsProps,
} from "@/components/home/feed/spotlight-video-cards";
import type { FeedVideo } from "@/lib/feed/schemas";

/**
 * Slot order for the expanding-tile layout, which needs to know which tile is the middle one.
 * Fewer than three rows fills from the left and the layout still works.
 */
const SPOTLIGHT_POSITIONS: readonly SpotlightVideoCardsProps["position"][] = [
  "left",
  "center",
  "right",
];

/** The same placeholder the feed mapper uses for a row with no thumbnail. */
const PLACEHOLDER_THUMBNAIL_SRC = "/dummy/spotlight_image01.avif";

export default function SpotlightSection({ videos }: { readonly videos: FeedVideo[] }) {
  // Nothing trending yet is a young catalogue, not a failure — and an empty bordered panel
  // where a full-bleed image rail belongs looks more broken than the absence does.
  if (videos.length === 0) return null;

  return (
    <div>
      <SectionDivider title="SPOTLIGHT" />
      <div className="group/spot flex flex-col items-center gap-4 px-4 py-2 md:h-48 md:flex-row lg:h-64 lg:px-6 xl:h-93">
        {videos.slice(0, SPOTLIGHT_POSITIONS.length).map((video, index) => (
          <SpotlightVideoCards
            key={video.videoId}
            imageSrc={video.thumbnailUrl ?? PLACEHOLDER_THUMBNAIL_SRC}
            alt={video.title}
            position={SPOTLIGHT_POSITIONS[index]}
            href={`/watch?v=${encodeURIComponent(video.videoId)}`}
          />
        ))}
      </div>
    </div>
  );
}
