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
  // ⚠️ **NO EMPTY STATE HERE, DELIBERATELY** (`todo.md` §19.11). This used to render "No clusters
  // match these filters." while the page above rendered its own, differently worded, message for
  // the same condition — two components answering one question in two voices, and only one of them
  // could be right once the map gained a viewport and "no matches" stopped being the only way to
  // reach zero. `problem-map-canvas` now picks between three distinct emptinesses and renders the
  // chosen one in this component's place, so an empty list never reaches here.
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
