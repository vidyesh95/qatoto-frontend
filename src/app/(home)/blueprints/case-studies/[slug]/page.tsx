import type { Metadata } from "next";

import CaseStudyDetailPage from "@/components/home/blueprints/case-studies/case-study-detail-page";
import { getBlueprintByCategory, listBlueprintSlugsByCategory } from "@/lib/blueprints/api";

/** See the note in `teardowns/[slug]/page.tsx` about the deliberately absent sentinel. */
export async function generateStaticParams() {
  const slugs = await listBlueprintSlugsByCategory("case_study");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getBlueprintByCategory("case_study", slug);

  const robots = { index: false, follow: false } as const;

  if (caseStudy === null) return { robots, title: "Case studies · Blueprints" };

  return {
    robots,
    title: `${caseStudy.title} · Case studies`,
    description: caseStudy.oneLineDefinition,
    alternates: { canonical: `/blueprints/case-studies/${slug}` },
  };
}

export default async function CaseStudyRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CaseStudyDetailPage slug={slug} />;
}
