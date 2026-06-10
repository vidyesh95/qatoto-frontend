"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

type Media = { id: string; imageSrc: string; title: string };

const HERO = {
  imageSrc: "/dummy/anime_hero.avif",
  title:
    "A Record Of Mortal's Journey To Immortality: Immortal Han Li's Adventure with cyan bottle",
  tag: "Featured",
};

const CATEGORIES = [
  { icon: "/icons/genre_40dp.svg", label: "Genre", href: "/anime/genre" },
  { icon: "/icons/daily_40dp.svg", label: "Daily", href: "/anime/daily" },
  { icon: "/icons/fovorite_40dp.svg", label: "Favorite", href: "/anime/favorite" },
  { icon: "/icons/ranking_40dp.svg", label: "Ranking", href: "/anime/ranking" },
];

const RECENT_EPISODES: Media[] = [
  { id: "1", imageSrc: "/dummy/recent_episode_01.avif", title: "God Troubles Me Season 3" },
  { id: "2", imageSrc: "/dummy/recent_episode_02.avif", title: "Dragon's Disciple" },
  { id: "3", imageSrc: "/dummy/recent_episode_03.avif", title: "Master of the Star Spring" },
  { id: "4", imageSrc: "/dummy/recent_episode_04.avif", title: "The Furious Yama" },
  {
    id: "5",
    imageSrc: "/dummy/recent_episode_05.avif",
    title: "R.E.D (Rescue Eternal Desert)",
  },
  { id: "6", imageSrc: "/dummy/recent_episode_06.avif", title: "Fairy Mountain" },
];

const RECOMMENDED: Media[] = [
  { id: "1", imageSrc: "/dummy/recommended_for_you_01.avif", title: "Word of Honor" },
  { id: "2", imageSrc: "/dummy/recommended_for_you_02.avif", title: "You're A Genius!" },
  {
    id: "3",
    imageSrc: "/dummy/recommended_for_you_03.avif",
    title: "Let Me Check the Walkthrough First",
  },
  {
    id: "4",
    imageSrc: "/dummy/recommended_for_you_04.avif",
    title: "The Soul of Soldier Master",
  },
  { id: "5", imageSrc: "/dummy/recommended_for_you_05.avif", title: "The Warrior From Qin" },
  { id: "6", imageSrc: "/dummy/recommended_for_you_06.avif", title: "Spirit Wind Elegance" },
];

const COMPLETED: Media[] = [
  {
    id: "1",
    imageSrc: "/dummy/completed_series01.avif",
    title: "A Record Of Mortal's Journey To Immortality",
  },
  {
    id: "2",
    imageSrc: "/dummy/completed_series02.avif",
    title: "My Journey in an Alternate World",
  },
  { id: "3", imageSrc: "/dummy/completed_series03.avif", title: "Fairies Albums S2" },
  { id: "4", imageSrc: "/dummy/completed_series04.avif", title: "Immortality" },
  { id: "5", imageSrc: "/dummy/completed_series05.avif", title: "The Infinitors" },
  { id: "6", imageSrc: "/dummy/completed_series06.avif", title: "Long Sword" },
];

const TRENDING: Media[] = [
  { id: "1", imageSrc: "/dummy/trending01.avif", title: "The Dining Room of Link Lee" },
  {
    id: "2",
    imageSrc: "/dummy/trending02.avif",
    title: "TONIKAWA: Over the Moon For You -Uniform-",
  },
  { id: "3", imageSrc: "/dummy/trending03.avif", title: "Carp Reborn 3rd Season" },
  {
    id: "4",
    imageSrc: "/dummy/trending04.avif",
    title: "War God System! I'm Counting On You",
  },
  {
    id: "5",
    imageSrc: "/dummy/trending05.avif",
    title: "Look, I Can See Your Ears!",
  },
  { id: "6", imageSrc: "/dummy/trending06.avif", title: "Foreordination" },
];

const NEW_ARRIVALS: Media[] = [
  {
    id: "1",
    imageSrc: "/dummy/new_arriavals01.avif",
    title: "Demon Slayer: Kimetsu no Yaiba Swordsmith Village Arc",
  },
  { id: "2", imageSrc: "/dummy/new_arriavals02.avif", title: "The Story of Fengzhi Senla" },
  {
    id: "3",
    imageSrc: "/dummy/new_arriavals03.avif",
    title: "The Daily Life of the Immortal King S2",
  },
  { id: "4", imageSrc: "/dummy/new_arriavals04.avif", title: "Wings of the World" },
  { id: "5", imageSrc: "/dummy/new_arriavals05.avif", title: "The Infinitors" },
  { id: "6", imageSrc: "/dummy/new_arriavals06.avif", title: "Rakshasa Street S2" },
];

