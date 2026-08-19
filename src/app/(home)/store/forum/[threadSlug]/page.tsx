import type { Metadata } from "next";

import ForumThreadPage from "@/components/home/store/forum-thread-page";
import { withSentinelValues } from "@/lib/static-params";
import { getForumThread, listForumThreads } from "@/lib/store/forum.api";
import { prettifySlugForDisplay } from "@/lib/store";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender the threads the live list read returns, capped at 24.
 *
 * A failed read yields `[]`, and `withSentinelValues` turns that into the one unresolvable param
 * `cacheComponents` needs instead of the empty array it refuses. No session is forwarded: the
 * prerender list is the anonymous answer, which is also the only one a public read gives.
 */
export async function generateStaticParams() {
  const result = await listForumThreads({ limit: 24 });
  const slugs = result.success ? result.data.items.map((thread) => thread.slug) : [];
  return withSentinelValues(slugs).map((threadSlug) => ({ threadSlug }));
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
    alternates: { canonical: `/store/forum/${threadSlug}` },
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
