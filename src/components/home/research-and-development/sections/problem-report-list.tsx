// TRANSPORT: props-only — renders inside the ProblemMapCanvas client island. Fetches
// nothing; clusters arrive as props from the server page.
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
        <ProblemClusterCard
          key={cluster.id}
          cluster={cluster}
          isSelected={cluster.id === selectedClusterId}
          onSelectCluster={onSelectCluster}
        />
      ))}
    </div>
  );
}
