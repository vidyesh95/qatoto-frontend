import type { Metadata } from "next";

import ForumThreadComposer from "@/components/home/store/composers/forum-thread-composer";

// Permanently dynamic: session-scoped, and a thread is attributed to whoever wrote it.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Ask the business forum",
  description: "Post a question to other businesses on Qatoto",
};

/**
 * NO `generateStaticParams` — this route has no dynamic segment.
 *
 * It sits beside `[threadSlug]`, and routing precedence within a directory puts static above
 * `[param]`, so `new` reaches this file and is never captured as a thread slug. The same relationship
 * `rfqs/new` has with `rfqs/[rfqId]`.
 */
export default function NewForumThreadRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <ForumThreadComposer />
    </div>
  );
}
