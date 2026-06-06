import Image from "next/image";

import Comments, { type Comment, type Review, type SaleItem } from "@/components/home/comments";
import FocusButton from "@/components/home/focus-button";
import StatPill from "@/components/home/stat-pill";
import VideoCard, { type VideoCardProps } from "@/components/home/video-card";
import VideoDescription from "@/components/home/video-description";
import VideoPlayer from "@/components/home/video-player";
import WatchInfoPanel from "@/components/home/watch-info-panel";

type WatchVideo = {
  id: string;
  videoSrc: string;
  title: string;
  profileSrc: string;
  channelName: string;
  subscribers: string;
  views: string;
  postedAt: string;
  description: string;
  verified?: boolean;
  stats: { likes: string; comments: string; bookmarks: string; shares: string };
  chapters: { title: string; time: string; thumbSrc: string }[];
  transcriptTitle: string;
  transcript: { time: string; text: string }[];
  trending: string;
  comments: Comment[];
  saleItem?: SaleItem;
  reviews?: Review[];
};

const TS_THUMB = "/dummy/thumbnail_image01.avif";

const RECOMMENDED: VideoCardProps[] = [
  {
    thumbnailSrc: "/dummy/thumbnail_image02.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Need for speed @234MPH",
    channelName: "BTS fan boi🤩",
    views: "973 views",
    postedAt: "37 minutes ago",
    hoverBg: "group-hover:bg-amber-100",
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image03.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "Your everyday slicing made easy - cucumber, carrot, radish in snap",
    channelName: "Home owners friend",
    views: "9k watching",
    postedAt: "Live",
    verified: true,
    hoverBg: "group-hover:bg-green-100",
    isChannelLive: true,
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image04.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "Lo-fi beats to study and relax to all night long",
    channelName: "Chill Hub",
    views: "412k views",
    postedAt: "2 days ago",
    hoverBg: "group-hover:bg-indigo-100",
  },
  {
    thumbnailSrc: "/dummy/thumbnail_image01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    channelName: "Arin Light",
    views: "2.5M views",
    postedAt: "12 hours ago",
    verified: true,
    hoverBg: "group-hover:bg-yellow-100",
  },
];

