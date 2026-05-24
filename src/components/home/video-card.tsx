import Image from "next/image";

export type VideoCardProps = {
  thumbnailSrc: string;
  profileSrc: string;
  title: string;
  channelName: string;
  views: string;
  postedAt: string;
  verified?: boolean;
  className?: string;
};

export default function VideoCard({
  thumbnailSrc,
  profileSrc,
  title,
  channelName,
  views,
  postedAt,
  verified = false,
  className = "hover:bg-amber-200",
}: VideoCardProps) {
  return (
    <div className={`p-2 w-61.5 rounded-2xl ${className}`}>
      <Image
        src={thumbnailSrc}
        width={246}
        height={138}
        alt="thumbnail"
        className="rounded-xl"
      />
      <div className="flex flex-row items-start pt-2 gap-2">
        <Image
          src={profileSrc}
          width={36}
          height={36}
          alt="profile image"
          className="rounded-full border border-foreground shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm line-clamp-2">{title}</p>
          <div className="flex flex-row items-center gap-1">
            <span className="text-xs text-[#6F7979]">{channelName}</span>
            {verified && (
              <Image
                src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                width={16}
                height={16}
                alt="verified"
              />
            )}
          </div>
          <div className="flex flex-row items-center gap-1">
            <span className="text-xs text-[#6F7979]">{views} views</span>
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
          width={14}
          height={14}
          alt="More video options"
          className="shrink-0"
        />
      </div>
    </div>
  );
}
