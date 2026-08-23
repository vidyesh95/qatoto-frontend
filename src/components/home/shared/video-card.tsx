// TRANSPORT: props-only — the shared video card. Renders what it is handed; fetches nothing.

import Image from "next/image";
import Link from "next/link";

import RelativeTime from "@/components/home/shared/relative-time";
import VideoCardMenu from "@/components/home/shared/video-card-menu";
import type { VideoCardProps } from "@/types/video";

/**
 * Widths the thumbnail actually occupies in the feed and search grids, which are
 * `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
 *
 * WITHOUT THIS the srcset is derived from `width={256}` alone while `w-full` stretches the
 * image to the column, so a ~380px slot can be filled by a 256w file. It matters most for a
 * custom Cloudinary thumbnail, which is stored at up to 1280px and has real detail to lose;
 * a YouTube `hqdefault` is only 480px wide, so there is nothing sharper to ask for.
 *
 * A surface whose cards are NOT a quarter-viewer-width grid — the watch rail — must pass its
 * own, or it over-fetches on every card.
 */
const GRID_THUMBNAIL_SIZES =
  "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

export default function VideoCard({
  videoId,
  hasSaved = false,
  creatorId,
  thumbnailSrc,
  profileSrc,
  title,
  channelName,
  views,
  postedAt,
  publishedAt,
  verified = false,
  hoverBg = "group-hover:bg-gray-100",
  isChannelLive = false,
  href,
  channelHref,
  isPriority = false,
  thumbnailSizes = GRID_THUMBNAIL_SIZES,
}: VideoCardProps) {
  const isLive = isChannelLive;

  const avatar = isLive ? (
    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-[#1DBDC5]">
      <div className="pointer-events-none absolute -inset-1.25 animate-live-ring rounded-full border border-[#1DBDC5] will-change-transform" />
      <Image
        src={profileSrc}
        width={34}
        height={34}
        alt="profile image"
        className="size-8.5 animate-live-image rounded-full will-change-transform"
      />
    </div>
  ) : (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-foreground">
      <Image
        src={profileSrc}
        width={34}
        height={34}
        alt="profile image"
        className="size-8.5 rounded-full"
      />
    </div>
  );

  return (
    <div className="group relative w-full cursor-pointer">
      <div
        className={`pointer-events-none absolute inset-0 -z-10 -m-2 rounded-2xl transition-colors ${hoverBg}`}
      />
      {/* Stretched overlay link — covers the whole card, navigates to the video.
          Interactive children (channel, more options) sit above it via z-10. */}
      {href && <Link href={href} aria-label={title} className="absolute inset-0 z-0 rounded-xl" />}
      {/*
        `object-cover` IS LOAD-BEARING — neither thumbnail source is guaranteed 16:9, and the
        CSS default for an <img> is `object-fit: fill`, which squashes rather than crops.

        A YouTube-sourced row stores oEmbed's `thumbnail_url` verbatim, and oEmbed answers
        `hqdefault.jpg` — 480×360, a 4:3 frame with BLACK BARS BAKED INTO THE JPEG. The
        content sits in an exactly-centred 480×270, so cropping 4:3 to 16:9 removes precisely
        the bars and loses no picture.

        A custom thumbnail is re-encoded by the backend with sharp `fit: "inside"` — downscale
        only, never a crop — so the creator's own aspect ratio survives onto the wire and a
        tall upload arrives tall.
      */}
      <Image
        src={thumbnailSrc}
        width={256}
        height={144}
        alt="thumbnail"
        priority={isPriority}
        sizes={thumbnailSizes}
        className="aspect-video h-auto w-full rounded-xl object-cover"
      />
      <div className="flex flex-row items-start gap-2 pt-2">
        {channelHref ? (
          <Link href={channelHref} className="relative z-10 shrink-0">
            {avatar}
          </Link>
        ) : (
          avatar
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm">{title}</p>
          <div className="flex flex-row items-center gap-1">
            {channelHref ? (
              <Link
                href={channelHref}
                className="relative z-10 text-xs text-[#6F7979] hover:text-foreground"
              >
                {channelName}
              </Link>
            ) : (
              <span className="text-xs text-[#6F7979]">{channelName}</span>
            )}
            {verified && (
              <Image
                src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                width={16}
                height={16}
                alt="verified"
              />
            )}
          </div>
          <div className="flex flex-row flex-wrap items-center gap-x-1">
            <span className="text-xs text-[#6F7979]">{views}</span>
            <Image
              src={"/icons/circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
              width={4}
              height={4}
              alt="separator"
            />
            {/*
              A feed-sourced card carries an ISO `publishedAt` and an empty `postedAt`, and the
              relative label is computed in the browser by <RelativeTime>. The mock surfaces
              still hand-author `postedAt`. Whichever one is present renders; never both.
            */}
            {publishedAt == null ? (
              <span className="text-xs text-[#6F7979]">{postedAt}</span>
            ) : (
              <RelativeTime isoInstant={publishedAt} className="text-xs text-[#6F7979]" />
            )}
          </div>
        </div>
        {/*
          A CLIENT ISLAND, so this file stays a server component. The menu owns its own trigger
          button — it must, because the trigger has to swallow the stretched link's click.
        */}
        <VideoCardMenu
          {...(videoId === undefined ? {} : { videoId })}
          title={title}
          {...(href === undefined ? {} : { shareUrl: href })}
          hasSaved={hasSaved}
          {...(creatorId === undefined ? {} : { creatorId })}
          channelName={channelName}
          thumbnailSrc={thumbnailSrc}
        />
      </div>
    </div>
  );
}
