// TRANSPORT: props-only — presentational server component. Fetches nothing; standings
// arrive as props from a parent that read GET /daily-logs/streak-leaderboard.
import Link from "next/link";

import { formatIsoDate, formatIsoInstant } from "@/lib/rnd/format";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { DailyLogStreakStanding } from "@/lib/rnd/daily-logs.schemas";

/**
 * The public counterpart to the private feed above: a streak count over an already
 * public project is project metadata, while a log is a member's work record. No person
 * is named here and no log content appears.
 *
 * ORDER AND SIZE COME FROM THE SERVER — it ranks by streak and caps at 20. The old
 * client-side `toSorted` is gone: re-ranking a server-capped list would put row 21 in
 * position 1 whenever the cap cut somebody off.
 *
 * "LOGS FILED" IS GONE TOO. It counted `project.dailyLogs.length` off the mock, and no
 * such total exists on the wire — the standing carries the streak, not a log count, and
 * counting the logs of projects the caller cannot read is exactly what the privacy
 * boundary forbids.
 *
 * `statsComputedAt` MUST be rendered. These counters are stored, not live: a streak
 * decays at midnight in the project's own time zone with no write happening, and the
 * nightly job notices hours later. A leaderboard implying live numbers would be lying.
 */
export default function LogStreakLeaderboard({
  standings,
}: {
  standings: DailyLogStreakStanding[];
}) {
  // Every row carries its own `statsComputedAt`; the oldest bounds the whole table.
  const computedAtInstants = standings
    .map((standing) => standing.statsComputedAt)
    .filter((computedAt): computedAt is string => computedAt !== null);
  const oldestComputedAt = computedAtInstants.length > 0 ? computedAtInstants.toSorted()[0] : null;

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Longest logging streaks</h2>
        {oldestComputedAt && (
          <p className="text-xs text-muted-foreground">
            As of {formatIsoInstant(oldestComputedAt)}
          </p>
        )}
      </div>
      {standings.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#CAC4D0]/60">
          <table className="w-full min-w-md text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  #
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Project
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Streak
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Last log
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, rankIndex) => (
                <tr key={standing.projectSlug} className="border-t border-[#CAC4D0]/40">
                  <td className="px-4 py-3 text-muted-foreground">{rankIndex + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/research-and-development/project/${standing.projectSlug}`}
                      className="font-medium hover:underline"
                    >
                      {standing.projectName}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      {PROJECT_STAGE_LABELS[standing.projectStage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[#00696E]">
                    {standing.dailyLogStreakDays} day
                    {standing.dailyLogStreakDays === 1 ? "" : "s"}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {/* Null is an absence, not "never" — the job may simply not have run. */}
                    {standing.lastDailyLogDate ? formatIsoDate(standing.lastDailyLogDate) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No project has a computed streak yet.</p>
      )}
      <p className="text-xs text-muted-foreground">
        A streak counts consecutive days with at least one filed log, in the project&apos;s own time
        zone. It is public; the logs behind it are not.
      </p>
    </section>
  );
}
