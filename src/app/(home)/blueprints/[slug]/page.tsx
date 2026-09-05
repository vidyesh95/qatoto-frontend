import type { Metadata } from "next";

import BlueprintDetailPage from "@/components/home/blueprints/blueprint-detail-page";
import { getBlueprint, listBlueprintSlugs } from "@/lib/blueprints/api";

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 *
 * NO `withSentinelValues` HERE, unlike every R&D detail route. That helper exists because a
 * failed backend read returns `[]` and an empty list throws `EmptyGenerateStaticParamsError`.
 * This getter reads an in-repo fixture array, which cannot be empty and cannot fail, so the
 * blogs precedent (`src/app/(information)/blogs/[slug]/page.tsx`) applies instead.
 *
 * ADD THE SENTINEL AT THE SAME MOMENT `listBlueprintSlugs` STARTS READING THE BACKEND — not
 * before, and not later. Before, it prerenders a `__none__` page nobody needs; later, the first
 * CI run without a reachable backend fails the build.
 */
export async function generateStaticParams() {
  const slugs = await listBlueprintSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blueprint = await getBlueprint(slug);
  if (blueprint === null) return { title: "Blueprints" };

  return {
    title: `${blueprint.title} · Blueprints`,
    description: blueprint.summary,
    alternates: { canonical: `/blueprints/${slug}` },
  };
}

export default async function BlueprintRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlueprintDetailPage slug={slug} />;
}
