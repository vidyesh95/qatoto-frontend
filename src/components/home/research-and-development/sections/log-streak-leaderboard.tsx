// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

import type { ResearchProject } from "@/types/research-and-development";

// The instant the streak counters were last computed. A streak decays at
// midnight in the project's own time zone with NO write — the nightly job
// notices hours later — so a leaderboard implying live numbers would be lying.
// Server-supplied once integrated (`statsComputedAt` on every row).
const STREAK_STATS_COMPUTED_LABEL = "Jul 26, 2026 · 04:00 UTC";

// Public counterpart to the private feed above: a streak count over an already
// public project is project metadata, while a log is a member's work record.
// No person is named here and no log content appears.
export default function LogStreakLeaderboard({ projects }: { projects: ResearchProject[] }) {
  const rankedProjects = projects.toSorted(
    (firstProject, secondProject) =>
      secondProject.dailyLogStreakDays - firstProject.dailyLogStreakDays,
  );

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Longest logging streaks</h2>
        <p className="text-xs text-muted-foreground">As of {STREAK_STATS_COMPUTED_LABEL}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#CAC4D0]/60">
        <table className="w-full text-left text-sm">
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
                Logs filed
              </th>
            </tr>
          </thead>
          <tbody>
            {rankedProjects.map((project, rankIndex) => (
              <tr key={project.id} className="border-t border-[#CAC4D0]/40">
                <td className="px-4 py-3 text-muted-foreground">{rankIndex + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/research-and-development/project/${project.id}`}
                    className="font-medium hover:underline"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-medium text-[#00696E]">
                  {project.dailyLogStreakDays} day{project.dailyLogStreakDays === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {project.dailyLogs.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        A streak counts consecutive days with at least one filed log, in the project&apos;s own time
        zone. It is public; the logs behind it are not.
      </p>
    </section>
  );
}
