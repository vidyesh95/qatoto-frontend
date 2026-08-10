import type { Metadata } from "next";

import OwnForumThreadsPage from "@/components/home/store/forum/own-forum-threads-page";

// Permanently dynamic: the author's own thread list is a session-scoped client-query island, so
// there is no Cache Components refactor to do and the removable-TODO header would be false here.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Your forum threads",
  description: "Threads you have started on the Qatoto business forum",
};

/**
 * NO `generateStaticParams` — this route has no dynamic segment.
 *
 * It sits beside `[threadSlug]`, and routing precedence within a directory puts a static segment
 * above `[param]`, so `mine` reaches this file and is never captured as a thread slug. The same
 * relationship `forum/new` already has.
 */
export default function OwnForumThreadsRoute() {
  return <OwnForumThreadsPage />;
}
