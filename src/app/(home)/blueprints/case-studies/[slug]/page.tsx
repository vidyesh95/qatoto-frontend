import type { Metadata } from "next";

import CaseStudyDetailPage from "@/components/home/blueprints/case-studies/case-study-detail-page";
import {
  getPublicCaseStudy,
  listPublicCaseStudySlugs,
} from "@/lib/blueprints/case-study-public.api";
import { withSentinelValues } from "@/lib/static-params";

/**
 * Prerender every visible slug.
 *
 * THE SENTINEL IS HERE NOW, and the note this replaced said to add it at exactly this moment: the
 * list comes from the backend, so it can be empty — a database with nothing published yet, or a
 * server that is down. An empty array makes Next treat the route as having no paths at all, which
 * is not the same as having none today.
 */
export async function generateStaticParams() {
  const slugsResponse = await listPublicCaseStudySlugs();
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
  const detailResponse = await getPublicCaseStudy(slug);

  const robots = { index: false, follow: false } as const;

  if (!detailResponse.success) return { robots, title: "Case studies · Blueprints" };
  const caseStudy = detailResponse.data.caseStudy;

  return {
    robots,
    title: `${caseStudy.title} · Case studies`,
    description: caseStudy.oneLineAction,
    alternates: { canonical: `/blueprints/case-studies/${slug}` },
  };
}

export default async function CaseStudyRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CaseStudyDetailPage slug={slug} />;
}
