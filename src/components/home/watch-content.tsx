"use client";

import { useState } from "react";

import Image from "next/image";

import Comments, { type Comment, type Review, type SaleItem } from "@/components/home/comments";
import FocusButton from "@/components/home/focus-button";
import ShareButton from "@/components/home/share-sheet";
import StatPill from "@/components/home/stat-pill";
import VideoCard, { type VideoCardProps } from "@/components/home/video-card";
import VideoDescription from "@/components/home/video-description";
import VideoPlayer from "@/components/home/video-player";
import WatchInfoPanel from "@/components/home/watch-info-panel";

type Episode = { id: string; label: string; isPremium: boolean };
type Season = { id: string; label: string; episodes: Episode[] };

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
  isPremium?: boolean;
  seasons?: Season[];
};

const TS_THUMB = "/dummy/thumbnail_image01.avif";

const ANIME_SEASONS: Season[] = [
  {
    id: "s1",
    label: "S1",
    episodes: [
      { id: "e1", label: "E1", isPremium: false },
      { id: "e2", label: "E2", isPremium: false },
      { id: "e3", label: "E3", isPremium: true },
      { id: "e4", label: "E4", isPremium: true },
      { id: "e5", label: "E5", isPremium: true },
      { id: "e6", label: "E6", isPremium: true },
      { id: "e7", label: "E7", isPremium: true },
      { id: "e8", label: "E8", isPremium: true },
      { id: "e9", label: "E9", isPremium: true },
      { id: "e10", label: "E10", isPremium: true },
      { id: "e11", label: "E11", isPremium: true },
      { id: "e12", label: "E12", isPremium: true },
      { id: "e13", label: "E13", isPremium: true },
      { id: "e14", label: "E14", isPremium: true },
      { id: "e15", label: "E15", isPremium: true },
    ],
  },
  {
    id: "s2",
    label: "S2",
    episodes: [
      { id: "s2e1", label: "E1", isPremium: true },
      { id: "s2e2", label: "E2", isPremium: true },
      { id: "s2e3", label: "E3", isPremium: true },
      { id: "s2e4", label: "E4", isPremium: true },
      { id: "s2e5", label: "E5", isPremium: true },
      { id: "s2e6", label: "E6", isPremium: true },
      { id: "s2e7", label: "E7", isPremium: true },
      { id: "s2e8", label: "E8", isPremium: true },
      { id: "s2e9", label: "E9", isPremium: true },
      { id: "s2e10", label: "E10", isPremium: true },
      { id: "s2e11", label: "E11", isPremium: true },
      { id: "s2e12", label: "E12", isPremium: true },
    ],
  },
];

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
        replyList: [
          {
            id: "r1q1",
            profileSrc: "/dummy/profile_image_04.avif",
            author: "@curiousbuyer",
            postedAt: "8 months ago",
            location: "Vietnam",
            text: "How was it overall? At what price did you purchase it?",
            likes: "32",
          },
          {
            id: "r1q2",
            profileSrc: "/dummy/profile_image_02.avif",
            author: "@ikun",
            replyingTo: "@curiousbuyer",
            postedAt: "8 months ago",
            location: "Central African Republic",
            text: "Quality is good, just heavy. Paid $68 here on the listing.",
            likes: "19",
          },
          {
            id: "r1q3",
            profileSrc: "/dummy/profile_image_03.avif",
            author: "@deals_hunter",
            postedAt: "7 months ago",
            location: "Indonesia",
            text: "Is it more affordable in offline retail stores?",
            likes: "11",
          },
          {
            id: "r1q4",
            profileSrc: "/dummy/profile_image_02.avif",
            author: "@ikun",
            replyingTo: "@deals_hunter",
            postedAt: "7 months ago",
            location: "Central African Republic",
            text: "Couldn't find it offline near me, online was cheaper.",
            likes: "6",
          },
        ],
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
  "anime-free": {
    id: "anime-free",
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
      { title: "Opening", time: "0:00", thumbSrc: TS_THUMB },
      { title: "Act 1", time: "2:15", thumbSrc: TS_THUMB },
      { title: "Act 2", time: "5:30", thumbSrc: TS_THUMB },
      { title: "Finale", time: "8:45", thumbSrc: TS_THUMB },
    ],
    transcriptTitle: "Fengzhi Senai Performance",
    transcript: [
      { time: "0:01", text: "Welcome to the magical world of Fengzhi Senai at Disney Land." },
      { time: "0:10", text: "Pomporo takes the stage as the crowd erupts in applause." },
      { time: "0:20", text: "The performance begins with the iconic opening melody." },
      { time: "0:35", text: "Dancers fill the stage with vibrant costumes and choreography." },
      { time: "0:50", text: "The chorus echoes through the park as fireworks light the sky." },
    ],
    trending: "Fengzhi Senai Disney Land",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@anime_fan",
        postedAt: "3 hours ago",
        location: "Japan",
        text: "This performance was absolutely stunning! Pomporo never disappoints 🌼",
        likes: "2.1k",
        replies: "47",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_05.avif",
            author: "@fengzhi_lover",
            postedAt: "2 hours ago",
            location: "South Korea",
            text: "Agreed! The choreography in Act 2 was incredible.",
            likes: "312",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@disneymagic",
        postedAt: "5 hours ago",
        location: "United States",
        text: "Disney Land is the perfect backdrop for this. The vibes were immaculate.",
        likes: "890",
        replies: "12",
      },
    ],
    seasons: ANIME_SEASONS,
  },
  "anime-premium": {
    id: "anime-premium",
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
    chapters: [],
    transcriptTitle: "",
    transcript: [],
    trending: "Fengzhi Senai Disney Land",
    comments: [
      {
        id: "c1",
        profileSrc: "/dummy/profile_image_02.avif",
        author: "@anime_fan",
        postedAt: "3 hours ago",
        location: "Japan",
        text: "This performance was absolutely stunning! Pomporo never disappoints 🌼",
        likes: "2.1k",
        replies: "47",
        replyList: [
          {
            id: "c1r1",
            profileSrc: "/dummy/profile_image_05.avif",
            author: "@fengzhi_lover",
            postedAt: "2 hours ago",
            location: "South Korea",
            text: "Agreed! The choreography in Act 2 was incredible.",
            likes: "312",
          },
        ],
      },
      {
        id: "c2",
        profileSrc: "/dummy/profile_image_03.avif",
        author: "@disneymagic",
        postedAt: "5 hours ago",
        location: "United States",
        text: "Disney Land is the perfect backdrop for this. The vibes were immaculate.",
        likes: "890",
        replies: "12",
      },
    ],
    isPremium: true,
    seasons: ANIME_SEASONS,
  },
};

