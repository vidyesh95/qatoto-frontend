import type { Metadata } from "next";

import WorkshopPage from "@/components/home/research-and-development/workshop-page";
import { getResearchProjectDetail, listResearchProjectSlugs } from "@/lib/rnd/projects.api";

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 * A failed read returns `[]` so an unreachable backend does not fail the build; those
 * params then render on demand.
 */
export async function generateStaticParams() {
  const slugsResult = await listResearchProjectSlugs();
  if (!slugsResult.success) return [];
  return slugsResult.data.map((projectSlug) => ({ id: projectSlug }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detailResult = await getResearchProjectDetail(id);
  if (!detailResult.success) return { title: "Workshop · R&D" };
  return { title: `${detailResult.data.name} Workshop · R&D` };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopPage projectSlug={id} />;
}
