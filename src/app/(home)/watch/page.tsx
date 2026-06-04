import { Suspense } from "react";

import WatchContent from "@/components/home/watch-content";

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
  return <WatchContent id={v ?? ""} />;
}