function PremiumBanner() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-black p-6">
      <p className="text-center text-sm leading-5 font-medium tracking-[0.1px] text-[#C4C7C7]">
        Get Premium and enjoy the Premium exclusive video!
      </p>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-[#00696E] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
      >
        <Image
          src="/icons/diamond_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
          width={18}
          height={18}
          alt=""
        />
        Join the Premium
      </button>
    </div>
  );
}

function AnimeSeasonPanel({ seasons }: { seasons: Season[] }) {
  const [activeSeason, setActiveSeason] = useState(0);
  const [selectedEpisode, setSelectedEpisode] = useState(seasons[0]?.episodes[0]?.id ?? "");

  const episodes = seasons[activeSeason]?.episodes ?? [];

  return (
    <section>
      <h2 className="pb-2 text-base font-medium">Season</h2>
      <div className="border-b border-[#DAE4E5] bg-[#F7FAF9]">
        <div className="flex scrollbar-none overflow-x-auto">
          {seasons.map((season, i) => (
            <button
              key={season.id}
              type="button"
              onClick={() => {
                setActiveSeason(i);
                setSelectedEpisode(seasons[i]?.episodes[0]?.id ?? "");
              }}
              className={`relative shrink-0 px-8 py-3 text-sm font-medium transition-colors ${
                activeSeason === i ? "text-[#191C1C]" : "text-[#3F4949] hover:text-[#191C1C]"
              }`}
            >
              {season.label}
              {activeSeason === i && (
                <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#00696E]" />
              )}
            </button>
          ))}
        </div>
      </div>
      <h2 className="pt-4 pb-3 text-base font-medium">Episode</h2>
      <div className="grid grid-cols-3 gap-3">
        {episodes.map((ep) => {
          const isSelected = ep.id === selectedEpisode;
          return (
            <button
              key={ep.id}
              type="button"
              onClick={() => setSelectedEpisode(ep.id)}
              className={`flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                isSelected
                  ? "bg-[#CCE8E9] text-[#041F21]"
                  : "text-[#3F4949] ring-1 ring-[#6F7979] hover:bg-[#F1F3F3]"
              }`}
            >
              {ep.label}
              {ep.isPremium && (
                <Image
                  src={`/icons/diamond_24dp_000000_FILL${isSelected ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
                  width={14}
                  height={14}
                  alt="premium"
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function WatchContent({ id }: { id: string }) {
  const video = VIDEOS[id];
  const [commentsOpen, setCommentsOpen] = useState(true);

  if (!video) {
    return (
      <section className="px-4 py-8 lg:px-6">
        <p className="text-sm text-[#6F7979]">Video not found.</p>
      </section>
    );
  }

  const { stats } = video;

  return (
    <section className="mx-auto px-4 py-6 lg:px-6">
      <div className="lg:flex lg:items-start lg:gap-4">
        {/* Left column — player, meta, seasons, comments */}
        <div className="min-w-0 space-y-4 lg:flex-1">
          {video.isPremium ? (
            <PremiumBanner />
          ) : (
            <VideoPlayer src={video.videoSrc} label={video.title} autoPlay muted />
          )}

          {/* In-video panel — mobile only, hidden for premium */}
          {!video.isPremium && (
            <WatchInfoPanel
              videoId={video.id}
              chapters={video.chapters}
              transcriptTitle={video.transcriptTitle}
              transcript={video.transcript}
              className="h-100 w-full lg:hidden"
            />
          )}

          <VideoDescription
            title={video.title}
            views={video.views}
            postedAt={video.postedAt}
            description={video.description}
          />

          {/* Channel + Focus */}
          <div className="flex flex-row items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground">
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
          <div className="grid grid-cols-4 items-center gap-2 lg:flex lg:flex-row">
            <StatPill
              icon="comment"
              label={stats.comments}
              active={commentsOpen}
              onClick={() => setCommentsOpen((open) => !open)}
            />
            <StatPill icon="favorite" label={stats.likes} />
            <StatPill icon="bookmark" label={stats.bookmarks} />
            <ShareButton shares={stats.shares} />
          </div>

          {/* Season + Episode grid — anime only */}
          {video.seasons && (
            <>
              <hr className="border-[#CAC4D0]" />
              <AnimeSeasonPanel seasons={video.seasons} />
            </>
          )}

          {/* Comments + reviews */}
          {commentsOpen && (
            <Comments
              count={stats.comments}
              comments={video.comments}
              trending={video.trending}
              saleItem={video.saleItem}
              reviews={video.reviews}
            />
          )}
        </div>

        {/* Right column — in-video panel + recommended */}
        <div className="mt-4 space-y-4 lg:mt-0 lg:w-100 lg:shrink-0">
          {!video.isPremium && (
            <WatchInfoPanel
              videoId={video.id}
              chapters={video.chapters}
              transcriptTitle={video.transcriptTitle}
              transcript={video.transcript}
              className="hidden w-full lg:block lg:h-68 xl:h-130 2xl:h-130"
            />
          )}

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
