import type { Metadata } from "next";

import TeardownDetailPage from "@/components/home/blueprints/teardowns/teardown-detail-page";
import { getBlueprintByCategory, listBlueprintSlugsByCategory } from "@/lib/blueprints/api";

/**
 * Prerender every published teardown slug — a dynamic route needs this under `cacheComponents`.
 *
 * NO `withSentinelValues` HERE, for the reason `src/lib/blueprints/api.ts` records: the getter
 * reads an in-repo fixture array, which cannot be empty and cannot fail. Add the sentinel at the
 * same moment it starts reading the backend, and filter the reserved slugs BEFORE wrapping.
 */
export async function generateStaticParams() {
  const slugs = await listBlueprintSlugsByCategory("teardown");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const teardown = await getBlueprintByCategory("teardown", slug);

  // `noindex` ON BOTH RETURN PATHS. The miss path needs it too: returning it only for a resolved
  // teardown would leave every unknown slug indexable, which is the easiest half to forget.
  const robots = { index: false, follow: false } as const;

  if (teardown === null) return { robots, title: "Teardowns · Blueprints" };

  return {
    robots,
    title: `${teardown.title} · Teardowns`,
    description: teardown.summary,
    alternates: { canonical: `/blueprints/teardowns/${slug}` },
  };
}

export default async function TeardownRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TeardownDetailPage slug={slug} />;
}
