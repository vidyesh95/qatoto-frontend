"use client";

import Image from "next/image";
import { useState } from "react";
import VideoCard, { type VideoCardProps } from "@/components/home/shared/video-card";

const TABS = ["Liked", "Bookmarked"] as const;

type Tab = (typeof TABS)[number];

const LIKED_VIDEOS: VideoCardProps[] = [
  {
    thumbnailSrc: "/dummy/trending01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
    channelName: "Arin Light",
    views: "730.1K views",
    postedAt: "2 days ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recent_episode_02.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Dragon's Disciple — Awakening of the Crimson Flame",
    channelName: "Tencent Animation",
    views: "1.8M views",
    postedAt: "1 day ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/completed_series06.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "A Record Of Mortal's Journey To Immortality Episode 102",
    channelName: "bilibili",
    views: "612.4K views",
    postedAt: "3 days ago",
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/new_arriavals05.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "War God System! I'm Counting On You Episode 8",
    channelName: "Haoliners",
    views: "498.2K views",
    postedAt: "5 days ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/trending04.avif",
    profileSrc: "/dummy/profile_image_05.avif",
    title: "Carp Reborn 3rd Season Episode 12",
    channelName: "Colored Pencil",
    views: "412.3K views",
    postedAt: "1 week ago",
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recommended_for_you_02.avif",
    profileSrc: "/dummy/profile_image_06.avif",
    title: "Foreordination Episode 15",
    channelName: "Studio Ghibli",
    views: "356.7K views",
    postedAt: "2 weeks ago",
    verified: true,
    href: "/watch",
  },
];

const BOOKMARKED_VIDEOS: VideoCardProps[] = [
  {
    thumbnailSrc: "/dummy/completed_series01.avif",
    profileSrc: "/dummy/profile_image_02.avif",
    title: "Demon Slayer: Swordsmith Village Arc Episode 4",
    channelName: "Tencent Animation",
    views: "4.8M views",
    postedAt: "1 day ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/new_arriavals01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "You're A Genius! Episode 9",
    channelName: "Studio Ghibli",
    views: "3.1M views",
    postedAt: "4 days ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recommended_for_you_06.avif",
    profileSrc: "/dummy/profile_image_05.avif",
    title: "Fairies Albums S2 Episode 6",
    channelName: "Colored Pencil",
    views: "2.4M views",
    postedAt: "6 days ago",
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/trending02.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "The Furious Yama — Final Arc",
    channelName: "Haoliners",
    views: "1.9M views",
    postedAt: "1 week ago",
    verified: true,
    href: "/watch",
  },
];

const VIDEOS_BY_TAB: Record<Tab, VideoCardProps[]> = {
  Liked: LIKED_VIDEOS,
  Bookmarked: BOOKMARKED_VIDEOS,
};

function FavoriteTabs({ selected, onSelect }: { selected: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="sticky top-13 z-10 border-b border-border bg-background">
      <div className="flex px-2">
        {TABS.map((tab) => {
          const isActive = tab === selected;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              aria-pressed={isActive}
              className={`relative flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              <span className="relative inline-block">
                {tab}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-3 h-0.75 rounded-t-full bg-[#00696E]" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-20 text-center">
      <Image src="/icons/fovorite_40dp.svg" width={40} height={40} alt="" />
      <p className="text-sm font-medium text-foreground">No {tab.toLowerCase()} animes yet</p>
      <p className="text-xs text-[#6F7979]">
        {tab === "Liked"
          ? "Animes you like will show up here."
          : "Animes you bookmark will show up here."}
      </p>
    </div>
  );
}

export default function FavoriteContent() {
  const [tab, setTab] = useState<Tab>("Liked");
  const videos = VIDEOS_BY_TAB[tab];

  return (
    <div className="pb-10">
      <FavoriteTabs selected={tab} onSelect={setTab} />

      {videos.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.title} {...video} />
          ))}
        </div>
      )}
    </div>
  );
}
