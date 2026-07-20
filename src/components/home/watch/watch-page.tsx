import WatchContent from "@/components/home/watch/watch-content";
import { getVideo } from "@/lib/videos";

export type WatchSearchParams = Promise<{ v?: string; t?: string }>;

export default async function WatchPage({ searchParams }: { searchParams: WatchSearchParams }) {
  const { v, t } = await searchParams;
  const video = await getVideo(v ?? "");
  const parsedStartTime = Number(t);
  const startTimeSeconds =
    Number.isFinite(parsedStartTime) && parsedStartTime > 0 ? parsedStartTime : undefined;
  return <WatchContent video={video} startTimeSeconds={startTimeSeconds} />;
}
