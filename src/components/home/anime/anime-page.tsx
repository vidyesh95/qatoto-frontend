"use client";

import AnimeHero from "@/components/home/anime/sections/anime-hero";
import CategoryLinks from "@/components/home/anime/sections/category-links";
import MediaRail from "@/components/home/anime/rails/media-rail";
import {
  ANIME_CATEGORIES,
  MOCK_ANIME_HERO,
  MOCK_COMPLETED_SERIES,
  MOCK_NEW_ARRIVALS,
  MOCK_RECENT_EPISODES,
  MOCK_RECOMMENDED_ANIME,
  MOCK_TRENDING_ANIME,
} from "@/mocks/anime-mocks";

export default function AnimePage() {
  return (
    <div className="pb-10">
      <AnimeHero hero={MOCK_ANIME_HERO} />
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
