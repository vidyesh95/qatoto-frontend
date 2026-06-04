import Image from "next/image";

import VideoPlayer from "@/components/home/video-player";

type WatchVideo = {
  id: string;
  videoSrc: string;
  title: string;
  profileSrc: string;
  channelName: string;
  views: string;
  postedAt: string;
  verified?: boolean;
};

const VIDEOS: Record<string, WatchVideo> = {
  "1": {
    id: "1",
    videoSrc: "/dummy/video/Sintel_1080_10s_1MB.mp4",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    profileSrc: "/dummy/profile_image_01.avif",
    channelName: "Arin Light",
    views: "2.5M views",
    postedAt: "12 hours ago",
    verified: true,
  },
};

export default function WatchContent({ id }: { id: string }) {
  const video = VIDEOS[id];

  if (!video) {
    return (
      <section className="px-4 lg:px-6 py-8">
        <p className="text-sm text-[#6F7979]">Video not found.</p>
      </section>
    );
  }

  return (
    <section className="px-4 lg:px-6 py-6 max-w-5xl mx-auto space-y-4">
      <VideoPlayer src={video.videoSrc} label={video.title} autoPlay muted />
      <h1 className="text-lg font-medium">{video.title}</h1>
      <div className="flex flex-row items-center gap-3">
        <div className="size-10 rounded-full border border-foreground shrink-0 flex items-center justify-center">
          <Image
            src={video.profileSrc}
            width={38}
            height={38}
            alt="profile image"
            className="size-9.5 rounded-full"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-row items-center gap-1">
            <span className="text-sm font-medium">{video.channelName}</span>
            {video.verified && (
              <Image
                src={"/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"}
                width={16}
                height={16}
                alt="verified"
              />
            )}
          </div>
          <div className="flex flex-row items-center gap-1 text-xs text-[#6F7979]">
            <span>{video.views}</span>
            <span>•</span>
            <span>{video.postedAt}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
