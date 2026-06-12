import { Suspense } from "react";

import WatchContent from "@/components/home/watch/watch-content";
import { getVideo } from "@/lib/videos";

type SearchParams = Promise<{ v?: string }>;

export default function AnimeWatchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <AnimeWatchResolver searchParams={searchParams} />
    </Suspense>
  );
}

async function AnimeWatchResolver({ searchParams }: { searchParams: SearchParams }) {
  const { v } = await searchParams;
  const video = await getVideo(v ?? "");
  return <WatchContent video={video} />;
}
