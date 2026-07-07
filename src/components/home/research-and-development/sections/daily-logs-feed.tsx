"use client";

import { useState } from "react";

import DailyLogCard from "@/components/home/research-and-development/cards/daily-log-card";
import type { DailyLog, TeamMember } from "@/types/research-and-development";

type DailyLogsFeedProps = {
  logs: DailyLog[];
  teamMembers: TeamMember[];
};

function buildFilterChipClassName(isSelected: boolean): string {
  return `shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
    isSelected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
  }`;
}

// Client island for the Daily Logs tab: a single-select member filter over the
// static mock log feed — filtering is a display convenience only.
export default function DailyLogsFeed({ logs, teamMembers }: DailyLogsFeedProps) {
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const visibleLogs = selectedAuthorId
    ? logs.filter((log) => log.authorId === selectedAuthorId)
    : logs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedAuthorId(null)}
          className={buildFilterChipClassName(selectedAuthorId === null)}
        >
          All
        </button>
        {teamMembers.map((teamMember) => (
          <button
            key={teamMember.id}
            type="button"
            onClick={() => setSelectedAuthorId(teamMember.id)}
            className={buildFilterChipClassName(selectedAuthorId === teamMember.id)}
          >
            {teamMember.name}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {visibleLogs.map((log) => (
          <DailyLogCard
            key={log.id}
            log={log}
            author={teamMembers.find((teamMember) => teamMember.id === log.authorId)}
          />
        ))}
        {visibleLogs.length === 0 && (
          <p className="text-sm text-muted-foreground">No logs from this member yet.</p>
        )}
      </div>
    </div>
  );
}
