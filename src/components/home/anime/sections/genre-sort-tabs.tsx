import Image from "next/image";
import type { GenreSort } from "@/types/anime";

export default function GenreSortTabs({
  sorts,
  selected,
  onSelect,
}: {
  sorts: GenreSort[];
  selected: GenreSort;
  onSelect: (sort: GenreSort) => void;
}) {
  return (
    <div className="px-4 py-2 lg:px-6">
      <div className="flex w-full lg:w-100">
        {sorts.map((sort, i) => {
          const isActive = sort === selected;
          const isFirst = i === 0;
          const isLast = i === sorts.length - 1;
          return (
            <button
              key={sort}
              type="button"
              onClick={() => onSelect(sort)}
              aria-pressed={isActive}
              className={`inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 border border-border px-3 py-2.5 text-sm leading-5 font-medium tracking-[0.1px] transition-colors ${
                isFirst ? "rounded-l-full" : "-ml-px"
              } ${isLast ? "rounded-r-full" : ""} ${
                isActive
                  ? "z-10 bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
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
