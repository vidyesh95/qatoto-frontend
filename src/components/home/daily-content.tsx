"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

type Day = (typeof DAYS)[number];

type DailyEpisode = {
  id: string;
  imageSrc: string;
  title: string;
  channelName: string;
  views: string;
  likes: string;
  verified?: boolean;
};

const SCHEDULE: Record<Day, DailyEpisode[]> = {
  MON: [
    {
      id: "1",
      imageSrc: "/dummy/recommended_for_you_06.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "730.1k views",
      likes: "8.8m",
      verified: true,
    },
    {
      id: "2",
      imageSrc: "/dummy/completed_series06.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "730.1k views",
      likes: "8.8m",
      verified: true,
    },
    {
      id: "3",
      imageSrc: "/dummy/new_arriavals05.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "730.1k views",
      likes: "8.8m",
      verified: true,
    },
  ],
  TUE: [
    {
      id: "1",
      imageSrc: "/dummy/trending01.avif",
      title: "Carp Reborn 3rd Season Episode 12",
      channelName: "Haoliners",
      views: "412.3k views",
      likes: "5.1m",
      verified: true,
    },
    {
      id: "2",
      imageSrc: "/dummy/trending04.avif",
      title: "War God System! I'm Counting On You Episode 8",
      channelName: "bilibili",
      views: "287.6k views",
      likes: "3.4m",
    },
  ],
  WED: [
    {
      id: "1",
      imageSrc: "/dummy/new_arriavals01.avif",
      title: "Demon Slayer: Swordsmith Village Arc Episode 4",
      channelName: "Tencent Animation",
      views: "1.2m views",
      likes: "12.4m",
      verified: true,
    },
    {
      id: "2",
      imageSrc: "/dummy/completed_series03.avif",
      title: "Fairies Albums S2 Episode 6",
      channelName: "Colored Pencil",
      views: "98.4k views",
      likes: "1.1m",
    },
  ],
  THU: [
    {
      id: "1",
      imageSrc: "/dummy/recommended_for_you_02.avif",
      title: "You're A Genius! Episode 9",
      channelName: "Studio Ghibli",
      views: "540.7k views",
      likes: "6.3m",
      verified: true,
    },
  ],
  FRI: [
    {
      id: "1",
      imageSrc: "/dummy/trending06.avif",
      title: "Foreordination Episode 15",
      channelName: "Arin Light",
      views: "823.9k views",
      likes: "9.7m",
      verified: true,
    },
  ],
  SAT: [
    {
      id: "1",
      imageSrc: "/dummy/completed_series01.avif",
      title: "A Record Of Mortal's Journey To Immortality Episode 102",
      channelName: "Tencent Animation",
      views: "2.1m views",
      likes: "18.9m",
      verified: true,
    },
  ],
  SUN: [
    {
      id: "1",
      imageSrc: "/dummy/new_arriavals06.avif",
      title: "Rakshasa Street S2 Episode 3",
      channelName: "Haoliners",
      views: "156.2k views",
      likes: "2.2m",
    },
  ],
};

function DayTabs({ selected, onSelect }: { selected: Day; onSelect: (day: Day) => void }) {
  return (
    <div className="sticky z-10 border-b top-13 border-border bg-background">
      <div className="flex px-2 overflow-x-auto scrollbar-none">
        {DAYS.map((day) => {
          const isActive = day === selected;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(day)}
              aria-pressed={isActive}
              className={`relative flex-1 min-w-16 cursor-pointer px-4 py-3 text-sm font-medium tracking-wide transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              <span className="relative inline-block">
                {day}
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

function EpisodeRow({ episode }: { episode: DailyEpisode }) {
  return (
    <Link href="/watch" className="flex gap-4 px-4 py-2 transition-colors group hover:bg-black/5">
      <div className="relative overflow-hidden rounded w-25 shrink-0 bg-muted aspect-3/4">
        <Image
          src={episode.imageSrc}
          alt={episode.title}
          fill
          sizes="100px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <p className="text-sm font-medium leading-4 tracking-wide text-foreground line-clamp-2">
          {episode.title}
        </p>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs font-medium leading-4 tracking-wide text-[#6F7979]">
            {episode.channelName}
          </span>
          {episode.verified && (
            <Image
              src="/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"
              width={12}
              height={12}
              alt="verified"
            />
          )}
        </div>
        <div className="flex items-center pt-2 mt-auto">
          <span className="flex-1 text-xs font-medium tracking-wide text-foreground">
            {episode.views}
          </span>
          <span className="flex flex-1 items-center gap-0.5 text-xs font-medium tracking-wide text-foreground">
            <Image
              src="/icons/favorite_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              width={14}
              height={14}
              alt="likes"
            />
            {episode.likes}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DailyContent() {
  const [day, setDay] = useState<Day>("MON");
  const episodes = SCHEDULE[day];

  return (
    <div className="pb-10">
      <DayTabs selected={day} onSelect={setDay} />
      <div className="divide-y divide-border">
        {episodes.map((episode) => (
          <EpisodeRow key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
}
