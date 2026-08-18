// TRANSPORT: client-query — `GET /admin/metrics/users` via `useUserSegmentQuery`.
"use client";

import { useState } from "react";

import {
  MetricsSection,
  MetricsStateNotice,
  toMetricsViewState,
  type MetricsViewState,
} from "@/components/admin/metrics/metrics-section";
import { useUserSegmentQuery } from "@/hooks/admin/platform-metrics";
import {
  USER_SEGMENTS,
  type SegmentUserRow,
  type UserSegment,
} from "@/lib/admin/platform-metrics.schemas";
import { formatIsoDate } from "@/lib/rnd/format";
import { formatWatchTimeLabel } from "@/lib/feed/format";

// THE ONE READ ON THIS PAGE THAT NAMES PEOPLE — and the only one the backend records.
//
// The four aggregates above name nobody and are deliberately unaudited: stamping the platform
// audit chain on every dashboard refresh would bury the entries that matter under entries that
// describe nothing. This list answers "who watches the most" and "who has gone quiet" with accounts
// a human can go and act on, assembled from a behavioural record the subject cannot see being
// assembled — which is an exercise of authority even though it changes nothing.
//
// SO IT IS BEHIND A DELIBERATE CLICK. It does not fetch on mount, does not refetch on window focus,
// and never goes stale on its own; every entry in the audit log therefore corresponds to somebody
// choosing to look. The button says as much before it is pressed, because an admin should know they
// are signing for it.

/** `at_risk` MEANS THE CHURN DEFINITION AND NOTHING ELSE — active before the last 30 days, silent since. */
const SEGMENT_LABELS: Record<
  UserSegment,
  { readonly title: string; readonly description: string }
> = {
  top_watchers: {
    title: "Top watchers",
    description: "The accounts with the most recorded watch time in the window.",
  },
  at_risk: {
    title: "Gone quiet",
    description:
      "Accounts that were active before the last 30 days and have recorded nothing since. That is the platform's only definition of churn, and it lives in one place on the backend so this list and the cohort grid can never disagree about it.",
  },
};

const SEGMENT_ROW_LIMIT = 25;

export function UserSegmentList() {
  const [selectedSegment, setSelectedSegment] = useState<UserSegment>("top_watchers");
  // Per segment, so switching tabs does not silently pull the other list.
  const [requestedSegments, setRequestedSegments] = useState<readonly UserSegment[]>([]);

  const isRequested = requestedSegments.includes(selectedSegment);
  const segmentQuery = useUserSegmentQuery(selectedSegment, SEGMENT_ROW_LIMIT, isRequested);
  const view = toMetricsViewState(segmentQuery, (rows) => rows.length === 0);

  return (
    <MetricsSection
      title="Named accounts"
      description={SEGMENT_LABELS[selectedSegment].description}
      footnote="Opening either list is recorded in the platform audit log, with your account and role. The four charts above are not — they name nobody."
      headerControl={
        <fieldset className="flex gap-1">
          <legend className="sr-only">Segment</legend>
          {USER_SEGMENTS.map((segment) => (
            <button
              key={segment}
              type="button"
              onClick={() => setSelectedSegment(segment)}
              aria-pressed={segment === selectedSegment}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                segment === selectedSegment
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-[#CAC4D0]/60 hover:bg-muted"
              }`}
            >
              {SEGMENT_LABELS[segment].title}
            </button>
          ))}
        </fieldset>
      }
    >
      {isRequested ? (
        <SegmentBody view={view} />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This list names real accounts. Loading it writes an entry to the platform audit log
            against your account.
          </p>
          <button
            type="button"
            onClick={() => setRequestedSegments((current) => [...current, selectedSegment])}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
          >
            Show {SEGMENT_LABELS[selectedSegment].title.toLowerCase()}
          </button>
        </div>
      )}
    </MetricsSection>
  );
}

function SegmentBody({ view }: { readonly view: MetricsViewState<SegmentUserRow[]> }) {
  switch (view.status) {
    case "loading":
      return <MetricsStateNotice message="Loading…" />;
    case "error":
      return <MetricsStateNotice message={view.message} />;
    case "empty":
      return <MetricsStateNotice message="No account matches this segment." />;
    case "ready":
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1 pr-3 font-medium">
                  Account
                </th>
                <th scope="col" className="py-1 pr-3 font-medium">
                  Handle
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-medium">
                  Watched in window
                </th>
                <th scope="col" className="py-1 font-medium">
                  Last active
                </th>
              </tr>
            </thead>
            <tbody>
              {view.data.map((row) => (
                <tr key={row.userId} className="border-t border-[#CAC4D0]/40">
                  <td className="py-1.5 pr-3">{row.displayName}</td>
                  {/* A null handle is an account that never set one — never invented here. */}
                  <td className="py-1.5 pr-3 text-muted-foreground">
                    {row.handle === null ? "—" : `@${row.handle}`}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">
                    {formatWatchTimeLabel(row.watchedSecondsInWindow)}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {row.lastActiveDate === null
                      ? "Not recorded"
                      : formatIsoDate(row.lastActiveDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
