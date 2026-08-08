import { Suspense } from "react";

import WatchPage, { type WatchSearchParams } from "@/components/home/watch/watch-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default function AnimeWatchPage({ searchParams }: { searchParams: WatchSearchParams }) {
  return (
    <Suspense fallback={null}>
      <WatchPage searchParams={searchParams} />
    </Suspense>
  );
}
