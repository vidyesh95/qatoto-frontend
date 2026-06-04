import WatchContent from "@/components/home/watch-content";

type SearchParams = Promise<{ v?: string }>;

export default async function WatchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { v } = await searchParams;
  return <WatchContent id={v ?? ""} />;
}