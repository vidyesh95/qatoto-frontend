// TRANSPORT: client-query — reads `GET /users/me/video-reports`.
"use client";

// THE REPORTER'S SIDE OF MODERATION, and the first surface on this platform to have one.
// Commerce, community and R&D all let someone file a report and then tell them nothing; this
// page exists because a report that vanishes is indistinguishable from one nobody read.
//
// WHAT IT DELIBERATELY DOES NOT SHOW — and the backend does not send: who decided, what note
// they left, and how many other people reported the same video. Naming the moderator makes a
// takedown personal; showing the count makes brigading measurable. A reporter learns the
// outcome of their own report and nothing about anyone else's.
//
// "ACTIONED" IS NOT SPELLED "REMOVED" HERE EITHER. The verdict a moderator reaches is about
// the report, and the copy says what was decided rather than what a viewer might infer.

import Link from "next/link";

import StatusPanel from "@/components/home/shared/status-panel";
import { useMyVideoReportsQuery } from "@/hooks/videos/content-reports";
import { describeEngagementError } from "@/hooks/feed/mutations";
import {
  VIDEO_REPORT_REASON_LABELS,
  type MyVideoReport,
  type VideoReportStatus,
} from "@/lib/videos/content-reports.api";

/** What each status means TO THE PERSON WHO FILED IT, which is not what it means to staff. */
const STATUS_LABELS: Readonly<Record<VideoReportStatus, string>> = {
  open: "Waiting for review",
  actioned: "Action taken",
  dismissed: "No action taken",
};

const STATUS_CLASSES: Readonly<Record<VideoReportStatus, string>> = {
  open: "bg-muted text-muted-foreground",
  actioned: "bg-foreground text-background",
  dismissed: "bg-muted text-muted-foreground",
};

export default function ReportHistoryPage() {
  const myReportsQuery = useMyVideoReportsQuery();

  return (
    <div className="pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">
          Report history
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Videos you reported, and what came of them.
        </p>
      </header>

      <section aria-label="Your reports" className="mt-3 px-4 lg:px-6">
        {renderReports()}
      </section>
    </div>
  );

  function renderReports() {
    if (myReportsQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading your reports…</p>;
    }

    if (myReportsQuery.isError) {
      // Signed out is the common case and is a real answer, not a failure — the refusal
      // carries the backend's own message rather than a generic apology.
      return <StatusPanel message={describeEngagementError(myReportsQuery.error).message} />;
    }

    if (myReportsQuery.data.length === 0) {
      return (
        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Nothing reported yet</p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            You can report a video from the menu on any video card. Reporting doesn&rsquo;t remove a
            video on its own — a moderator reviews every report.
          </p>
        </div>
      );
    }

    return (
      <ul className="space-y-2">
        {myReportsQuery.data.map((report) => (
          <li key={report.id} className="rounded-xl border border-border px-4 py-3">
            {renderReportRow(report)}
          </li>
        ))}
      </ul>
    );
  }
}

function renderReportRow(report: MyVideoReport) {
  return (
    <>
      <div className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/*
            The title, not the id. It links to the video — which may now be hidden, in which
            case the watch page 404s. That is the honest outcome: the reporter is told action
            was taken, and the video being gone is what that means.
          */}
          <Link
            href={`/watch?v=${encodeURIComponent(report.videoId)}`}
            className="line-clamp-2 text-sm text-foreground hover:underline"
          >
            {report.videoTitle ?? "Untitled video"}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {VIDEO_REPORT_REASON_LABELS[report.reason]}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[report.status]}`}
        >
          {STATUS_LABELS[report.status]}
        </span>
      </div>

      {report.detailText !== null && (
        <p className="mt-2 border-l-2 border-border pl-2 text-xs text-muted-foreground">
          {report.detailText}
        </p>
      )}
    </>
  );
}
