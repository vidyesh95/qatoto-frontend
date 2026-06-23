import Image from "next/image";
import Link from "next/link";

import type { VideoCardProps } from "@/types/video";

export default function VideoCard({
  thumbnailSrc,
  profileSrc,
  title,
  channelName,
  views,
  postedAt,
  verified = false,
  hoverBg = "group-hover:bg-gray-100",
  isChannelLive = false,
  href,
  channelHref,
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
      <Image
        src={thumbnailSrc}
        width={246}
        height={138}
        alt="thumbnail"
        className="aspect-video h-auto w-full rounded-xl"
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
            <span className="text-xs text-[#6F7979]">{postedAt}</span>
          </div>
        </div>
        <Image
          src={"/icons/more_vert_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
          width={24}
          height={24}
          alt="More video options"
          className="relative z-10 shrink-0 rounded-full p-1 hover:bg-black/20"
        />
      </div>
    </div>
  );
}
