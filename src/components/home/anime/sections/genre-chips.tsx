import Image from "next/image";
import type { Genre } from "@/types/anime";

export default function GenreChips({
  genres,
  selected,
  onSelect,
}: {
  genres: Genre[];
  selected: Genre;
  onSelect: (genre: Genre) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 lg:px-6">
      {genres.map((genre) => {
        const isActive = genre === selected;
        return (
          <button
            key={genre}
            type="button"
            onClick={() => onSelect(genre)}
            aria-pressed={isActive}
            className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border text-sm leading-5 font-medium tracking-[0.1px] transition-colors ${
              isActive
                ? "border-transparent bg-primary pr-4 pl-2 text-primary-foreground"
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
