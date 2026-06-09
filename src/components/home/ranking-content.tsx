"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const PERIODS = ["Weekly", "Monthly", "Yearly"] as const;
const SORTS = ["Trending", "Most viewed", "Most liked", "Newest"] as const;

type Period = (typeof PERIODS)[number];
type Sort = (typeof SORTS)[number];

type RankedEpisode = {
  id: string;
  rank: number;
  imageSrc: string;
  title: string;
  channelName: string;
  views: string;
  likes: string;
  verified?: boolean;
};

const RANKINGS: Record<Period, RankedEpisode[]> = {
  Weekly: [
    {
      id: "1",
      rank: 1,
      imageSrc: "/dummy/trending01.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "730.1k views",
      likes: "8.8m",
      verified: true,
    },
    {
      id: "2",
      rank: 2,
      imageSrc: "/dummy/completed_series06.avif",
      title: "A Record Of Mortal's Journey To Immortality Episode 102",
      channelName: "Tencent Animation",
      views: "612.4k views",
      likes: "7.1m",
      verified: true,
    },
    {
      id: "3",
      rank: 3,
      imageSrc: "/dummy/new_arriavals05.avif",
      title: "War God System! I'm Counting On You Episode 8",
      channelName: "Haoliners",
      views: "498.2k views",
      likes: "5.9m",
      verified: true,
    },
    {
      id: "4",
      rank: 4,
      imageSrc: "/dummy/trending04.avif",
      title: "Carp Reborn 3rd Season Episode 12",
      channelName: "bilibili",
      views: "412.3k views",
      likes: "5.1m",
    },
    {
      id: "5",
      rank: 5,
      imageSrc: "/dummy/recommended_for_you_02.avif",
      title: "Foreordination Episode 15",
      channelName: "Studio Ghibli",
      views: "356.7k views",
      likes: "4.2m",
      verified: true,
    },
    {
      id: "6",
      rank: 6,
      imageSrc: "/dummy/completed_series03.avif",
      title: "Rakshasa Street S2 Episode 3",
      channelName: "Colored Pencil",
      views: "289.5k views",
      likes: "3.4m",
    },
  ],
  Monthly: [
    {
      id: "1",
      rank: 1,
      imageSrc: "/dummy/completed_series01.avif",
      title: "Demon Slayer: Swordsmith Village Arc Episode 4",
      channelName: "Tencent Animation",
      views: "4.8m views",
      likes: "42.1m",
      verified: true,
    },
    {
      id: "2",
      rank: 2,
      imageSrc: "/dummy/trending06.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "3.9m views",
      likes: "37.6m",
      verified: true,
    },
    {
      id: "3",
      rank: 3,
      imageSrc: "/dummy/new_arriavals01.avif",
      title: "You're A Genius! Episode 9",
      channelName: "Studio Ghibli",
      views: "3.1m views",
      likes: "29.4m",
      verified: true,
    },
    {
      id: "4",
      rank: 4,
      imageSrc: "/dummy/recommended_for_you_06.avif",
      title: "Fairies Albums S2 Episode 6",
      channelName: "Colored Pencil",
      views: "2.4m views",
      likes: "21.8m",
    },
    {
      id: "5",
      rank: 5,
      imageSrc: "/dummy/trending02.avif",
      title: "The Furious Yama — Final Arc",
      channelName: "Haoliners",
      views: "1.9m views",
      likes: "18.2m",
      verified: true,
    },
    {
      id: "6",
      rank: 6,
      imageSrc: "/dummy/new_arriavals03.avif",
      title: "Master of the Star Spring Season 2",
      channelName: "bilibili",
      views: "1.5m views",
      likes: "14.7m",
    },
  ],
  Yearly: [
    {
      id: "1",
      rank: 1,
      imageSrc: "/dummy/trending03.avif",
      title: "A Record Of Mortal's Journey To Immortality Episode 102",
      channelName: "Tencent Animation",
      views: "58.2m views",
      likes: "512.4m",
      verified: true,
    },
    {
      id: "2",
      rank: 2,
      imageSrc: "/dummy/completed_series04.avif",
      title: "Demon Slayer: Swordsmith Village Arc Episode 4",
      channelName: "Studio Ghibli",
      views: "49.7m views",
      likes: "448.9m",
      verified: true,
    },
    {
      id: "3",
      rank: 3,
      imageSrc: "/dummy/recommended_for_you_04.avif",
      title: "The Story of Fengzhi Senla Episode Fengzhi Wuyu",
      channelName: "Arin Light",
      views: "41.3m views",
      likes: "389.1m",
      verified: true,
    },
    {
      id: "4",
      rank: 4,
      imageSrc: "/dummy/new_arriavals06.avif",
      title: "Dragon's Disciple — Awakening of the Crimson Flame",
      channelName: "Haoliners",
      views: "33.6m views",
      likes: "301.7m",
      verified: true,
    },
    {
      id: "5",
      rank: 5,
      imageSrc: "/dummy/trending05.avif",
      title: "Fairy Mountain — Spirit of the Eastern Peak",
      channelName: "bilibili",
      views: "28.1m views",
      likes: "254.3m",
    },
    {
      id: "6",
      rank: 6,
      imageSrc: "/dummy/completed_series02.avif",
      title: "R.E.D (Rescue Eternal Desert)",
      channelName: "Colored Pencil",
      views: "22.9m views",
      likes: "198.5m",
    },
  ],
};

