import type { Metadata } from "next";

import ShowcaseDetailPage from "@/components/home/blueprints/showcase/showcase-detail-page";
import { getPublicShowcase, listPublicShowcaseSlugs } from "@/lib/blueprints/showcase-public.api";
import { withSentinelValues } from "@/lib/static-params";

/**
 * Prerender every published slug.
 *
 * THE SENTINEL IS HERE NOW, and `api.ts` said to add it at exactly this moment: the list comes from
 * the backend, so it can be empty — a database with nothing published yet, or a server that is
 * down. An empty array makes Next treat the route as having no paths at all, which is not the same
 * as having none today.
 *
 * FILTERED FIRST, WRAPPED SECOND. Wrapping and then filtering can drop the sentinel itself.
 */
export async function generateStaticParams() {
  const slugsResponse = await listPublicShowcaseSlugs();
  // `?? []` is right here and nowhere else on this surface: Next's contract is an array, and a
  // failed prerender list must not take the build down.
  const slugs = slugsResponse.success ? slugsResponse.data : [];
  return withSentinelValues(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const showcaseResponse = await getPublicShowcase(slug);

  const robots = { index: false, follow: false } as const;

  if (!showcaseResponse.success) return { robots, title: "Showcase · Blueprints" };
  const showcase = showcaseResponse.data;

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
