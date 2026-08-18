// TRANSPORT: client-query — `GET /admin/metrics/active-users` via `useActiveUsersQuery`.
"use client";

import { BarSeries } from "@/components/charts/bar-series";
import { ChartFrame, type ChartBand } from "@/components/charts/chart-frame";
import {
  MetricsSection,
  MetricsStateNotice,
  toMetricsViewState,
  type MetricsViewState,
} from "@/components/admin/metrics/metrics-section";
import { useActiveUsersQuery } from "@/hooks/admin/platform-metrics";
import type {
  ActiveUserWindow,
  ActiveUsersPoint,
  MetricsDateWindow,
} from "@/lib/admin/platform-metrics.schemas";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatShortDayLabel, labelEveryForBandCount } from "@/lib/charts/axis-labels";

/**
 * THE ROLLING SERIES IS NOT A SUM OF THE DAILY ONE, and the copy says so because the chart cannot.
 * `window` is the rolling WIDTH — "distinct users in the seven days ending here" — so one person
 * watching every day is seven daily counts and one weekly count. An admin reading the two series
 * as "daily" and "weekly totals" would conclude the platform lost users the moment the width moved.
 */
const WINDOW_DESCRIPTIONS: Record<ActiveUserWindow, string> = {
  day: "distinct users on that day",
  week: "distinct users in the 7 days ending on that day",
  month: "distinct users in the 30 days ending on that day",
};

export function ActiveUsersChart({
  window,
  activeUserWindow,
}: {
  readonly window: MetricsDateWindow;
  readonly activeUserWindow: ActiveUserWindow;
}) {
  const activeUsersQuery = useActiveUsersQuery(window, activeUserWindow);
  const view = toMetricsViewState(activeUsersQuery, (points) => points.length === 0);

  return (
    <MetricsSection
      title="Active users"
      description="Active means at least one day with recorded watch time — the only per-user, per-day activity this platform stores. Nothing writes a last-seen, so nothing else would be honest."
      footnote={`The rolling series is ${WINDOW_DESCRIPTIONS[activeUserWindow]}, not the sum of the daily bars beside it.`}
    >
      <ActiveUsersBody view={view} activeUserWindow={activeUserWindow} />
    </MetricsSection>
  );
}

function ActiveUsersBody({
  view,
  activeUserWindow,
}: {
  readonly view: MetricsViewState<ActiveUsersPoint[]>;
  readonly activeUserWindow: ActiveUserWindow;
}) {
  switch (view.status) {
    case "loading":
      return <MetricsStateNotice message="Loading…" />;
    case "error":
      return <MetricsStateNotice message={view.message} />;
    case "empty":
      return <MetricsStateNotice message="Nobody watched anything in this window." />;
    case "ready": {
      const points = view.data;
      const bands: ChartBand[] = points.map((point) => ({
        key: point.date,
        label: formatShortDayLabel(point.date),
      }));
      const bandLabels = bands.map((band) => band.label);
      const dailyCounts = points.map((point) => point.activeUserCount);
      const rollingCounts = points.map((point) => point.rollingActiveUserCount);
      const rawMaxValue = [...dailyCounts, ...rollingCounts].reduce(
        (largest, value) => Math.max(largest, value),
        0,
      );

      return (
        <ChartFrame
          bands={bands}
          seriesCount={2}
          rawMaxValue={rawMaxValue}
          formatValue={formatCompactCountLabel}
          labelEvery={labelEveryForBandCount(bands.length)}
          plotHeightClassName="h-48"
          caption="Active users per day, with the rolling distinct count"
          bandColumnLabel="Day"
          valueColumnLabels={["Active users", `Rolling (${activeUserWindow})`]}
          tableRows={points.map((point) => ({
            key: point.date,
            label: formatShortDayLabel(point.date),
            cells: [
              formatCompactCountLabel(point.activeUserCount),
              formatCompactCountLabel(point.rollingActiveUserCount),
            ],
          }))}
          legend={[
            { label: "Active that day", swatchClassName: "bg-chart-1" },
            { label: `Rolling ${activeUserWindow}`, swatchClassName: "bg-chart-4" },
          ]}
        >
          {(scale) => (
            <>
              <BarSeries
                scale={scale}
                seriesIndex={0}
                values={dailyCounts}
                colorClassName="fill-chart-1"
                seriesLabel="Active that day"
                bandLabels={bandLabels}
                formatValue={formatCompactCountLabel}
              />
              <BarSeries
                scale={scale}
                seriesIndex={1}
                values={rollingCounts}
                colorClassName="fill-chart-4"
                seriesLabel={`Rolling ${activeUserWindow}`}
                bandLabels={bandLabels}
                formatValue={formatCompactCountLabel}
              />
            </>
          )}
        </ChartFrame>
      );
    }
    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
