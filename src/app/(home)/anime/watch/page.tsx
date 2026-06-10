import { Suspense } from "react";

import WatchContent from "@/components/home/watch-content";

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
  return <WatchContent id={v ?? ""} />;
}
