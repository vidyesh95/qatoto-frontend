import type { Metadata } from "next";

import ForumThreadPage from "@/components/home/store/forum-thread-page";
import { withSentinelValues } from "@/lib/static-params";
import { getForumThread } from "@/lib/store/forum.api";
import { prettifySlugForDisplay } from "@/lib/store";
import { MOCK_FEATURED_FORUM_THREAD_SLUGS } from "@/mocks/store/forum-mocks";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `withSentinelValues` because `cacheComponents` fails the build on an empty
 * `generateStaticParams`, and the sentinel slug takes the same `notFound()` path a typo does.
 */
export function generateStaticParams() {
  return withSentinelValues([...MOCK_FEATURED_FORUM_THREAD_SLUGS]).map((threadSlug) => ({
    threadSlug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadSlug: string }>;
}): Promise<Metadata> {
  const { threadSlug } = await params;
  const result = await getForumThread(threadSlug);

  // A failed metadata read must not take the page down — the page renders its own error or 404.
  const title = result.success ? result.data.thread.title : prettifySlugForDisplay(threadSlug);

  return {
    title: `${title} · Business forum`,
    description: result.success
      ? result.data.thread.excerpt
      : "A question on the Qatoto business forum",
  };
}

export default async function StoreForumThreadRoute({
  params,
}: {
  params: Promise<{ threadSlug: string }>;
}) {
  const { threadSlug } = await params;
  return <ForumThreadPage threadSlug={threadSlug} />;
}
