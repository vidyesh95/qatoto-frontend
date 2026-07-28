// TRANSPORT: props-only — presentational server component. Fetches nothing; clusters
// arrive as props from the landing page, which read GET /discovery/problem-clusters.
import Image from "next/image";
import Link from "next/link";

import { formatScorePoints } from "@/lib/rnd/format";
import type { ProblemCluster } from "@/lib/rnd/discovery.schemas";
import {
  OPPORTUNITY_BAND_BADGE_CLASS,
  OPPORTUNITY_BAND_PIN_SIZE_CLASS,
  projectMicrodegreesToMapPercent,
  toOpportunityBand,
} from "@/lib/rnd/map-projection";

/**
 * Landing teaser for the Civic Pulse problem map: a static world-map thumbnail with
 * pins on the left, the top-scoring clusters on the right, and a CTA into the full
 * map. Pins are positioned by projecting the cluster centroid's microdegrees, and
 * sized by opportunity band.
 */
export default function ProblemMapPreview({ clusters }: { clusters: ProblemCluster[] }) {
  return (
    <section className="grid grid-cols-1 items-center gap-6 px-4 md:grid-cols-2 lg:px-6">
      <div className="relative rounded-2xl bg-[#00696E]/5 p-4">
        <Image
          src="/dummy/world_map.svg"
          width={2000}
          height={857}
          alt=""
          priority
          className="h-auto w-full"
        />
        {clusters.map((cluster) => {
          const pinPosition = projectMicrodegreesToMapPercent({
            latitudeMicrodegrees: cluster.centroidLatitudeMicrodegrees,
            longitudeMicrodegrees: cluster.centroidLongitudeMicrodegrees,
          });

          return (
            <span
              key={cluster.id}
              aria-hidden
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#00696E] ${
                OPPORTUNITY_BAND_PIN_SIZE_CLASS[toOpportunityBand(cluster.opportunityScorePoints)]
              }`}
              style={{ left: `${pinPosition.leftPercent}%`, top: `${pinPosition.topPercent}%` }}
            />
          );
        })}
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Top reported gaps</h2>
        <ul className="space-y-4">
          {clusters.map((cluster) => {
            const opportunityBand = toOpportunityBand(cluster.opportunityScorePoints);

            return (
              <li key={cluster.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{cluster.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {cluster.locationLabel ?? "Location not resolved yet"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {cluster.category.displayLabel}
                    </span>
                    {/* Distinct people, not submissions — see ProblemClusterCard. */}
                    <span className="text-xs text-muted-foreground">
                      {cluster.distinctReporterCount} reporter
                      {cluster.distinctReporterCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${OPPORTUNITY_BAND_BADGE_CLASS[opportunityBand]}`}
                >
                  {opportunityBand === "unscored"
                    ? "Not scored yet"
                    : `Opportunity ${formatScorePoints(cluster.opportunityScorePoints)}`}
                </span>
              </li>
            );
          })}
        </ul>
        <Link
          href="/research-and-development/problem-map"
          className="inline-block cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Open problem map
        </Link>
      </div>
    </section>
  );
}
