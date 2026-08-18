import type { Metadata } from "next";

import ProofOfEffortPage from "@/components/home/research-and-development/proof-of-effort-page";
import { getResearchProjectDetail, listResearchProjectSlugs } from "@/lib/rnd/projects.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Shared by both `generateMetadata` branches below — see the note there. */
const NOINDEX = { index: false, follow: false } as const;

/**
 * Prerender every published slug — a dynamic route needs this under `cacheComponents`.
 *
 * THIS USED TO PRERENDER SIX HARDCODED MOCK SLUGS, which meant a real project slug reaching
 * this route 404'd while six fictional ones resolved. It now uses the same
 * `GET /research-projects/slugs` read as the project detail route, so the two agree.
 *
 * A FAILED OR EMPTY READ YIELDS THE SENTINEL PARAM (`@/lib/static-params`): an
 * unreachable backend must not fail the build, and `cacheComponents` refuses an empty list.
 */
export async function generateStaticParams() {
  const slugsResult = await listResearchProjectSlugs();
  return withSentinelValues(slugsResult.success ? slugsResult.data : []).map((id) => ({ id }));
}

/**
 * No session is forwarded here on purpose: metadata is shared by every visitor, so titling
 * the page from a viewer-scoped read would leak one caller's view into another's.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detailResult = await getResearchProjectDetail(id);
  // NOINDEX ON BOTH BRANCHES: the claim ledger is member-scoped, so a crawler gets the sign-in
  // wall and Google files it as a soft 404. The title still resolves for anyone who is in.
  if (!detailResult.success) return { title: "Proof of Effort · R&D", robots: NOINDEX };
  return { title: `${detailResult.data.name} Proof of Effort · R&D`, robots: NOINDEX };
}

// `searchParams` carries the claim-status filter, forwarded to the backend as `?status=`
// so filtering happens in SQL. Reading it makes this route dynamic under
// `cacheComponents`; the sibling `loading.tsx` is the boundary.
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <ProofOfEffortPage projectSlug={id} searchParams={resolvedSearchParams} />;
}
