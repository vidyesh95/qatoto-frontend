// TRANSPORT: server-fetch — server component. Reads GET /discovery/problem-clusters/:clusterId
// via @/lib/rnd/discovery.api, with the session cookie forwarded by callerRequestOptions().
// The read is public. Fetches nothing else.
import Link from "next/link";
import { notFound } from "next/navigation";

import { RndErrorPanel } from "@/components/home/research-and-development/sections/rnd-status-panel";
import HairlineDefinitionRow, {
  type HairlineDefinitionFact,
} from "@/components/home/shared/hairline-definition-row";
import { getProblemCluster } from "@/lib/rnd/discovery.api";
import { formatIsoInstant } from "@/lib/rnd/format";
import { callerRequestOptions } from "@/lib/server-http";

const MICRODEGREES_PER_DEGREE = 1_000_000;

/** Publication-quantized microdegrees back to a readable pair. */
function formatCentroid(latitudeMicrodegrees: number, longitudeMicrodegrees: number): string {
  const latitude = (latitudeMicrodegrees / MICRODEGREES_PER_DEGREE).toFixed(3);
  const longitude = (longitudeMicrodegrees / MICRODEGREES_PER_DEGREE).toFixed(3);
  return `${latitude}, ${longitude}`;
}

/**
 * The facts the row renders, in reading order.
 *
 * ⚠️ **`Score computed` RETURNS `null` BEFORE THE FIRST SCORING RUN, AND THAT CELL THEN
 * DISAPPEARS.** It used to be a second `<dd>` under the score reading "No scoring run yet", which
 * is a placeholder where §5 asks for nothing at all. Dropping it is also what lets the score cell
 * stop carrying two `<dd>`s for one `<dt>`.
 *
 * ⚠️ **THE UNSCORED SCORE STILL SHOWS A WORD, AND THAT IS A DELIBERATE DEPARTURE FROM THAT SAME
 * RULE.** A detail page is where a reader came FOR that number; silence there reads as a rendering
 * fault rather than as an absence. The glance surfaces can afford to say nothing, and this cannot.
 *
 * ⚠️ **THE COPY IS "Not scored yet", MATCHING THE CARD AND THE PREVIEW.** This page used to say
 * "Not computed yet" via `formatScorePoints`, so one null had two spellings on one surface. The
 * shared helper is left alone because its other callers are other domains; the wording is settled
 * here, where the divergence was.
 */
function buildClusterFacts(cluster: {
  readonly distinctReporterCount: number;
  readonly submissionCount: number;
  readonly opportunityScorePoints: number | null;
  readonly scoreComputedAt: string | null;
  readonly firstReportedAt: string;
  readonly lastReportedAt: string;
}): readonly HairlineDefinitionFact[] {
  return [
    // People, not submissions — "342 reports" and "342 people" are different claims and only the
    // second is evidence of demand.
    { label: "People who reported it", value: String(cluster.distinctReporterCount) },
    { label: "Submissions in total", value: String(cluster.submissionCount) },
    {
      label: "Opportunity score",
      value:
        cluster.opportunityScorePoints === null
          ? "Not scored yet"
          : String(cluster.opportunityScorePoints),
    },
    {
      label: "Score computed",
      value: cluster.scoreComputedAt === null ? null : formatIsoInstant(cluster.scoreComputedAt),
    },
    {
      label: "Reported between",
      value: `${formatIsoInstant(cluster.firstReportedAt)} — ${formatIsoInstant(cluster.lastReportedAt)}`,
    },
  ];
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
          className="text-xs font-medium text-primary-imprint"
        >
          ← Problem Map
        </Link>
        <h1 className="text-2xl font-semibold md:text-3xl">{cluster.title}</h1>
        <p className="text-sm text-muted-foreground">
          {cluster.category.displayLabel}
          {cluster.region !== null && ` · ${cluster.region.displayLabel}`}
          {cluster.locationLabel !== null && ` · ${cluster.locationLabel}`}
        </p>
      </header>

      {/* A merged cluster still resolves, and saying where it went is the only honest
          way to render it — the reports did not disappear, they were deduplicated. */}
      {cluster.status === "merged" && cluster.mergedIntoClusterId !== null && (
        <div className="rounded-2xl border border-dashed border-outline-variant p-4 text-sm">
          This cluster was merged into another one.{" "}
          <Link
            href={`/research-and-development/problem-map/cluster/${cluster.mergedIntoClusterId}`}
            className="font-medium text-primary-imprint"
          >
            Open the cluster it merged into →
          </Link>
        </div>
      )}

      {cluster.description !== null && (
        <p className="max-w-prose text-sm leading-6">{cluster.description}</p>
      )}

      {/* ⚠️ **ONE HAIRLINE ROW, NOT FOUR BOXES** (`todo.md` §19.11). This was a
          `sm:grid-cols-2 xl:grid-cols-4` of bordered `rounded-2xl` cards with the figures at
          `text-xl font-semibold`, which broke three rules at once: §6's ban on repeating an
          identical card grid, §6's ban on the hero metric (a big number over a small label), and
          §3's Two-Size Rule, since `text-xl` is a third type size in a product written at 14 and
          12px.

          ⚠️ **AND THEY WERE NEVER FOUR PEERS.** Three of the cells are counts; the fourth is two
          formatted timestamps joined by an em dash, about fifty characters. Giving them identical
          boxes claimed a symmetry the content does not have. */}
      <HairlineDefinitionRow facts={buildClusterFacts(cluster)} />

      <section className="space-y-1 text-xs text-muted-foreground">
        <p>
          {/* Mono here and NOT on the counts above. `docs/Design.md` §3 reserves Code type for
              "anything that must be copied exactly" — a coordinate is; a reporter count is a figure
              to compare. `place-picker.tsx` already renders a coordinate this way. */}
          Centroid{" "}
          <code className="font-mono">
            {formatCentroid(
              cluster.centroidLatitudeMicrodegrees,
              cluster.centroidLongitudeMicrodegrees,
            )}
          </code>
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
