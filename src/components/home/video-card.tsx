import Image from "next/image";
import Link from "next/link";

export type VideoCardProps = {
  thumbnailSrc: string;
  profileSrc: string;
  title: string;
  channelName: string;
  views: string;
  postedAt: string;
  verified?: boolean;
  hoverBg?: string;
  isChannelLive?: boolean;
  href?: string;
  channelHref?: string;
};

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
    <div className="relative size-9 shrink-0 rounded-full border border-[#1DBDC5] flex items-center justify-center">
      <div className="absolute -inset-1.25 rounded-full border border-[#1DBDC5] animate-live-ring pointer-events-none will-change-transform" />
      <Image
        src={profileSrc}
        width={34}
        height={34}
        alt="profile image"
        className="size-8.5 rounded-full animate-live-image will-change-transform"
      />
    </div>
  ) : (
    <div className="size-9 rounded-full border border-foreground shrink-0 flex items-center justify-center">
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
        className={`absolute inset-0 -m-2 rounded-2xl pointer-events-none -z-10 transition-colors ${hoverBg}`}
      />
      {/* Stretched overlay link — covers the whole card, navigates to the video.
          Interactive children (channel, more options) sit above it via z-10. */}
      {href && <Link href={href} aria-label={title} className="absolute inset-0 z-0 rounded-xl" />}
      <Image
        src={thumbnailSrc}
        width={246}
        height={138}
        alt="thumbnail"
        className="w-full aspect-video rounded-xl"
      />
      <div className="flex flex-row items-start pt-2 gap-2">
        {channelHref ? (
          <Link href={channelHref} className="relative z-10 shrink-0">
            {avatar}
          </Link>
        ) : (
          avatar
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm line-clamp-2">{title}</p>
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
          className="relative z-10 p-1 shrink-0 hover:bg-black/20 rounded-full"
        />
      </div>
    </div>
  );
}
