import type { Metadata } from "next";

import WorkshopPage from "@/components/home/research-and-development/workshop-page";
import { getResearchProjectDetail, listResearchProjectSlugs } from "@/lib/rnd/projects.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Shared by both `generateMetadata` branches below — see the note there. */
const NOINDEX = { index: false, follow: false } as const;

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 * A failed read returns `[]` so an unreachable backend does not fail the build; those
 * params then render on demand.
 */
export async function generateStaticParams() {
  const slugsResult = await listResearchProjectSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((id) => ({ id }));
}

/** No session forwarded — metadata is shared by every visitor, including strangers. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detailResult = await getResearchProjectDetail(id);
  // NOINDEX ON BOTH BRANCHES: the workshop is member-scoped, so a crawler gets the sign-in
  // wall and Google files it as a soft 404. The title still resolves for anyone who is in.
  if (!detailResult.success) return { title: "Workshop · R&D", robots: NOINDEX };
  return { title: `${detailResult.data.name} Workshop · R&D`, robots: NOINDEX };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkshopPage projectSlug={id} />;
}
