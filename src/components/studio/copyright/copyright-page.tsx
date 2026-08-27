// TRANSPORT: client-query — `GET /users/me/video-moderation` and `GET /users/me/video-reports`.
"use client";

import StatusPanel from "@/components/home/shared/status-panel";
import {
  useMyVideoModerationNoticesQuery,
  useMyVideoReportsQuery,
} from "@/hooks/videos/content-reports";
import {
  VIDEO_MODERATION_ACTION_LABELS,
  VIDEO_REPORT_REASON_LABELS,
  type MyVideoReport,
  type VideoModerationNotice,
} from "@/lib/videos/content-reports.api";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * Claims against your work, and yours against others.
 *
 * ⚠️ IT SHIPPED BECAUSE THE CREATOR WAS BEING LIED TO. `video.moderationVisibilityState` reached no
 * read a creator could see and `deriveStudioVideoStatus` had no branch for it — so a video a
 * moderator had HIDDEN still showed its own owner the badge `published`. Not merely silent:
 * positively wrong, on the one screen the person who could appeal would look at. The badge now
 * reads `hidden-by-moderator`, and this page is where they learn what happened and when.
 *
 * ## Three things this page deliberately does not show
 *
 * **Who reported them.** Not a name, not a count. The moderator queue itself hides reporter
 * identity — "a moderator who can see who reported whom is a moderator who can be lobbied" — and a
 * creator who can see it is a creator who can retaliate. On a platform this size a count alone
 * would often be an identity.
 *
 * **Reports that are still open.** Only decided actions appear. This is also how YouTube handles
 * community flags: you hear about it when something is acted on, not when somebody clicks report.
 * Surfacing a live report tips somebody off mid-review.
 *
 * **The moderator's note.** It is staff-facing free text inside a hash-chained audit record. The
 * report's CATEGORY is shown instead — which is what a YouTube strike notice actually tells you.
 *
 * ## Why dismissals are here too
 *
 * `report_dismissed` is rendered alongside removals. A creator told when their video is taken down
 * should also be told when a claim against it was thrown out; listing only the punishments would
 * make this a record of accusations rather than of outcomes.
 */
export default function StudioCopyrightPage() {
  const noticesQuery = useMyVideoModerationNoticesQuery();
  const reportsQuery = useMyVideoReportsQuery();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Copyright and claims</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What has been decided about your videos, and the reports you have filed about other
        people&apos;s. Qatoto never shows you who reported a video.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Decisions about your videos</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only decisions appear here. A report that is still being reviewed is not shown.
        </p>
        {renderNotices()}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Reports you filed</h2>
        {renderMyReports()}
      </section>
    </div>
  );

  function renderNotices() {
    if (noticesQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (noticesQuery.error !== null) {
      return (
        <div className="mt-3">
          <StatusPanel message="Couldn't load your moderation history. Please try again." />
        </div>
      );
    }
    if (noticesQuery.data.length === 0) {
      // NOT AN ERROR, AND WORTH SAYING WARMLY. For almost every creator this list is empty forever,
      // and an empty table with headings reads as a load failure.
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing has been actioned on your videos.
        </p>
      );
    }
    return (
      <ul className="mt-3 space-y-2">
        {noticesQuery.data.map((notice) => (
          <li key={`${notice.videoId}:${notice.decidedAt}`}>
            <NoticeRow notice={notice} />
          </li>
        ))}
      </ul>
    );
  }

  function renderMyReports() {
    if (reportsQuery.isPending) {
      return <p className="mt-3 text-sm text-muted-foreground">Loading…</p>;
    }
    if (reportsQuery.error !== null) {
      return (
        <div className="mt-3">
          <StatusPanel message="Couldn't load your reports. Please try again." />
        </div>
      );
    }
    if (reportsQuery.data.length === 0) {
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          You have not reported anyone&apos;s video.
        </p>
      );
    }
    return (
      <ul className="mt-3 space-y-2">
        {reportsQuery.data.map((report) => (
          <li key={report.id}>
            <MyReportRow report={report} />
          </li>
        ))}
      </ul>
    );
  }
}

function NoticeRow({ notice }: { readonly notice: VideoModerationNotice }) {
  const wasRemoved = notice.actionKind === "content_hidden";

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        wasRemoved ? "border-destructive/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{notice.videoTitle}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatIsoInstantLabel(notice.decidedAt)}
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground">
        {VIDEO_MODERATION_ACTION_LABELS[notice.actionKind]}
        {/* `reason` is null for a staff-initiated action with no report behind it. Rendering the
            absence rather than a guess — "under Copyright" would be inventing a category. */}
        {notice.reason !== null && ` · ${VIDEO_REPORT_REASON_LABELS[notice.reason]}`}
      </p>
      {wasRemoved && (
        <p className="mt-1 text-xs text-muted-foreground">
          This video is hidden from everyone on Qatoto. It still shows in your Studio so you can see
          what happened.
        </p>
      )}
    </div>
  );
}

function MyReportRow({ report }: { readonly report: MyVideoReport }) {
  return (
    <div className="rounded-xl border border-border px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-foreground">{report.videoTitle ?? "A video"}</p>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatIsoInstantLabel(report.createdAt)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {VIDEO_REPORT_REASON_LABELS[report.reason]} · {report.status}
      </p>
    </div>
  );
}
