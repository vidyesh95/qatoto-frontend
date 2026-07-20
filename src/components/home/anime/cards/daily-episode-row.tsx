import Image from "next/image";
import Link from "next/link";
import type { DailyEpisode } from "@/types/anime";

export default function DailyEpisodeRow({ episode }: { episode: DailyEpisode }) {
  return (
    <Link href="/watch" className="group flex gap-4 px-4 py-2 transition-colors hover:bg-black/5">
      <div className="relative aspect-3/4 w-25 shrink-0 overflow-hidden rounded bg-muted">
        <Image
          src={episode.imageSrc}
          alt={episode.title}
          fill
          sizes="100px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 text-sm leading-4 font-medium tracking-wide text-foreground">
          {episode.title}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs leading-4 font-medium tracking-wide text-[#6F7979]">
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
        <div className="mt-auto flex items-center pt-2">
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
