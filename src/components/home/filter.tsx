"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const CHIPS = [
  "All",
  "Live",
  "Trending",
  "New to you",
  "News",
  "Recently uploaded",
  "Watched",
  "Gaming",
  "Shopping",
  "Cosplay",
  "Music",
  "News",
  "Robotics",
  "AI",
  "Research",
  "Hardware",
  "Upcoming",
  "Minimalist",
  "Retro",
  "Electronics",
  "Sports",
  "Precision",
  "Animated",
];

export default function Filter() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  } | null>(null);

  const DRAG_THRESHOLD = 5;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    const el = scrollRef.current;
    if (!state || !el || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    if (!state.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      state.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (state.moved) {
      el.scrollLeft = state.startScrollLeft - dx;
      e.preventDefault();
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const el = scrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragState.current = null;
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-0 bottom-0 z-10 bg-linear-to-r from-white via-white to-transparent py-4 pl-4 pr-18 cursor-pointer"
        >
          <Image
            src="/icons/chevron_backward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter back"
          />
        </button>
      )}
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className="h-14 flex flex-row items-center gap-2 px-4 overflow-x-auto cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {CHIPS.map((label, i) => {
          const isSelected = selectedIndex === i;
          return (
            <button
              key={`${label}-${i}`}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`px-4 py-1.5 text-sm text-nowrap rounded-md cursor-pointer border ${
                isSelected
                  ? "bg-black text-white border-black"
                  : "border-outline hover:bg-black/5"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-0 bottom-0 z-10 bg-linear-to-l from-white via-white to-transparent py-4 pl-18 pr-4 cursor-pointer"
        >
          <Image
            src="/icons/chevron_forward_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
            width={24}
            height={24}
            alt="Navigate filter forward"
          />
        </button>
      )}
    </div>
  );
}
