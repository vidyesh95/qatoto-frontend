// TRANSPORT: props-only — presentational server component. Fetches nothing; rows
// arrive as props from a parent that read GET /daily-logs.
import Link from "next/link";

import DailyLogCard from "@/components/home/research-and-development/cards/daily-log-card";
import { formatIsoDate } from "@/lib/rnd/format";
import type { DailyLogFeedRow } from "@/lib/rnd/daily-logs.schemas";

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
 */
export default function GlobalDailyLogFeed({ logs }: { logs: DailyLogFeedRow[] }) {
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
    </section>
  );
}
