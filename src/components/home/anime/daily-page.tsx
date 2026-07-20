"use client";

import { useState } from "react";
import DailyEpisodeRow from "@/components/home/anime/cards/daily-episode-row";
import DayTabs from "@/components/home/anime/sections/day-tabs";
import { ANIME_DAYS, MOCK_ANIME_SCHEDULE } from "@/mocks/anime-mocks";
import type { Day } from "@/types/anime";

export default function DailyPage() {
  const [day, setDay] = useState<Day>("MON");
  const episodes = MOCK_ANIME_SCHEDULE[day];

  return (
    <div className="pb-10">
      <DayTabs days={ANIME_DAYS} selected={day} onSelect={setDay} />
      <div className="divide-y divide-border">
        {episodes.map((episode) => (
          <DailyEpisodeRow key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  );
}
