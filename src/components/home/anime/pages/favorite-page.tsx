"use client";

import { useState } from "react";
import VideoCard from "@/components/home/shared/video-card";
import FavoriteEmptyState from "@/components/home/anime/sections/favorite-empty-state";
import FavoriteTabs from "@/components/home/anime/sections/favorite-tabs";
import {
  ANIME_FAVORITE_TABS,
  MOCK_BOOKMARKED_ANIME_VIDEOS,
  MOCK_LIKED_ANIME_VIDEOS,
} from "@/mocks/anime-mocks";
import type { FavoriteTab } from "@/types/anime";
import type { VideoCardProps } from "@/types/video";

const VIDEOS_BY_TAB: Record<FavoriteTab, VideoCardProps[]> = {
  Liked: MOCK_LIKED_ANIME_VIDEOS,
  Bookmarked: MOCK_BOOKMARKED_ANIME_VIDEOS,
};

export default function FavoritePage() {
  const [tab, setTab] = useState<FavoriteTab>("Liked");
  const videos = VIDEOS_BY_TAB[tab];

  return (
    <div className="pb-10">
      <FavoriteTabs tabs={ANIME_FAVORITE_TABS} selected={tab} onSelect={setTab} />

      {videos.length === 0 ? (
        <FavoriteEmptyState tab={tab} />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-6 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.title} {...video} />
          ))}
        </div>
      )}
    </div>
  );
}
