// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters/:clusterId
// via @/lib/rnd/discovery.api, with the session cookie forwarded by callerRequestOptions().
// The read is public. Fetches nothing else.
import Link from "next/link";
import { notFound } from "next/navigation";

import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import { getProblemCluster } from "@/lib/rnd/discovery.api";
import { formatIsoInstant, formatScorePoints } from "@/lib/rnd/format";
import { callerRequestOptions } from "@/lib/server-http";

const MICRODEGREES_PER_DEGREE = 1_000_000;

/** Publication-quantized microdegrees back to a readable pair. */
function formatCentroid(latitudeMicrodegrees: number, longitudeMicrodegrees: number): string {
  const latitude = (latitudeMicrodegrees / MICRODEGREES_PER_DEGREE).toFixed(3);
  const longitude = (longitudeMicrodegrees / MICRODEGREES_PER_DEGREE).toFixed(3);
  return `${latitude}, ${longitude}`;
}

/**
 * One Civic Pulse cluster.
 *
 * ADDRESSED BY ID, NOT SLUG. Clusters have no slug column anywhere in the backend — §11b
 * addresses them by id — so this route's segment is the id and every link into it (the
 * map canvas, a project's origin chip) carries the same value.
 *
 * A `404` becomes `notFound()` with no explanation. The backend answers 404 for "no such
 * cluster" and for a cluster the caller may not see, and the two are deliberately
 * indistinguishable; rendering a "this exists but you can't see it" hint would leak which
 * ids are real.
 *
 * ⚠️ SO DOES A `422`, AND THIS PAGE SHIPPED WITHOUT THAT ARM. `ClusterIdParamSchema` is
 * `z.uuid()`, so an id that is not a UUID is refused by SHAPE before the lookup runs —
 * measured, not assumed: `/discovery/problem-clusters/__none__` answers 422, not 404. The
 * only input this route validates is the path segment, so a 422 here means the URL is a
 * typo, and a typo is a 404 rather than "couldn't load".
 *
 * IT WAS REACHABLE, NOT THEORETICAL. `withSentinelValues` PRERENDERS `__none__` whenever the
 * cluster list read comes back empty or failing, so the sentinel page was served with an
 * error panel on it — the one outcome `@/lib/static-params` says it must not produce, since
 * its whole argument is that the sentinel "takes the same path a typo does". Found by
 * building the market-insight detail page, whose id param has the identical shape.
 *
 * THE PROJECTS BORN FROM THIS CLUSTER ARE NOT SHOWN. `problem_cluster_project_link` is
 * written by `/discovery/problem-clusters/:clusterId/project-links` and read by the
 * scoring jobs, but `ProblemClusterView` exposes no linked-project list, so there is
 * nothing to render. The inverse direction ships — a project's Overview tab names its
 * origin cluster — which is why this page links back rather than forward.
 *
 * `opportunityScorePoints` is NULL until the first scoring run, and null renders as an
 * absence. Zero would publish "no opportunity here" as a finding about the place when the
 * only finding is that no job has run yet.
 */
export default async function ClusterDetailPage({ clusterId }: { clusterId: string }) {
  const requestOptions = await callerRequestOptions();
  const clusterResult = await getProblemCluster(clusterId, requestOptions);

  if (!clusterResult.success) {
    if (clusterResult.error.code === "404" || clusterResult.error.code === "422") notFound();
    return (
      <div className="px-4 pt-4 lg:px-6 lg:pt-6">
        <RndErrorPanel message="Couldn't load this cluster." />
      </div>
    );
  }

  const cluster = clusterResult.data;

  return (
    <div className="space-y-6 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 lg:pb-6">
      <header className="space-y-2">
        <Link
          href="/research-and-development/problem-map"
          className="text-xs font-medium text-[#00696E]"
        >
          ← Problem Map
        </Link>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">{cluster.title}</h1>
        <p className="text-sm text-muted-foreground">
          {cluster.category.displayLabel}
          {cluster.region !== null && ` · ${cluster.region.displayLabel}`}
          {cluster.locationLabel !== null && ` · ${cluster.locationLabel}`}
        </p>
      </header>

      {/* A merged cluster still resolves, and saying where it went is the only honest
          way to render it — the reports did not disappear, they were deduplicated. */}
      {cluster.status === "merged" && cluster.mergedIntoClusterId !== null && (
        <div className="rounded-2xl border border-dashed border-[#CAC4D0] p-4 text-sm">
          This cluster was merged into another one.{" "}
          <Link
            href={`/research-and-development/problem-map/cluster/${cluster.mergedIntoClusterId}`}
            className="font-medium text-[#00696E]"
          >
            Open the cluster it merged into →
          </Link>
        </div>
      )}

      {cluster.description !== null && (
        <p className="max-w-prose text-sm leading-6">{cluster.description}</p>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* People, not submissions — "342 reports" and "342 people" are different
            claims and only the second is evidence of demand. */}
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">People who reported it</dt>
          <dd className="text-xl font-semibold">{cluster.distinctReporterCount}</dd>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Submissions in total</dt>
          <dd className="text-xl font-semibold">{cluster.submissionCount}</dd>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Opportunity score</dt>
          <dd className="text-xl font-semibold">
            {formatScorePoints(cluster.opportunityScorePoints)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {cluster.scoreComputedAt === null
              ? "No scoring run yet"
              : `As of ${formatIsoInstant(cluster.scoreComputedAt)}`}
          </dd>
        </div>
        <div className="rounded-2xl border border-[#CAC4D0]/60 p-4">
          <dt className="text-xs text-muted-foreground">Reported between</dt>
          <dd className="text-sm font-medium">
            {formatIsoInstant(cluster.firstReportedAt)} — {formatIsoInstant(cluster.lastReportedAt)}
          </dd>
        </div>
      </dl>

      <section className="space-y-1 text-xs text-muted-foreground">
        <p>
          Centroid{" "}
          {formatCentroid(
            cluster.centroidLatitudeMicrodegrees,
            cluster.centroidLongitudeMicrodegrees,
          )}
          {cluster.countryCode !== null && ` · ${cluster.countryCode}`}
        </p>
        <p>
          Location is server-geocoded from the submissions, never claimed by a reporter, and the
          centroid is quantized before publication so no single report can be located from it.
        </p>
      </section>
    </div>
  );
}