function PeriodTabs({ selected, onSelect }: { selected: Period; onSelect: (period: Period) => void }) {
  return (
    <div className="sticky top-13 z-10 border-b border-border bg-background">
      <div className="flex px-2">
        {PERIODS.map((period) => {
          const isActive = period === selected;
          return (
            <button
              key={period}
              type="button"
              onClick={() => onSelect(period)}
              aria-pressed={isActive}
              className={`relative flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? "text-[#00696E]" : "text-[#6F7979] hover:text-foreground"
              }`}
            >
              {period}
              {isActive && (
                <span className="absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-[#00696E]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SortMenu({ selected, onSelect }: { selected: Sort; onSelect: (sort: Sort) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && ref.current && !ref.current.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, [open]);

  return (
    <div className="flex justify-end px-4 py-3 lg:px-6">
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 -960 960 960"
            fill="currentColor"
            aria-hidden="true"
            className="text-[#6F7979]"
          >
            <path d="M120-240v-80h240v80H120Zm0-200v-80h480v80H120Zm0-200v-80h720v80H120Z" />
          </svg>
          Sort
          <Image
            src="/icons/keyboard_arrow_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
          >
            {SORTS.map((sort) => {
              const isActive = sort === selected;
              return (
                <button
                  key={sort}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => {
                    onSelect(sort);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
                    isActive ? "text-[#00696E]" : "text-foreground"
                  }`}
                >
                  <Image
                    src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    width={16}
                    height={16}
                    alt=""
                    className={isActive ? "" : "invisible"}
                  />
                  {sort}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RankedRow({ episode }: { episode: RankedEpisode }) {
  return (
    <Link
      href="/watch"
      className="group flex items-start gap-4 px-4 py-2 lg:px-6 transition-colors hover:bg-black/5"
    >
      <div className="relative aspect-3/4 w-15 shrink-0 overflow-hidden rounded bg-muted">
        <Image
          src={episode.imageSrc}
          alt={episode.title}
          fill
          sizes="60px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col self-stretch">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium leading-4 tracking-[0.5px] text-foreground line-clamp-2">
            {episode.title}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium leading-4 tracking-[0.5px] text-[#6F7979]">
              {episode.channelName}
            </span>
            {episode.verified && (
              <Image
                src="/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"
                width={14}
                height={14}
                alt="verified"
              />
            )}
          </div>
        </div>
        <div className="mt-auto flex items-center pt-2">
          <span className="flex-1 text-xs font-medium leading-4 tracking-[0.5px] text-foreground">
            {episode.views}
          </span>
          <span className="flex flex-1 items-center gap-0.5 text-xs font-medium leading-4 tracking-[0.5px] text-foreground">
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
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#E0E3E3] text-xs font-medium text-[#747878]">
        {episode.rank}
      </span>
    </Link>
  );
}

export default function RankingContent() {
  const [period, setPeriod] = useState<Period>("Weekly");
  const [sort, setSort] = useState<Sort>("Trending");
  const episodes = RANKINGS[period];

  return (
    <div className="pb-10">
      <PeriodTabs selected={period} onSelect={setPeriod} />
      <SortMenu selected={sort} onSelect={setSort} />
      <div className="divide-y divide-border">
        {episodes.map((episode) => (
          <RankedRow key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
}
