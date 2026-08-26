// TRANSPORT: props-only — presentational server component. Rows arrive as props from a
// parent that read GET /research-projects/:slug/videos.
import SectionHeader from "@/components/home/research-and-development/sections/section-header";
import VideoCard from "@/components/home/shared/video-card";
import type { ProjectVideo } from "@/lib/rnd/projects.schemas";
import type { VideoCardProps } from "@/types/video";

/**
 * The venture's own film reel — every public video that named this project.
 *
 * NOBODY CURATES THIS LIST. A creator links a video to a venture once in the studio and it
 * appears here; there is no per-project playlist to maintain and nothing on this page writes.
 * That is the whole return on `video.researchProjectId` existing.
 *
 * AN EMPTY REEL IS A REAL ANSWER, not an error. Most ventures have no video, and a venture
 * whose only videos are private or unpublished shows the same nothing — the backend applies
 * the public gate, so a rail can never link to a watch page that 404s.
 *
 * REUSES `VideoCard` BUT NOT `toVideoCardProps`. That adapter is typed for `FeedVideo`, which
 * carries viewer state this read deliberately omits. The local adapter below fills only what
 * this rail can honestly state.
 */
const FALLBACK_THUMBNAIL_SRC = "/dummy/spotlight_image01.avif";
const FALLBACK_AVATAR_SRC = "/dummy/profile_image01.avif";

// Cards here sit in a 3-up rail, not the feed's 4-up grid, so they must state their own sizes
// or every card over-fetches (see GRID_THUMBNAIL_SIZES in video-card.tsx).
const REEL_THUMBNAIL_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

function toReelCardProps(video: ProjectVideo): VideoCardProps {
  return {
    videoId: video.videoId,
    thumbnailSrc: video.thumbnailUrl ?? FALLBACK_THUMBNAIL_SRC,
    profileSrc: video.creator.imageUrl ?? FALLBACK_AVATAR_SRC,
    title: video.title,
    channelName: video.creator.name,
    // The reel has no view counts — this read does not join `video_stats`, and a "0 views"
    // label would be a number nobody measured.
    views: "",
    // Empty string plus `publishedAt`, per VideoCardProps: a relative label computed during a
    // server render freezes into the cache and then disagrees with the client on hydrate.
    postedAt: "",
    ...(video.publishedAt === null ? {} : { publishedAt: video.publishedAt }),
    // `/channel/{handle}`, matching `toVideoCardProps`. This used to build `/@{handle}` — a
    // THIRD URL shape for a destination that did not exist at all, so neither this nor the feed's
    // could have been right. One page now, one link shape.
    ...(video.creator.handle === null
      ? {}
      : { channelHref: `/channel/${encodeURIComponent(video.creator.handle)}` }),
    href: `/watch?v=${encodeURIComponent(video.videoId)}`,
    thumbnailSizes: REEL_THUMBNAIL_SIZES,
  };
}

export default function VentureVideoReel({ videos }: { readonly videos: ProjectVideo[] }) {
  if (videos.length === 0) {
    return (
      <section className="space-y-1">
        <SectionHeader title="Videos from this venture" />
        <p className="px-4 text-sm text-muted-foreground lg:px-6">
          No public video yet. A video linked to this venture in the studio shows up here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-1">
      <SectionHeader title="Videos from this venture" />
      <div className="grid grid-cols-1 gap-4 px-4 pt-2 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
        {videos.map((video) => (
          <VideoCard key={video.videoId} {...toReelCardProps(video)} />
        ))}
      </div>
    </section>
  );
}
