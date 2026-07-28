// TRANSPORT: props-only — presentational. Fetches nothing; clusters arrive as props
// from a parent that read GET /discovery/problem-clusters. Renders on either side of
// the boundary: as a server-rendered div, or as a button when a client parent passes
// onSelectCluster.
import { formatScorePoints } from "@/lib/rnd/format";
import { OPPORTUNITY_BAND_BADGE_CLASS, toOpportunityBand } from "@/lib/rnd/map-projection";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";

type ProblemClusterCardProps = {
  cluster: ProblemCluster;
  isSelected?: boolean;
  onSelectCluster?: (clusterId: string) => void;
};

/**
 * Civic Pulse cluster tile: title, location, category, reporter count and an
 * opportunity-score badge.
 *
 * "REPORTERS", NOT "REPORTS". `distinctReporterCount` is a COUNT(DISTINCT reporter), so
 * 342 means 342 people — and the gap between it and `submissionCount` is the sybil
 * signal that the whole opportunity score rests on. Labelling either number "reports"
 * collapses two different claims into one, and only one of them is evidence of demand.
 */
export default function ProblemClusterCard({
  cluster,
  isSelected = false,
  onSelectCluster,
}: ProblemClusterCardProps) {
  const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);

  const containerClassName = `w-full rounded-2xl border p-4 text-left transition-colors ${
    isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
  }`;

  const clusterContent = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{cluster.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {cluster.locationLabel ?? "Location not resolved yet"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${OPPORTUNITY_BAND_BADGE_CLASS[opportunityBand]}`}
        >
          {/* Never "Opportunity 0" for an unscored cluster — that reads as a verdict. */}
          {opportunityBand === "unscored"
            ? "Not scored yet"
            : `Opportunity ${formatScorePoints(cluster.opportunityScorePoints)}`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {cluster.category.displayLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {cluster.distinctReporterCount} reporter{cluster.distinctReporterCount === 1 ? "" : "s"}
          {cluster.submissionCount > cluster.distinctReporterCount &&
            ` · ${cluster.submissionCount} submissions`}
        </span>
      </div>
    </>
  );

  if (onSelectCluster) {
    return (
      <button
        type="button"
        onClick={() => onSelectCluster(cluster.id)}
        className={`cursor-pointer ${containerClassName}`}
      >
        {clusterContent}
      </button>
    );
  }

  return <div className={containerClassName}>{clusterContent}</div>;
}
