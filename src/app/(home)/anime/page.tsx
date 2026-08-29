import type { Metadata } from "next";
import { Suspense } from "react";

import AnimePage from "@/components/home/anime/anime-page";
import AnimeHeroCarouselSection from "@/components/home/anime/sections/anime-hero-carousel-section";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Anime",
  description: "Anime page for Qatoto",
};

/**
 * The hero is composed HERE rather than imported by `AnimePage`, which is `"use client"` and
 * therefore cannot import an async server component.
 *
 * ITS OWN `<Suspense>`, separate from anything below it, so a slow hero read never holds
 * back the rails. THE FALLBACK'S BOX MUST MATCH THE CARD EXACTLY — same aspect ratio, same
 * `md:w-82`, same rounding — or every rail on the page jumps when the hero arrives.
 */
export default function Anime() {
  return (
    <AnimePage
      heroSlot={
        <Suspense
          fallback={
            <div className="flex justify-center px-4 pt-1 pb-2 lg:px-6">
              <div className="aspect-video w-full rounded-xl bg-muted md:w-82" aria-hidden="true" />
            </div>
          }
        >
          <AnimeHeroCarouselSection />
        </Suspense>
      }
    />
  );
}
