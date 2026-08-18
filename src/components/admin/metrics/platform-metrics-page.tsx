// TRANSPORT: client-query — the capability check plus five reads, all through hooks in
// `@/hooks/admin/platform-metrics`. It writes nothing; the segment list's audit entry is written
// by the backend on the read.
"use client";

import { useState } from "react";

import { ActiveUsersChart } from "@/components/admin/metrics/active-users-chart";
import { ActivityHoursChart } from "@/components/admin/metrics/activity-hours-chart";
import { RetentionCohortGrid } from "@/components/admin/metrics/retention-cohort-grid";
import { UserSegmentList } from "@/components/admin/metrics/user-segment-list";
import { WatchTimeChart } from "@/components/admin/metrics/watch-time-chart";
import { useOwnStaffContextQuery } from "@/hooks/rnd/platform-roles";
import {
  buildMetricsWindow,
  METRICS_WINDOW_PRESET_DAYS,
  todayUtcIsoDate,
  type MetricsWindowPresetDays,
} from "@/lib/admin/metrics-window";
import { ACTIVE_USER_WINDOWS, type ActiveUserWindow } from "@/lib/admin/platform-metrics.schemas";

/**
 * Platform activity and watch time — HOME_BACKEND_STRUCTURE.md §3.3a.
 *
 * THE CAPABILITY CHECK HERE IS LOAD-BEARING, not belt-and-braces. `AdminStaffGate` on the (admin)
 * layout proves the visitor holds SOME platform role — moderator and auditor both get in — and
 * these five reads need `view_platform_metrics`, which only `admin` holds. Without this the page
 * would render five refusals in a grid and read as broken.
 *
 * IT IS ALSO NOT A TRUST BOUNDARY. Every one of the five routes re-checks the capability server
 * side; this check decides what to draw, not what is allowed (CLAUDE.md — the client is hostile).
 */
const RETENTION_MONTH_CHOICES = [6, 12, 25] as const;

/**
 * A `<select>` hands back a bare string, and `as ActiveUserWindow` would be a type assertion over
 * a value the DOM produced (CLAUDE.md Pattern 2 — no `as` on anything that crossed a boundary).
 * The lookup is the parse; an unrecognised value falls back to the default rather than reaching a
 * `.strict()` query schema as a 422.
 */
function parseActiveUserWindow(candidate: string): ActiveUserWindow {
  return ACTIVE_USER_WINDOWS.find((window) => window === candidate) ?? "day";
}

export default function PlatformMetricsPage() {
  const ownStaffContextQuery = useOwnStaffContextQuery();

  // Today is read ONCE, on mount, and held. It seeds the query keys, so re-reading the clock on
  // every render would give a session that crossed midnight two cache entries and a flicker.
  const [todayIsoDate] = useState(todayUtcIsoDate);
  const [windowDays, setWindowDays] = useState<MetricsWindowPresetDays>(30);
  const [activeUserWindow, setActiveUserWindow] = useState<ActiveUserWindow>("day");
  const [retentionMonthCount, setRetentionMonthCount] = useState<number>(12);

  const metricsWindow = buildMetricsWindow(todayIsoDate, windowDays);

  if (ownStaffContextQuery.isPending) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const canViewPlatformMetrics =
    ownStaffContextQuery.data?.capabilities.includes("view_platform_metrics") ?? false;

  if (!canViewPlatformMetrics) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Metrics</h1>
        <output className="block rounded-2xl border border-[#CAC4D0]/60 bg-muted/40 p-3 text-sm text-muted-foreground">
          Platform metrics need the admin role. Your role is{" "}
          {ownStaffContextQuery.data?.platformRole ?? "none"}.
        </output>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Metrics</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Everything here is built on recorded watch time, which is the only per-user, per-day
          activity the platform stores — and only for signed-in viewers. Watching while signed out
          is not counted anywhere on this page.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <fieldset className="flex items-center gap-2">
          <legend className="sr-only">Window</legend>
          <span className="text-xs text-muted-foreground">Window</span>
          {METRICS_WINDOW_PRESET_DAYS.map((presetDays) => (
            <button
              key={presetDays}
              type="button"
              onClick={() => setWindowDays(presetDays)}
              aria-pressed={presetDays === windowDays}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                presetDays === windowDays
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-[#CAC4D0]/60 hover:bg-muted"
              }`}
            >
              {presetDays} days
            </button>
          ))}
        </fieldset>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Rolling width
          <select
            value={activeUserWindow}
            onChange={(changeEvent) =>
              setActiveUserWindow(parseActiveUserWindow(changeEvent.target.value))
            }
            className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
          >
            {ACTIVE_USER_WINDOWS.map((window) => (
              <option key={window} value={window}>
                {window}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Cohort months
          <select
            value={retentionMonthCount}
            onChange={(changeEvent) => setRetentionMonthCount(Number(changeEvent.target.value))}
            className="rounded-lg border border-[#CAC4D0]/60 px-2 py-1 text-xs"
          >
            {RETENTION_MONTH_CHOICES.map((monthCount) => (
              <option key={monthCount} value={monthCount}>
                {monthCount}
              </option>
            ))}
          </select>
        </label>

        <span className="text-xs text-muted-foreground">
          {metricsWindow.fromDate} → {metricsWindow.toDate} (UTC)
        </span>
      </div>

      <ActiveUsersChart window={metricsWindow} activeUserWindow={activeUserWindow} />
      <WatchTimeChart window={metricsWindow} />
      <ActivityHoursChart window={metricsWindow} />
      <RetentionCohortGrid monthCount={retentionMonthCount} />
      <UserSegmentList />
    </div>
  );
}
