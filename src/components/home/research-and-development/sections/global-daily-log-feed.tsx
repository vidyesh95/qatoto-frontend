"use client";

// TRANSPORT: client-query — seeded with the first page build-log-page already read on the
// server, then advances GET /daily-logs by its three-column cursor through `useKeysetList`.
import Link from "next/link";

import DailyLogCard from "@/components/home/research-and-development/cards/daily-log-card";
import LoadMoreControl from "@/components/home/shared/load-more-control";
import { rndKeys } from "@/hooks/rnd/keys";
import { useKeysetList } from "@/hooks/keyset-list";
import { listDailyLogFeed } from "@/lib/rnd/daily-logs.api";
import { formatIsoDate } from "@/lib/rnd/format";
import type { DailyLogFeedRow } from "@/lib/rnd/daily-logs.schemas";

/** Matches `DAILY_LOG_FEED_PAGE_LIMIT` on the server page, so pages stay a uniform size. */
const DAILY_LOG_FEED_PAGE_LIMIT = 30;

/**
 * Every project the caller belongs to, merged into one date-grouped feed.
 *
 * THE VIEWER SWITCHER IS GONE. It let a reader choose between "member" and "signed
 * out", which was a mock-phase affordance that must not survive a real session: who you
 * are is decided by the cookie, and the signed-out branch now belongs to the page,
 * which is the thing that knows the read came back `401`.
 *
 * BOTH FILTER ROWS ARE GONE, for two different reasons.
 *
 * The project chips were built from the `projectSlug` values on the fetched page, which
 * can only ever offer the projects already visible — the same fault that retired the
 * supplier directory's region chips in phase 1. `?projectSlug=` is a real server filter
 * and the chips return when the page reads the caller's memberships as a list.
 *
 * The chip-kind row filtered on `aiSummaryChips`, which the feed row does not carry —
 * chips live on `GET …/daily-logs/:logId` alone. `?chipKind=` is a real server filter
 * too, but a matched log would render with nothing on it explaining the match, so the
 * result set would be correct and unreadable at once.
 *
 * NO CLIENT-SIDE SORT. The backend orders by `(logDate DESC, submittedAt DESC, id
 * DESC)` and keyset-paginates on exactly that tuple; re-sorting a page here would
 * shuffle rows out of the order the cursor assumes. Grouping by `logDate` is a display
 * grouping over an already-ordered page, not a reordering.
 *
 * THE CURSOR IS NOW USED. The page had been computing `nextCursor` and dropping it, which
 * capped a merged feed over every project the caller belongs to at one page — the exact
 * unbounded read the keyset cursor exists to make pageable. Appended pages keep server
 * order, so the date grouping above continues to hold across a page boundary: a date split
 * across two pages lands in one group because the first appearance still takes its place.
 */
export default function GlobalDailyLogFeed({
  initialLogs,
  initialNextCursor,
}: {
  initialLogs: DailyLogFeedRow[];
  initialNextCursor: string | null;
}) {
  const feed = useKeysetList<DailyLogFeedRow>({
    queryKey: rndKeys.dailyLogFeed(),
    initialPage: { rows: initialLogs, nextToken: initialNextCursor },
    fetchPage: (token) =>
      listDailyLogFeed({
        limit: DAILY_LOG_FEED_PAGE_LIMIT,
        ...(typeof token === "string" ? { cursor: token } : {}),
        // This read names its array `logs` and puts the cursor INSIDE `data`, unlike the
        // sibling-cursor reads on Proof of Effort — hence the mapping here rather than
        // `toCursorKeysetPage`.
      }).then((result) =>
        result.success
          ? {
              success: true as const,
              data: { rows: result.data.logs, nextToken: result.data.nextCursor },
            }
          : result,
      ),
  });

  const logs = feed.rows;
  // Preserves server order: the first time a date appears, it takes its place.
  const orderedLogDates = [...new Set(logs.map((log) => log.logDate))];

  return (
    <section id="global-daily-log-feed" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Today across every build</h2>
        <p className="text-xs text-muted-foreground">
          Scoped to the projects you belong to — never a stranger&apos;s work record.
        </p>
      </div>
      <div className="space-y-6">
        {orderedLogDates.map((logDate) => (
          <div key={logDate} className="space-y-3">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
              {formatIsoDate(logDate)}
            </h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {logs
                .filter((log) => log.logDate === logDate)
                .map((log) => (
                  <div key={log.id} className="space-y-2">
                    {/* The row carries its own project, so this chip is never fabricated. */}
                    <Link
                      href={`/research-and-development/project/${log.projectSlug}`}
                      className="inline-block rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs font-medium text-[#00696E]"
                    >
                      {log.projectName}
                    </Link>
                    <DailyLogCard log={log} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
      <LoadMoreControl
        hasNextPage={feed.hasNextPage}
        isFetchingNextPage={feed.isFetchingNextPage}
        errorMessage={feed.loadMoreErrorMessage}
        onLoadNextPage={feed.loadNextPage}
        label="Load earlier logs"
      />
    </section>
  );
}
