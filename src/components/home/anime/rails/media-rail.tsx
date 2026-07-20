"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import type { Media } from "@/types/anime";

function ScrollButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const isLeft = side === "left";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      className={`absolute top-[38%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-card opacity-0 shadow-lg ring-1 ring-black/5 transition group-hover/row:opacity-100 hover:bg-muted md:grid ${
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

export default function MediaRail({
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
      <header className="mb-3 flex items-center justify-between px-4 lg:px-6">
        <h2 className="text-base font-medium text-foreground sm:text-lg lg:text-xl">{title}</h2>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm text-[#6F7979] transition-colors hover:text-foreground"
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
          className="flex snap-x scroll-px-4 scrollbar-none gap-2 overflow-x-auto px-4 pb-2 lg:scroll-px-6 lg:px-6"
        >
          {items.map((media) => (
            <Link
              key={media.id}
              href="/anime/watch?v=anime-free"
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
              <p className="mt-1 line-clamp-2 h-8 text-[11px] leading-4 font-medium tracking-[0.5px] text-foreground">
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
