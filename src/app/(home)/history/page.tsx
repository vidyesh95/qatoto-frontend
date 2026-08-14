import type { Metadata } from "next";

import HistoryPage from "@/components/home/history/history-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "History",
  description: "Videos you've watched on Qatoto",
};

/**
 * `/history` is the viewer's own watch history — `GET /feed/videos?mode=watched`, the one feed
 * read that 401s an anonymous caller.
 *
 * No `searchParams`: this route has no filter. The shell reads the caller's cookie from inside
 * its own <Suspense> boundary, so nothing here awaits anything.
 */
export default function HistoryRoute() {
  return <HistoryPage />;
}
