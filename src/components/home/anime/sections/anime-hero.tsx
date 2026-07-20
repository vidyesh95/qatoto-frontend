"use client";

import Image from "next/image";
import { useState } from "react";

export default function AnimeHero({ hero }: { hero: { imageSrc: string; title: string } }) {
  const [muted, setMuted] = useState(true);

  return (
    <section className="flex justify-center px-4 pt-1 pb-2 lg:px-6">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl md:w-82">
        <Image
          src={hero.imageSrc}
          alt={hero.title}
          fill
          priority
          sizes="(min-width: 768px) 328px, 100vw"
          className="object-cover"
        />

        <div className="absolute inset-x-0 top-0 flex justify-end bg-linear-to-b from-black/25 to-transparent p-2">
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

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2">
          <p className="line-clamp-2 text-xs leading-tight font-normal text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">
            {hero.title}
          </p>
        </div>
      </div>
    </section>
  );
}
