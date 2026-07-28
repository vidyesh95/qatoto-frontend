// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import Link from "next/link";
import { useState } from "react";

import DailyLogCard from "@/components/home/research-and-development/cards/daily-log-card";
import type {
  AiSummaryChipKind,
  ProjectAnnotatedDailyLog,
  TeamMember,
} from "@/types/research-and-development";

// Who is reading the page. A daily log is private to its project's members and
// the backend enforces that in SQL — the feed's WHERE clause is a subquery over
// the caller's own memberships, and a logged-out visitor gets nothing.
//
// There is no session in the mock phase, so the viewer is switchable. This is a
// mock-phase affordance and must NOT survive integration: once a session
// exists, the signed-out branch is what an unauthenticated request renders, not
// something a reader chooses.
type FeedViewer = "member" | "signed_out";

const FEED_VIEWER_LABELS: Record<FeedViewer, string> = {
  member: "Signed in · member of these projects",
  signed_out: "Signed out visitor",
};

const FEED_VIEWER_ORDER: FeedViewer[] = ["member", "signed_out"];

const AI_SUMMARY_CHIP_FILTER_LABELS: Record<AiSummaryChipKind | "all", string> = {
  all: "Any tag",
  progress: "Progress",
  velocity: "Velocity",
  blocker: "Blocker",
  suggestion: "Suggestion",
};

const AI_SUMMARY_CHIP_FILTER_ORDER: (AiSummaryChipKind | "all")[] = [
  "all",
  "progress",
  "velocity",
  "blocker",
  "suggestion",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

function chipClassName(isSelected: boolean): string {
  return `${FILTER_CHIP_CLASS} ${
    isSelected ? "bg-[#00696E] text-white" : "bg-muted text-foreground hover:bg-muted/70"
  }`;
}

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "Jul 24, 2026" → 20260724, a sortable integer. Parsed by pattern rather than
// by `new Date()` so a server render and a client render can never disagree.
// Returns 0 for an unparseable label, which sinks it to the bottom instead of
// silently reordering the feed. The wire format sends `logDate` as an ISO
// date-only string and this helper goes away with it.
function toSortableDayNumber(dateLabel: string): number {
  const dateParts = /^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/.exec(dateLabel);
  if (!dateParts) return 0;
  const [, monthAbbreviation, day, year] = dateParts;
  const monthIndex = MONTH_ABBREVIATIONS.indexOf(monthAbbreviation);
  if (monthIndex < 0) return 0;
  return Number(year) * 10_000 + (monthIndex + 1) * 100 + Number(day);
}

type GlobalDailyLogFeedProps = {
  logs: ProjectAnnotatedDailyLog[];
  // Keyed "<projectId>:<authorId>" — a member id is only unique inside its own
  // project, so a flat author map would eventually show the wrong face.
  authorsByProjectMemberKey: Record<string, TeamMember>;
  projectNamesById: Record<string, string>;
};

// Client island: every project's logs merged into one date-grouped feed, with a
// project filter and a chip-kind filter. Filtering is a plain in-memory pass
// over the mock array; the real feed filters and keyset-paginates in SQL,
// because merging every project client-side is exactly what CLAUDE.md forbids.
export default function GlobalDailyLogFeed({
  logs,
  authorsByProjectMemberKey,
  projectNamesById,
}: GlobalDailyLogFeedProps) {
  const [feedViewer, setFeedViewer] = useState<FeedViewer>("member");
  // "all" is the no-filter sentinel; any other value is a project id.
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedChipKind, setSelectedChipKind] = useState<AiSummaryChipKind | "all">("all");

  const filteredLogs = logs.filter((log) => {
    const matchesProject = selectedProjectId === "all" || log.projectId === selectedProjectId;
    const matchesChipKind =
      selectedChipKind === "all" ||
      log.aiSummaryChips.some((aiSummaryChip) => aiSummaryChip.kind === selectedChipKind);
    return matchesProject && matchesChipKind;
  });

  const orderedLogs = filteredLogs.toSorted(
    (firstLog, secondLog) =>
      toSortableDayNumber(secondLog.date) - toSortableDayNumber(firstLog.date),
  );

  const orderedDayLabels = [...new Set(orderedLogs.map((log) => log.date))];

  return (
    <section id="global-daily-log-feed" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Today across every build</h2>
        <p className="text-xs text-muted-foreground">
          Scoped to the projects you belong to — never a stranger&apos;s work record.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Viewing as</span>
          {FEED_VIEWER_ORDER.map((viewer) => (
            <button
              key={viewer}
              type="button"
              onClick={() => setFeedViewer(viewer)}
              className={chipClassName(feedViewer === viewer)}
            >
              {FEED_VIEWER_LABELS[viewer]}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          A mock-phase switch only. With a real session the feed is the caller&apos;s own
          memberships and nothing else.
        </p>
      </div>

      {feedViewer === "signed_out" ? (
        <div className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-6 text-center">
          <p className="text-sm font-medium">Daily logs are private to a project&apos;s team.</p>
          <p className="text-sm text-muted-foreground">
            Sign in to read the logs of projects you belong to. The explainer, the legend and the
            streak leaderboard above and below stay public — the logs themselves do not.
          </p>
          <Link
            href="/sign-in"
            className="inline-block cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedProjectId("all")}
                className={chipClassName(selectedProjectId === "all")}
              >
                All my projects
              </button>
              {Object.entries(projectNamesById).map(([projectId, projectName]) => (
                <button
                  key={projectId}
                  type="button"
                  onClick={() => setSelectedProjectId(projectId)}
                  className={chipClassName(selectedProjectId === projectId)}
                >
                  {projectName}
                </button>
              ))}
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {AI_SUMMARY_CHIP_FILTER_ORDER.map((chipKindFilter) => (
                <button
                  key={chipKindFilter}
                  type="button"
                  onClick={() => setSelectedChipKind(chipKindFilter)}
                  className={chipClassName(selectedChipKind === chipKindFilter)}
                >
                  {AI_SUMMARY_CHIP_FILTER_LABELS[chipKindFilter]}
                </button>
              ))}
            </div>
          </div>

          {orderedDayLabels.length > 0 ? (
            <div className="space-y-6">
              {orderedDayLabels.map((dayLabel) => (
                <div key={dayLabel} className="space-y-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground">
                    {dayLabel}
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {orderedLogs
                      .filter((log) => log.date === dayLabel)
                      .map((log) => (
                        <div key={`${log.projectId}-${log.id}`} className="space-y-2">
                          <Link
                            href={`/research-and-development/project/${log.projectId}`}
                            className="inline-block rounded-full bg-[#00696E]/10 px-2 py-0.5 text-xs font-medium text-[#00696E]"
                          >
                            {log.projectName}
                          </Link>
                          <DailyLogCard
                            log={log}
                            author={authorsByProjectMemberKey[`${log.projectId}:${log.authorId}`]}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No log matches those filters — try widening them.
            </p>
          )}
        </>
      )}
    </section>
  );
}
