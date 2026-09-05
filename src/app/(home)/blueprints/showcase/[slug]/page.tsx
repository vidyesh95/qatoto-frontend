import type { Metadata } from "next";

import ShowcaseDetailPage from "@/components/home/blueprints/showcase/showcase-detail-page";
import { getBlueprintByCategory, listBlueprintSlugsByCategory } from "@/lib/blueprints/api";

/** See the note in `teardowns/[slug]/page.tsx` about the deliberately absent sentinel. */
export async function generateStaticParams() {
  const slugs = await listBlueprintSlugsByCategory("showcase");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const showcase = await getBlueprintByCategory("showcase", slug);

  const robots = { index: false, follow: false } as const;

  if (showcase === null) return { robots, title: "Showcase · Blueprints" };

  return {
    robots,
    title: `${showcase.title} · Showcase`,
    // The TAGLINE, not the summary — it is the one line written to describe the launch, which is
    // what a description is for.
    description: showcase.tagline,
    alternates: { canonical: `/blueprints/showcase/${slug}` },
  };
}

export default async function ShowcaseDetailRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShowcaseDetailPage slug={slug} />;
}
