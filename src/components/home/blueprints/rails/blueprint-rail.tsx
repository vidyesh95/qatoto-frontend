// TRANSPORT: props-only — the blueprints arrive from `blueprints-page`, which reads
// `@/lib/blueprints/api`. This component fetches nothing.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import BlueprintCard from "@/components/home/blueprints/cards/blueprint-card";
import type { Blueprint } from "@/lib/blueprints/schemas";

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

/**
 * One horizontally-scrolling category rail.
 *
 * THE "SEE ALL" LINK IS BACK, AND ONLY BECAUSE THERE IS A ROUTE BEHIND IT NOW. This component
 * shipped without one on purpose: the `MediaRail` it replaces pointed at `/anime?view=recent`, a
 * query that page never read, so the affordance went nowhere and changed nothing. Each category
 * now has its own list route, which was the stated condition.
 *
 * `seeAllHref` is REQUIRED rather than optional for the same reason — an optional one invites the
 * next caller to omit it and re-create the rail with no way out of it.
 */
export default function BlueprintRail({
  title,
  blurb,
  blueprints,
  seeAllHref,
}: {
  title: string;
  blurb: string;
  blueprints: Blueprint[];
  seeAllHref: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollByPage = (direction: 1 | -1) => {
    const scrollerNode = scroller.current;
    if (!scrollerNode) return;
    scrollerNode.scrollBy({
      left: direction * scrollerNode.clientWidth * 0.85,
      behavior: "smooth",
    });
  };

  return (
    <section>
      <header className="mb-3 flex items-end justify-between gap-4 px-4 lg:px-6">
        <div>
          <h2 className="text-base font-medium text-foreground sm:text-lg lg:text-xl">{title}</h2>
          <p className="mt-0.5 text-xs text-[#6F7979]">{blurb}</p>
        </div>
        <Link
          href={seeAllHref}
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#00696E] hover:underline"
        >
          See all
          <Image
            src="/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={12}
            height={12}
            className="size-3"
          />
        </Link>
      </header>

      <div className="group/row relative">
        <ScrollButton side="left" onClick={() => scrollByPage(-1)} />
        <div
          ref={scroller}
          className="flex snap-x scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pb-2 lg:scroll-px-6 lg:px-6"
        >
          {blueprints.map((blueprint) => (
            <BlueprintCard key={blueprint.id} blueprint={blueprint} />
          ))}
        </div>
        <ScrollButton side="right" onClick={() => scrollByPage(1)} />
      </div>
    </section>
  );
}
