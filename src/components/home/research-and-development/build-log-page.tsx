import Link from "next/link";

import BuildLogHero from "@/components/home/research-and-development/sections/build-log-hero";
import GlobalDailyLogFeed from "@/components/home/research-and-development/sections/global-daily-log-feed";
import LogLegend from "@/components/home/research-and-development/sections/log-legend";
import LogStreakLeaderboard from "@/components/home/research-and-development/sections/log-streak-leaderboard";
import { MOCK_RESEARCH_PROJECTS } from "@/mocks/research-and-development-mocks";
import type { ProjectAnnotatedDailyLog, TeamMember } from "@/types/research-and-development";

// Stage 04 — Build & Daily Logs (R_AND_D_STRUCTURE.md §4c.2). The Daily Update
// Protocol across every project at once; the per-project Daily Logs tab still
// answers "where is this one project", and neither is deleted.
//
// A DailyLog carries no project of its own, so the project is attached here
// while flatMapping — never fabricated inside a card. Server component; only
// the feed is a client island.
export default function BuildLogPage() {
  const projectAnnotatedLogs: ProjectAnnotatedDailyLog[] = MOCK_RESEARCH_PROJECTS.flatMap(
    (project) =>
      project.dailyLogs.map((dailyLog) => ({
        ...dailyLog,
        projectId: project.id,
        projectName: project.name,
        projectStage: project.stage,
      })),
  );

  // Keyed "<projectId>:<memberId>" — a member id is unique inside its project.
  const authorsByProjectMemberKey: Record<string, TeamMember> = Object.fromEntries(
    MOCK_RESEARCH_PROJECTS.flatMap((project) =>
      project.teamMembers.map((teamMember) => [`${project.id}:${teamMember.id}`, teamMember]),
    ),
  );

  const projectNamesById: Record<string, string> = Object.fromEntries(
    MOCK_RESEARCH_PROJECTS.map((project) => [project.id, project.name]),
  );

  return (
    <div className="space-y-8 pt-4 pb-4 lg:pt-6 lg:pb-6">
      <BuildLogHero />
      <LogLegend />
      <GlobalDailyLogFeed
        logs={projectAnnotatedLogs}
        authorsByProjectMemberKey={authorsByProjectMemberKey}
        projectNamesById={projectNamesById}
      />
      <LogStreakLeaderboard projects={MOCK_RESEARCH_PROJECTS} />
      <section className="mx-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
        <h2 className="text-xl font-semibold md:text-2xl">See how a log becomes a slice</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Every verified minute mints slices at a locked rate, and the slices decide the cap table.
          The whole ledger is open on each project.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/research-and-development/project/solar-cold-storage/proof-of-effort"
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Open a Proof of Effort ledger
          </Link>
        </div>
      </section>
    </div>
  );
}
