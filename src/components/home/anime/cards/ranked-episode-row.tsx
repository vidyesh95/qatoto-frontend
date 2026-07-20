import Image from "next/image";
import Link from "next/link";
import type { RankedEpisode } from "@/types/anime";

const MEDALS: Record<number, { bg: string; ring: string; text: string }> = {
  1: {
    bg: "bg-gradient-to-b from-[#FFE082] to-[#F6B600]",
    ring: "ring-[#E5A100]",
    text: "text-[#7A5200]",
  },
  2: {
    bg: "bg-gradient-to-b from-[#F0F1F3] to-[#C2C7CC]",
    ring: "ring-[#AEB4BA]",
    text: "text-[#5B6166]",
  },
  3: {
    bg: "bg-gradient-to-b from-[#E8B07A] to-[#C77B3B]",
    ring: "ring-[#B26A2E]",
    text: "text-[#5E3411]",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank];
  if (medal) {
    return (
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold shadow-sm ring-1 ${medal.bg} ${medal.ring} ${medal.text}`}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#E0E3E3] text-xs font-medium text-[#747878]">
      {rank}
    </span>
  );
}

export default function RankedEpisodeRow({ episode }: { episode: RankedEpisode }) {
  return (
    <Link
      href="/watch"
      className="group flex items-start gap-4 px-4 py-2 transition-colors hover:bg-black/5 lg:px-6"
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
          <p className="line-clamp-2 text-sm leading-4 font-medium tracking-wide text-foreground">
            {episode.title}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-xs leading-4 font-medium tracking-wide text-[#6F7979]">
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
          <span className="flex-1 text-xs leading-4 font-medium tracking-wide text-foreground">
            {episode.views}
          </span>
          <span className="flex flex-1 items-center gap-0.5 text-xs leading-4 font-medium tracking-wide text-foreground">
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
      <RankBadge rank={episode.rank} />
    </Link>
  );
}