const VIDEOS: Record<string, WatchVideo> = {
  "1": {
    id: "1",
    videoSrc: "/dummy/video/Sintel_1080_10s_1MB.mp4",
    title: "Pomporo singing 🌼Fengzhi Senai🌼 at Disney Land",
    profileSrc: "/dummy/profile_image_01.avif",
    channelName: "Arin Light",
    subscribers: "14 million",
    views: "2.5M views",
    postedAt: "12 hours ago",
    description:
      "Pomporo takes the stage at Disney Land with a breathtaking live performance of Fengzhi Senai 🌼\n\nShot across the park over two magical evenings. Huge thanks to the crew, the dancers, and everyone who came out to sing along.\n\nFollow for more live sessions, behind-the-scenes clips, and tour dates.\n#Pomporo #FengzhiSenai #DisneyLand #LivePerformance",
    verified: true,
    stats: { likes: "3.7k", comments: "414", bookmarks: "1.1k", shares: "3696" },
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
      {
        time: "0:01",
        text: "In this 3-minute introduction, I'm going to answer four frequently asked questions",
      },
      {
        time: "0:06",
        text: "about JavaScript. What is JavaScript, what can you do with it, where does JavaScript code run and what is the difference between",
      },
      {
        time: "0:14",
        text: "JavaScript and ECMAScript. So let's start with the first question. What is",
      },
      {
        time: "0:19",
        text: "JavaScript? JavaScript is one of the most popular and widely used programming languages in the world right now. It's growing faster than any other",
      },
      {
        time: "0:28",
        text: "programming languages and big companies like Netflix, Walmart, and PayPal build",
      },
      {
        time: "0:35",
        text: "their products using JavaScript. So what can you do with JavaScript? You can",
      },
      {
        time: "0:42",
        text: "build interactive web applications, mobile apps, server-side applications, and even",
      },
      {
        time: "0:49",
        text: "desktop applications. JavaScript runs in the browser, Node.js runtime, and many other",
      },
      {
        time: "0:56",
        text: "environments. ECMAScript is the standardized specification of JavaScript while",
      },
      {
        time: "1:03",
        text: "JavaScript is the implementation of that standard. Now that you understand the basics,",
      },
      {
        time: "1:10",
        text: "you're ready to start learning JavaScript. Visit our website to get started today.",
      },
    ],
    trending: "How much is McLaren",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@ikun",
        postedAt: "12 months ago",
        location: "Central African Republic",
        text: "Cement flower pot 🤣 too heavy, No one wants",
        likes: "8.8m",
        replies: "273",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_03.avif",
            author: "@reallyangrymonk",
            postedAt: "5 hours ago",
            location: "Fujian",
            text: "Noodles? That's something anyone with hands can make!",
            likes: "42",
          },
          {
            id: "c1r2",
            profileSrc: "/dummy/profile_image_04.avif",
            author: "@ayituhi",
            replyingTo: "@reallyangrymonk",
            postedAt: "3 minutes ago",
            location: "Fujian",
            text: "Make one and let me see",
            likes: "5",
          },
          {
            id: "c1r3",
            profileSrc: "/dummy/profile_image_01.avif",
            author: "@sevencolors",
            postedAt: "4 hours ago",
            location: "Anhui",
            text: "Open your mouth 😁😁😁",
            likes: "1",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@homeowner",
        postedAt: "5 hours ago",
        location: "Singapore",
        text: "Watched this on loop all morning. Disney Land never looked better.",
        likes: "604",
        replies: "8",
      },
      {
        id: "c3",
        profileSrc: "/dummy/profile_image_04.avif",
        author: "@chillhub",
        postedAt: "9 hours ago",
        location: "United Kingdom",
        text: "Anyone know the name of the song at the start?",
        likes: "211",
        replies: "0",
      },
    ],
    saleItem: {
      name: "The same octagonal flowerpot mold as the video",
      price: "$68",
      sold: "310",
    },
    reviews: [
      {
        id: "r1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@ikun",
        variant: "Cement flower pot with Safety manual and gray mold 1pc",
        rating: 3,
        text: "Cement flower pot 🤣 too heavy, No one wants",
        images: [
          "/dummy/review_image01.avif",
          "/dummy/review_image02.avif",
          "/dummy/review_image03.avif",
        ],
        postedAt: "12 months ago",
        location: "Central African Republic",
        likes: "8.8m",
        verified: true,
      },
      {
        id: "r2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@homeowner",
        variant: "Octagonal mold with gray mold 1pc",
        rating: 5,
        text: "Perfect for my balcony garden. Sturdy and easy to demold.",
        images: ["/dummy/thumbnail_image04.avif"],
        postedAt: "3 months ago",
        location: "Singapore",
        likes: "1.4k",
        verified: true,
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

  const { stats } = video;

  return (
    <section className="px-4 lg:px-6 py-6 mx-auto">
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Left column — player, meta, comments */}
        <div className="min-w-0 space-y-4 lg:flex-1">
          <VideoPlayer src={video.videoSrc} label={video.title} autoPlay muted />

          {/* In-video panel — mobile only, sits below video and above title */}
          <WatchInfoPanel
            videoId={video.id}
            chapters={video.chapters}
            transcriptTitle={video.transcriptTitle}
            transcript={video.transcript}
            className="w-full h-100 lg:hidden"
          />

          <VideoDescription
            title={video.title}
            views={video.views}
            postedAt={video.postedAt}
            description={video.description}
          />

          {/* Channel + Focus */}
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
            <div className="min-w-0 flex-1">
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
                <span className="ml-1 text-xs text-[#6F7979]">{video.subscribers}</span>
              </div>
            </div>
            <FocusButton />
          </div>

          {/* Stats */}
          <div className="flex flex-row flex-wrap items-center gap-2">
            <StatPill icon="favorite" label={stats.likes} />
            <StatPill icon="bookmark" label={stats.bookmarks} />
            <StatPill icon="share" label={stats.shares} />
          </div>

          {/* Comments + reviews (reviews tab shows only when an item is attached) */}
          <Comments
            count={stats.comments}
            comments={video.comments}
            trending={video.trending}
            saleItem={video.saleItem}
            reviews={video.reviews}
          />
        </div>

        {/* Right column — in-video panel + recommended, same width */}
        <div className="mt-4 space-y-4 lg:mt-0 lg:w-100 lg:shrink-0">
          <WatchInfoPanel
            videoId={video.id}
            chapters={video.chapters}
            transcriptTitle={video.transcriptTitle}
            transcript={video.transcript}
            className="hidden lg:block w-full lg:h-125"
          />

          <div className="space-y-4">
            <h2 className="text-lg font-medium">Recommended for You</h2>
            <div className="space-y-5">
              {RECOMMENDED.map((item) => (
                <VideoCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
