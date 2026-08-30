import type { Metadata } from "next";

import MarketInsightDetailPage from "@/components/home/research-and-development/market-insight-detail-page";
import { getMarketInsight, listMarketInsights } from "@/lib/rnd/discovery.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const PRERENDERED_INSIGHT_LIMIT = 50;

/**
 * Prerender the most recently published insights — a dynamic route needs this under
 * `cacheComponents`.
 *
 * There is no `GET /discovery/market-insight-ids`, so the params come off the same list
 * read the knowledge hub uses. Anything outside that page renders on demand, which is the
 * right outcome for an archive nobody has linked to yet. A FAILED OR EMPTY READ YIELDS THE
 * SENTINEL PARAM rather than an empty list, which `cacheComponents` refuses
 * (`@/lib/static-params`).
 */
export async function generateStaticParams() {
  const insightsResult = await listMarketInsights({ limit: PRERENDERED_INSIGHT_LIMIT });
  const insightIds = insightsResult.success
    ? insightsResult.data.rows.map((insight) => insight.id)
    : [];
  return withSentinelValues(insightIds).map((insightId) => ({ insightId }));
}

/**
 * No session is forwarded here on purpose: metadata is shared by every visitor, so titling
 * the page from a viewer-scoped read would leak one caller's view into another's.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ insightId: string }>;
}): Promise<Metadata> {
  const { insightId } = await params;
  const insightResult = await getMarketInsight(insightId);
  if (!insightResult.success) return { title: "Market insight · R&D" };
  return {
    title: `${insightResult.data.headline} · Knowledge Hub`,
    description: insightResult.data.summary ?? undefined,
    alternates: { canonical: `/research-and-development/knowledge-hub/insight/${insightId}` },
  };
}

export default async function Page({ params }: { params: Promise<{ insightId: string }> }) {
  const { insightId } = await params;
  return <MarketInsightDetailPage insightId={insightId} />;
}
