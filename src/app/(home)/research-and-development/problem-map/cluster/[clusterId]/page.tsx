import type { Metadata } from "next";

import ClusterDetailPage from "@/components/home/research-and-development/cluster-detail-page";
import { getProblemCluster, listProblemClusters } from "@/lib/rnd/discovery.api";
import { withSentinelValues } from "@/lib/static-params";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const PRERENDERED_CLUSTER_LIMIT = 50;

/**
 * Prerender the highest-opportunity clusters — a dynamic route needs this under
 * `cacheComponents`.
 *
 * There is no `GET /discovery/problem-cluster-ids` the way there is a
 * `GET /research-projects/slugs`, so the params come off the ranked list read with the
 * same bound the map uses. Anything outside that page renders on demand, which is the
 * correct outcome for a long tail nobody has linked to yet. A FAILED OR EMPTY READ YIELDS
 * THE SENTINEL PARAM rather than an empty list, which `cacheComponents` refuses
 * (`@/lib/static-params`).
 */
export async function generateStaticParams() {
  const clustersResult = await listProblemClusters({
    sort: "opportunity",
    limit: PRERENDERED_CLUSTER_LIMIT,
  });
  const clusterIds = clustersResult.success
    ? clustersResult.data.rows.map((cluster) => cluster.id)
    : [];
  return withSentinelValues(clusterIds).map((clusterId) => ({ clusterId }));
}

/**
 * No session is forwarded here on purpose: metadata is shared by every visitor, so
 * titling the page from a viewer-scoped read would leak one caller's view into another's.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ clusterId: string }>;
}): Promise<Metadata> {
  const { clusterId } = await params;
  const clusterResult = await getProblemCluster(clusterId);
  if (!clusterResult.success) return { title: "Problem cluster · R&D" };
  return {
    title: `${clusterResult.data.title} · Problem Map`,
    description: clusterResult.data.description ?? undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ clusterId: string }> }) {
  const { clusterId } = await params;
  return <ClusterDetailPage clusterId={clusterId} />;
}
