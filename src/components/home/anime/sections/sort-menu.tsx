"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { RankingSort } from "@/types/anime";

export default function SortMenu({
  sorts,
  selected,
  onSelect,
}: {
  sorts: RankingSort[];
  selected: RankingSort;
  onSelect: (sort: RankingSort) => void;
}) {
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
            {sorts.map((sort) => {
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
