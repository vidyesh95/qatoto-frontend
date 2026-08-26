// TRANSPORT: client-query — `GET /users/me/creator-summary` and `GET /users/me/video-analytics`.
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import StatusPanel from "@/components/home/shared/status-panel";
import { useCreatorSummaryQuery, useVideoAnalyticsQuery } from "@/hooks/videos/creator-analytics";
import type { VideoAnalyticsRow } from "@/lib/videos/analytics.schemas";

/**
 * The creator's own numbers.
 *
 * THE PAGE SAYS WHOSE NUMBERS THESE ARE, ONCE, AT THE TOP. Most videos here are hosted on
 * YouTube, and YouTube counts its own views. These count watching that happened ON QATOTO. The
 * two will never agree and a creator who is not told will assume one is broken — so the sentence
 * is not a disclaimer to be trimmed, it is the thing that makes the rest of the page readable.
 *
 * EVERY ABSENCE IS RENDERED WITH ITS REASON, never as a dash or a zero. Three of the fields are
 * genuinely nullable and they are null for two DIFFERENT reasons — not measured yet on a new
 * video, no longer measurable on one older than the 90-day session retention. A dash collapses
 * those into one shrug; a zero states that nobody watched, which is a lie about the second case.
 *
 * NO CHART, AND NOT BECAUSE ONE WOULD BE HARD. There is no per-creator time series in the
 * database: every rollup is keyed by viewer or is platform-wide, and the per-video snapshots that
 * could back one are pruned at 14 days. A chart here would be drawn from numbers nothing computes.
 */
export default function AnalyticsPage() {
  const [page, setPage] = useState(1);
  const summaryQuery = useCreatorSummaryQuery();
  const videosQuery = useVideoAnalyticsQuery(page);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reach and engagement <strong>on Qatoto</strong>. A video hosted on YouTube counts its own
        views there; these count what happened here, so the two will not match.
      </p>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Subscribers"
          value={summaryQuery.data?.subscriberCount}
          isPending={summaryQuery.isPending}
        />
        <SummaryTile
          label="Published videos"
          value={summaryQuery.data?.publishedVideoCount}
          isPending={summaryQuery.isPending}
        />
        <SummaryTile
          label="Total views"
          value={summaryQuery.data?.totalViewCount}
          isPending={summaryQuery.isPending}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium tracking-wide text-foreground">Per video</h2>

        {videosQuery.isPending ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : videosQuery.error !== null ? (
          <div className="mt-2">
            <StatusPanel message="Couldn't load your analytics. Please try again." />
          </div>
        ) : videosQuery.data.rows.length === 0 ? (
          // AN EMPTY LIST IS NOT AN ERROR. A creator who has not uploaded yet has no numbers, and
          // saying so is a better answer than an empty table with headings.
          <p className="mt-2 text-sm text-muted-foreground">
            No videos yet. Numbers appear here once you publish one and somebody watches it.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-3">
              {videosQuery.data.rows.map((row) => (
                <VideoAnalyticsCard key={row.videoId} row={row} />
              ))}
            </ul>

            {videosQuery.data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((current) => current - 1);
                  }}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {videosQuery.data.pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= videosQuery.data.pagination.totalPages}
                  onClick={() => {
                    setPage((current) => current + 1);
                  }}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  isPending,
}: {
  readonly label: string;
  readonly value: number | undefined;
  readonly isPending: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">
        {isPending || value === undefined ? "—" : value.toLocaleString("en-US")}
      </p>
    </div>
  );
}

function VideoAnalyticsCard({ row }: { readonly row: VideoAnalyticsRow }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-border p-3">
      <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
        {row.thumbnailUrl !== null && (
          <Image src={row.thumbnailUrl} fill sizes="128px" alt="" className="object-cover" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/watch?v=${encodeURIComponent(row.videoId)}`}
          className="truncate text-sm font-medium text-foreground hover:underline"
        >
          {row.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.publishStatus === "published" ? "Published" : "Not published"}
        </p>

        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <Metric label="Views" value={row.viewCount.toLocaleString("en-US")} />
          <Metric label="Likes" value={row.likeCount.toLocaleString("en-US")} />
          <Metric label="Comments" value={row.commentCount.toLocaleString("en-US")} />
          <Metric label="Watch time" value={formatWatchedSeconds(row.totalWatchedSeconds)} />
          {/*
            THE THREE NULLABLE ONES. Each says WHY it is missing rather than showing a dash — and
            the reason differs by field, which is the whole point of not collapsing them.
          */}
          <Metric
            label="Unique viewers"
            value={row.uniqueViewerCount?.toLocaleString("en-US") ?? null}
            absence="Not computed yet"
          />
          <Metric
            label="First 48h views"
            value={row.countedViewsFirst48Hours?.toLocaleString("en-US") ?? null}
            absence="Not computed yet"
          />
          <Metric
            label="Avg. completion"
            value={
              row.meanCompletionBasisPoints === null
                ? null
                : `${(row.meanCompletionBasisPoints / 100).toFixed(1)}%`
            }
            absence="Nobody measured yet"
          />
        </dl>
      </div>
    </li>
  );
}

function Metric({
  label,
  value,
  absence,
}: {
  readonly label: string;
  readonly value: string | null;
  readonly absence?: string;
}) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={value === null ? "text-xs text-muted-foreground" : "text-sm text-foreground"}>
        {value ?? absence ?? "—"}
      </dd>
    </div>
  );
}

/** Seconds are the wire unit; hours and minutes are the reading unit. */
function formatWatchedSeconds(totalWatchedSeconds: number): string {
  const wholeHours = Math.floor(totalWatchedSeconds / 3600);
  const remainingMinutes = Math.floor((totalWatchedSeconds % 3600) / 60);
  if (wholeHours > 0) return `${String(wholeHours)}h ${String(remainingMinutes)}m`;
  return `${String(remainingMinutes)}m`;
}
