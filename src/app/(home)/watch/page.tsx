import { Suspense } from "react";

import WatchPage, { type WatchSearchParams } from "@/components/home/watch/watch-page";

export default function Page({ searchParams }: { searchParams: WatchSearchParams }) {
  return (
    <Suspense fallback={null}>
      <WatchPage searchParams={searchParams} />
    </Suspense>
  );
}
