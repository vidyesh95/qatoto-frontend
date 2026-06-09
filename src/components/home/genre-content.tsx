"use client";

import Image from "next/image";
import { useState } from "react";
import VideoCard, { type VideoCardProps } from "@/components/home/video-card";

const GENRES = [
  "All",
  "Fantasy",
  "Romance",
  "Immortal",
  "Adventure",
  "Action",
  "Slice of Life",
  "Harem",
  "Sci-fi",
  "Comedy",
  "Horror",
  "History",
] as const;

const SORTS = ["Hottest", "Latest", "Completed"] as const;

type Genre = (typeof GENRES)[number];
type Sort = (typeof SORTS)[number];

const VIDEOS: VideoCardProps[] = [
  {
    thumbnailSrc: "/dummy/recent_episode_01.avif",
    profileSrc: "/dummy/profile_image_01.avif",
    title: "Pomporo singing 😋 Fengzhi Senai 😋 at Disney Land",
    channelName: "Studio Ghibli",
    views: "2.5M views",
    postedAt: "12 hours ago",
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
    thumbnailSrc: "/dummy/recent_episode_03.avif",
    profileSrc: "/dummy/profile_image_03.avif",
    title: "Master of the Star Spring Season 2",
    channelName: "bilibili",
    views: "904K views",
    postedAt: "3 days ago",
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recent_episode_04.avif",
    profileSrc: "/dummy/profile_image_04.avif",
    title: "The Furious Yama — Final Arc",
    channelName: "Haoliners",
    views: "3.1M views",
    postedAt: "5 days ago",
    verified: true,
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recent_episode_05.avif",
    profileSrc: "/dummy/profile_image_05.avif",
    title: "R.E.D (Rescue Eternal Desert)",
    channelName: "Colored Pencil",
    views: "612K views",
    postedAt: "1 week ago",
    href: "/watch",
  },
  {
    thumbnailSrc: "/dummy/recent_episode_06.avif",
    profileSrc: "/dummy/profile_image_06.avif",
    title: "Fairy Mountain — Spirit of the Eastern Peak",
    channelName: "Studio Ghibli",
    views: "1.2M views",
    postedAt: "2 weeks ago",
    verified: true,
    href: "/watch",
  },
];

function GenreChips({ selected, onSelect }: { selected: Genre; onSelect: (genre: Genre) => void }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 lg:px-6">
      {GENRES.map((genre) => {
        const isActive = genre === selected;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onSelect(genre)}
            aria-pressed={isActive}
            className={`cursor-pointer inline-flex h-8 items-center gap-2 rounded-lg border text-sm font-medium leading-5 tracking-[0.1px] transition-colors ${
              isActive
                ? "border-transparent bg-primary pl-2 pr-4 text-primary-foreground"
                : "border-border px-4 text-foreground hover:bg-muted"
            }`}
          >
            {isActive && (
              <Image
                src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                width={18}
                height={18}
                alt=""
              />
            )}
            {genre}
          </button>
        );
      })}
    </div>
  );
}

function SortTabs({ selected, onSelect }: { selected: Sort; onSelect: (sort: Sort) => void }) {
  return (
    <div className="px-4 py-2 lg:px-6">
      <div className="flex w-full lg:w-100">
        {SORTS.map((sort, i) => {
          const isActive = sort === selected;
          const isFirst = i === 0;
          const isLast = i === SORTS.length - 1;
          return (
            <button
              key={sort}
              type="button"
              onClick={() => onSelect(sort)}
              aria-pressed={isActive}
              className={`cursor-pointer inline-flex h-10 flex-1 items-center justify-center gap-2 border border-border px-3 py-2.5 text-sm font-medium leading-5 tracking-[0.1px] transition-colors ${
                isFirst ? "rounded-l-full" : "-ml-px"
              } ${isLast ? "rounded-r-full" : ""} ${
                isActive ? "z-10 bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              {isActive && (
                <Image
                  src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  width={18}
                  height={18}
                  alt=""
                />
              )}
              {sort}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GenreContent() {
  const [genre, setGenre] = useState<Genre>("All");
  const [sort, setSort] = useState<Sort>("Hottest");

  return (
    <div className="pb-10">
      <GenreChips selected={genre} onSelect={setGenre} />
      <SortTabs selected={sort} onSelect={setSort} />

      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {VIDEOS.map((video) => (
          <VideoCard key={video.title} {...video} />
        ))}
      </div>
    </div>
  );
}
