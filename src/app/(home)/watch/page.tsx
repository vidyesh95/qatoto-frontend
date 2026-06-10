import { Suspense } from "react";

import WatchContent from "@/components/home/watch-content";
import { getVideo } from "@/lib/videos";

type SearchParams = Promise<{ v?: string }>;

export default function WatchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <WatchResolver searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchResolver({ searchParams }: { searchParams: SearchParams }) {
  const { v } = await searchParams;
  const video = await getVideo(v ?? "");
  return <WatchContent video={video} />;
}