function AnimeHero() {
  const [muted, setMuted] = useState(true);

  return (
    <section className="px-4 lg:px-6 pt-1 pb-2 flex justify-center">
      <div className="relative w-full md:w-82 overflow-hidden rounded-xl aspect-video">
        <Image
          src={HERO.imageSrc}
          alt={HERO.title}
          fill
          priority
          sizes="(min-width: 768px) 328px, 100vw"
          className="object-cover"
        />

        <div className="absolute inset-x-0 top-0 flex justify-end p-2 bg-linear-to-b from-black/25 to-transparent">
          <button
            type="button"
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? "Unmute preview" : "Mute preview"}
            className="grid place-items-center transition hover:opacity-80"
          >
            <Image
              src={
                muted
                  ? "/icons/volume_off_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
                  : "/icons/volume_up_24dp_FFFFFF_FILL1_wght400_GRAD0_opsz24.svg"
              }
              width={14}
              height={14}
              alt=""
              className="filter-[drop-shadow(0_1px_2px_rgb(0_0_0/0.5))]"
            />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/50 to-transparent">
          <p className="text-white text-xs font-normal leading-tight line-clamp-2 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
            {HERO.title}
          </p>
        </div>
      </div>
    </section>
  );
}

function CategoryLinks() {
  return (
    <nav className="px-4 lg:px-6 py-2">
      <ul className="flex items-start">
        {CATEGORIES.map((category) => (
          <li key={category.label} className="flex-1">
            <Link
              href={category.href}
              className="group flex flex-col items-center gap-1 rounded-xl p-1 md:p-2 transition-colors hover:bg-black/5"
            >
              <Image
                src={category.icon}
                width={40}
                height={40}
                alt=""
                className="size-10 transition-transform group-hover:scale-105"
              />
              <span className="text-[11px] font-medium leading-4 tracking-[0.5px] text-foreground">
                {category.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ScrollButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      className={`hidden md:grid place-items-center absolute top-[38%] -translate-y-1/2 z-10 size-10 rounded-full bg-card shadow-lg ring-1 ring-black/5 opacity-0 transition group-hover/row:opacity-100 hover:bg-muted ${
        isLeft ? "left-2 lg:left-3" : "right-2 lg:right-3"
      }`}
    >
      <Image
        src={
          isLeft
            ? "/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            : "/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
        }
        width={24}
        height={24}
        alt=""
      />
    </button>
  );
}

function MediaRow({
  title,
  href,
  items,
  variant,
}: {
  title: string;
  href: string;
  items: Media[];
  variant: "landscape" | "poster" | "poster-lg";
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scroll = (dir: 1 | -1) => {
    const scrollerNode = scroller.current;
    if (!scrollerNode) return;
    scrollerNode.scrollBy({ left: dir * scrollerNode.clientWidth * 0.85, behavior: "smooth" });
  };

  const cardWidth =
    variant === "landscape"
      ? "w-40 sm:w-44 lg:w-48"
      : variant === "poster-lg"
        ? "w-28 sm:w-32 lg:w-36"
        : "w-20 sm:w-24 lg:w-28";
  const aspect = variant === "landscape" ? "aspect-video" : "aspect-[3/4]";
  const imageSizes =
    variant === "landscape" ? "200px" : variant === "poster-lg" ? "150px" : "120px";

  return (
    <section>
      <header className="flex items-center justify-between px-4 lg:px-6 mb-3">
        <h2 className="text-base sm:text-lg lg:text-xl font-medium text-foreground">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm text-[#6F7979] hover:text-foreground transition-colors"
        >
          See all
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={18}
            height={18}
            alt=""
            className="opacity-60"
          />
        </Link>
      </header>

      <div className="group/row relative">
        <ScrollButton side="left" onClick={() => scroll(-1)} />
        <div
          ref={scroller}
          className="flex gap-2 overflow-x-auto px-4 lg:px-6 scroll-px-4 lg:scroll-px-6 pb-2 snap-x scrollbar-none"
        >
          {items.map((media) => (
            <Link
              key={media.id}
              href="/watch"
              className={`group/card shrink-0 snap-start ${cardWidth}`}
            >
              <div className={`relative overflow-hidden rounded bg-muted ${aspect}`}>
                <Image
                  src={media.imageSrc}
                  alt={media.title}
                  fill
                  sizes={imageSizes}
                  className="object-cover transition-transform duration-300 group-hover/card:scale-105"
                />
              </div>
              <p className="mt-1 h-8 text-[11px] font-medium leading-4 tracking-[0.5px] text-foreground line-clamp-2">
                {media.title}
              </p>
            </Link>
          ))}
        </div>
        <ScrollButton side="right" onClick={() => scroll(1)} />
      </div>
    </section>
  );
}

export default function AnimeContent() {
  return (
    <div className="pb-10">
      <AnimeHero />
      <CategoryLinks />
      <div className="mt-4 space-y-4">
        <MediaRow
          title="Recent Episode 💡"
          href="/anime?view=recent"
          items={RECENT_EPISODES}
          variant="landscape"
        />
        <MediaRow
          title="Recommended For You 🔬"
          href="/anime?view=recommended"
          items={RECOMMENDED}
          variant="landscape"
        />
        <MediaRow
          title="Completed Series 👍🏻"
          href="/anime?view=completed"
          items={COMPLETED}
          variant="poster"
        />
        <MediaRow
          title="Trending 📈"
          href="/anime?view=trending"
          items={TRENDING}
          variant="poster-lg"
        />
        <MediaRow
          title="New Arrivals 🛬"
          href="/anime?view=new"
          items={NEW_ARRIVALS}
          variant="poster-lg"
        />
      </div>
    </div>
  );
}
