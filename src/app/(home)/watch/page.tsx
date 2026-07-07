import { Suspense } from "react";

import WatchContent from "@/components/home/watch/watch-content";
import { getVideo } from "@/lib/videos";

type SearchParams = Promise<{ v?: string; t?: string }>;

export default function WatchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={null}>
      <WatchResolver searchParams={searchParams} />
    </Suspense>
  );
}

async function WatchResolver({ searchParams }: { searchParams: SearchParams }) {
  const { v, t } = await searchParams;
  const video = await getVideo(v ?? "");
  const parsedStartTime = Number(t);
  const startTimeSeconds =
    Number.isFinite(parsedStartTime) && parsedStartTime > 0 ? parsedStartTime : undefined;
  return <WatchContent video={video} startTimeSeconds={startTimeSeconds} />;
}
