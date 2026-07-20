"use client";

import { useState } from "react";
import VideoCard from "@/components/home/shared/video-card";
import GenreChips from "@/components/home/anime/sections/genre-chips";
import GenreSortTabs from "@/components/home/anime/sections/genre-sort-tabs";
import { ANIME_GENRES, ANIME_GENRE_SORTS, MOCK_ANIME_VIDEOS } from "@/mocks/anime-mocks";
import type { Genre, GenreSort } from "@/types/anime";

export default function GenrePage() {
  const [genre, setGenre] = useState<Genre>("All");
  const [sort, setSort] = useState<GenreSort>("Hottest");

  return (
    <div className="pb-10">
      <GenreChips genres={ANIME_GENRES} selected={genre} onSelect={setGenre} />
      <GenreSortTabs sorts={ANIME_GENRE_SORTS} selected={sort} onSelect={setSort} />

      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
        {MOCK_ANIME_VIDEOS.map((video) => (
          <VideoCard key={video.title} {...video} />
        ))}
      </div>
    </div>
  );
}
