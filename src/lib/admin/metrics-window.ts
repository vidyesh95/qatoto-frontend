// TRANSPORT: props-only — pure date arithmetic on `YYYY-MM-DD` strings.

import type { MetricsDateWindow } from "@/lib/admin/platform-metrics.schemas";

// The windows the metrics page offers. Every one is well inside the backend's 762-day cap, which
// is the retention horizon rather than a number that resembles it.
export const METRICS_WINDOW_PRESET_DAYS = [7, 30, 90] as const;
export type MetricsWindowPresetDays = (typeof METRICS_WINDOW_PRESET_DAYS)[number];

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Today in UTC, as `YYYY-MM-DD`.
 *
 * CALL IT FROM A CLIENT ISLAND ONLY. It reads the clock, so a server component that called it
 * would stop prerendering — the same rule `src/app/sitemap.ts` is blocked on. Every caller here is
 * inside a `"use client"` component, called once on mount and held in state so the window does not
 * change under the query key mid-session.
 */
export function todayUtcIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The last `dayCount` days ending today, inclusive of both ends.
 *
 * PURE, and takes today as an argument rather than reading the clock, so the same call always
 * produces the same window — which is what lets the result sit in a React Query key.
 */
export function buildMetricsWindow(todayIsoDate: string, dayCount: number): MetricsDateWindow {
  const todayMilliseconds = Date.parse(`${todayIsoDate}T00:00:00Z`);
  const fromMilliseconds = todayMilliseconds - (dayCount - 1) * MILLISECONDS_PER_DAY;
  return {
    fromDate: new Date(fromMilliseconds).toISOString().slice(0, 10),
    toDate: todayIsoDate,
  };
}

/** "2026-08" → "Aug 2026", for the cohort grid's row labels. */
export function formatCohortMonthLabel(cohortMonth: string): string {
  const monthParts = /^(\d{4})-(\d{2})$/.exec(cohortMonth);
  if (!monthParts) return cohortMonth;
  const [, year, month] = monthParts;
  const monthAbbreviations = [
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
  return `${monthAbbreviations[Number(month) - 1] ?? month} ${year}`;
}
