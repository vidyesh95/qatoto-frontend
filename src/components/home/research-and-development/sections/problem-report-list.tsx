// TRANSPORT: props-only — renders inside the ProblemMapCanvas client island. Fetches
// nothing; clusters arrive as props from the server page.
import Link from "next/link";

import ProblemClusterCard from "@/components/home/research-and-development/cards/problem-report-card";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";

type ProblemClusterListProps = {
  clusters: ProblemCluster[];
  selectedClusterId: string | null;
  onSelectCluster: (clusterId: string) => void;
};

// Stacked Civic Pulse cluster cards beside the map canvas — also the mobile-first
// view. No "use client" directive: it receives function props, so it only ever renders
// inside the ProblemMapCanvas client island.
export default function ProblemClusterList({
  clusters,
  selectedClusterId,
  onSelectCluster,
}: ProblemClusterListProps) {
  if (clusters.length === 0) {
    return <p className="text-sm text-muted-foreground">No clusters match these filters.</p>;
  }

  return (
    <div className="space-y-3">
      {clusters.map((cluster) => (
        <div key={cluster.id} className="space-y-1">
          <ProblemClusterCard
            cluster={cluster}
            isSelected={cluster.id === selectedClusterId}
            onSelectCluster={onSelectCluster}
          />
          {/* The link sits OUTSIDE the card because the card is a <button> here — an
              anchor nested in a button is invalid HTML and the click targets fight. It
              only appears for the selected cluster, so the list stays a list. */}
          {cluster.id === selectedClusterId && (
            <Link
              href={`/research-and-development/problem-map/cluster/${cluster.id}`}
              className="inline-block px-4 text-xs font-medium text-[#00696E]"
            >
              Open this cluster →
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
