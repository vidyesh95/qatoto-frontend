"use client";

import { useState } from "react";
import RankedEpisodeRow from "@/components/home/anime/cards/ranked-episode-row";
import PeriodTabs from "@/components/home/anime/sections/period-tabs";
import SortMenu from "@/components/home/anime/sections/sort-menu";
import {
  ANIME_RANKING_PERIODS,
  ANIME_RANKING_SORTS,
  MOCK_ANIME_RANKINGS,
} from "@/mocks/anime-mocks";
import type { Period, RankingSort } from "@/types/anime";

export default function RankingPage() {
  const [period, setPeriod] = useState<Period>("Weekly");
  const [sort, setSort] = useState<RankingSort>("Trending");
  const episodes = MOCK_ANIME_RANKINGS[period];

  return (
    <div className="pb-10">
      <PeriodTabs periods={ANIME_RANKING_PERIODS} selected={period} onSelect={setPeriod} />
      <SortMenu sorts={ANIME_RANKING_SORTS} selected={sort} onSelect={setSort} />
      <div className="divide-y divide-border">
        {episodes.map((episode) => (
          <RankedEpisodeRow key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
}
