// TRANSPORT: mock — the rails below still read `@/mocks/anime-mocks`. The HERO does not:
// it arrives as `heroSlot`, an async server component the route composes, which reads
// `GET /anime/hero-slides`.
//
// WHY A SLOT AND NOT AN IMPORT. This file is `"use client"`, and a client component cannot
// import an async server component. Passing the already-rendered element down as a prop is
// how the two compose — the same arrangement `feed/home.tsx` uses for the promotional
// carousel — and it keeps the server read out of the client bundle entirely.
"use client";

import type { ReactNode } from "react";

import CategoryLinks from "@/components/home/anime/sections/category-links";
import MediaRail from "@/components/home/anime/rails/media-rail";
import {
  ANIME_CATEGORIES,
  MOCK_COMPLETED_SERIES,
  MOCK_NEW_ARRIVALS,
  MOCK_RECENT_EPISODES,
  MOCK_RECOMMENDED_ANIME,
  MOCK_TRENDING_ANIME,
} from "@/mocks/anime-mocks";

export default function AnimePage({ heroSlot }: { heroSlot: ReactNode }) {
  return (
    <div className="pb-10">
      {heroSlot}
      <CategoryLinks categories={ANIME_CATEGORIES} />
      <div className="mt-4 space-y-4">
        <MediaRail
          title="Recent Episode 💡"
          href="/anime?view=recent"
          items={MOCK_RECENT_EPISODES}
          variant="landscape"
        />
        <MediaRail
          title="Recommended For You 🔬"
          href="/anime?view=recommended"
          items={MOCK_RECOMMENDED_ANIME}
          variant="landscape"
        />
        <MediaRail
          title="Completed Series 👍🏻"
          href="/anime?view=completed"
          items={MOCK_COMPLETED_SERIES}
          variant="poster"
        />
        <MediaRail
          title="Trending 📈"
          href="/anime?view=trending"
          items={MOCK_TRENDING_ANIME}
          variant="poster-lg"
        />
        <MediaRail
          title="New Arrivals 🛬"
          href="/anime?view=new"
          items={MOCK_NEW_ARRIVALS}
          variant="poster-lg"
        />
      </div>
    </div>
  );
}
