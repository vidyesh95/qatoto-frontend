import Image from "next/image";

import VideoPlayer from "@/components/home/video-player";
import WatchInfoPanel from "@/components/home/watch-info-panel";

type WatchVideo = {
  id: string;
  videoSrc: string;
  title: string;
  profileSrc: string;
  channelName: string;
  views: string;
  postedAt: string;
  verified?: boolean;
  chapters: { title: string; time: string; thumbSrc: string }[];
  transcriptTitle: string;
  transcript: { time: string; text: string }[];
};

const TS_THUMB = "/dummy/thumbnail_image01.avif";

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
    chapters: [
      { title: "Enums", time: "33:08", thumbSrc: TS_THUMB },
      { title: "Functions", time: "36:31", thumbSrc: TS_THUMB },
      { title: "Objects", time: "43:22", thumbSrc: TS_THUMB },
      { title: "Advanced Types", time: "47:57", thumbSrc: TS_THUMB },
      { title: "Type Aliases", time: "48:26", thumbSrc: TS_THUMB },
      { title: "Union Types", time: "50:04", thumbSrc: TS_THUMB },
      { title: "Intersection Types", time: "52:11", thumbSrc: TS_THUMB },
    ],
    transcriptTitle: "What is JavaScript",
    transcript: [
      { time: "0:01", text: "In this 3-minute introduction, I'm going to answer four frequently asked questions" },
      {
        time: "0:06",
        text: "about JavaScript. What is JavaScript, what can you do with it, where does JavaScript code run and what is the difference between",
      },
      { time: "0:14", text: "JavaScript and ECMAScript. So let's start with the first question. What is" },
      {
        time: "0:19",
        text: "JavaScript? JavaScript is one of the most popular and widely used programming languages in the world right now. It's growing faster than any other",
      },
      {
        time: "0:28",
        text: "programming languages and big companies like Netflix, Walmart, and PayPal build",
      },
    ],
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
    <section className="px-4 lg:px-6 py-6 mx-auto space-y-4">
      <div className="lg:relative">
        <div className="min-w-0 lg:pr-104">
          <VideoPlayer src={video.videoSrc} label={video.title} autoPlay muted />
        </div>
        <WatchInfoPanel
          chapters={video.chapters}
          transcriptTitle={video.transcriptTitle}
          transcript={video.transcript}
          className="mt-4 w-full h-100 lg:mt-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-100 lg:h-auto"
        />
      </div>
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
