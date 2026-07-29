// TRANSPORT: client-query — "use client" island. Reads GET /discovery/problem-reports/mine
// and polls it while any submission is still queued.
"use client";

import Link from "next/link";

import { useMyProblemReportsQuery } from "@/hooks/rnd/discovery";
import { ApiRequestError, isUnauthorized } from "@/lib/http";
import type { ProblemSubmissionStatus } from "@/lib/rnd/discovery.schemas";
import { formatIsoInstant } from "@/lib/rnd/format";

/**
 * What each status actually means to the person who reported it.
 *
 * `geocode_failed` IS AN ENDING, NOT A WAITING STATE. A report whose location could not be
 * resolved never reaches a cluster, and leaving it reading "queued" forever would be the
 * cruellest possible rendering — someone waiting on a job that will not run again.
 */
const CLUSTERING_STATUS_MESSAGES: Record<ProblemSubmissionStatus, string> = {
  queued: "Queued — we are matching it to a cluster.",
  clustered: "Matched to a cluster.",
  geocode_failed: "We could not work out where this is, so it was not matched.",
  rejected: "Not accepted into the map.",
  failed: "Something went wrong matching it. Nothing you did caused this.",
};

/**
 * The reporter's own submissions — the other half of the `202`.
 *
 * **THE SUBMIT RECEIPT CANNOT ANSWER "WHAT HAPPENED TO MY REPORT".** It carries
 * `clusterId: null` by construction, because geocoding and clustering are jobs that run
 * afterwards. Without this panel a reporter files something and never hears about it
 * again, which is the shape of a form that quietly discards its input.
 *
 * IT POLLS ONLY WHILE SOMETHING IS QUEUED, and stops the moment nothing is — clustering
 * takes minutes rather than seconds, so a tight loop would be almost entirely wasted
 * requests.
 *
 * A REPORT IS NOT A PIN. Even `clustered` means it JOINED a cluster with other people's
 * submissions; `distinctReporterCount` counts people, so one person's report never becomes
 * a pin on its own. The link goes to the cluster, not to "your pin".
 */
export default function MyProblemReportsPanel() {
  const reportsQuery = useMyProblemReportsQuery();

  const isSignedOut =
    reportsQuery.error instanceof ApiRequestError && isUnauthorized(reportsQuery.error.apiError);

  if (isSignedOut || reportsQuery.isPending || reportsQuery.isError) return null;
  if (reportsQuery.data.rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Your reports</h2>
        <p className="text-xs text-muted-foreground">
          Only you can see this list. A report joins a cluster with other people&apos;s — it never
          becomes a pin on its own.
        </p>
      </div>

      <ul className="space-y-2">
        {reportsQuery.data.rows.map((report) => (
          <li
            key={report.submissionId}
            className="rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
          >
            <p className="font-medium">{report.title}</p>
            <p className="text-xs text-muted-foreground">
              {report.category.displayLabel} · {report.locationText} ·{" "}
              {formatIsoInstant(report.submittedAt)}
            </p>
            <p className="mt-1 text-xs">
              {CLUSTERING_STATUS_MESSAGES[report.clusteringStatus]}
              {report.geocodeFailureReason !== null && ` ${report.geocodeFailureReason}`}
            </p>
            {report.clusterId !== null && (
              <Link
                href={`/research-and-development/problem-map/cluster/${report.clusterId}`}
                className="text-xs font-medium text-[#00696E]"
              >
                Open the cluster it joined →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
