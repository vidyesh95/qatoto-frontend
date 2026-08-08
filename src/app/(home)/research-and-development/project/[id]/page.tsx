import type { Metadata } from "next";

import ProjectDetail from "@/components/home/research-and-development/project-detail";
import { getResearchProjectDetail, listResearchProjectSlugs } from "@/lib/rnd/projects.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 *
 * `GET /research-projects/slugs` is the one R&D read with no auth middleware at all,
 * because it serves build-time prerendering rather than a visitor. A FAILED READ
 * RETURNS `[]` RATHER THAN THROWING: the backend being unreachable must not fail the
 * build, and an empty list simply means these params render on demand instead.
 *
 * The param stays `id` while the value is the slug — the slug IS the public identity
 * across all three clients, and renaming the segment would break every existing link.
 */
export async function generateStaticParams() {
  const slugsResult = await listResearchProjectSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((id) => ({ id }));
}

/**
 * No session is forwarded here on purpose: metadata is shared by every visitor, so
 * titling the page from a viewer-scoped read would leak one caller's view into
 * another's. A draft therefore falls back to the generic title rather than 404ing the
 * whole route — the page body owns that decision.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detailResult = await getResearchProjectDetail(id);
  if (!detailResult.success) return { title: "Project · R&D" };
  return {
    title: `${detailResult.data.name} · R&D`,
    description: detailResult.data.tagline,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectDetail projectSlug={id} />;
}
