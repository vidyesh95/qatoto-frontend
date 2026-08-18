// TRANSPORT: client-query — `GET /admin/metrics/watch-time` via `useWatchTimeDistributionQuery`.
"use client";

import {
  MetricsSection,
  MetricsStateNotice,
  toMetricsViewState,
  type MetricsViewState,
} from "@/components/admin/metrics/metrics-section";
import { BarSeries } from "@/components/charts/bar-series";
import { ChartFrame, type ChartBand } from "@/components/charts/chart-frame";
import { useWatchTimeDistributionQuery } from "@/hooks/admin/platform-metrics";
import type { MetricsDateWindow, WatchTimePoint } from "@/lib/admin/platform-metrics.schemas";
import { formatShortDayLabel, labelEveryForBandCount } from "@/lib/charts/axis-labels";
import {
  formatCompactCountLabel,
  formatWatchTimeAxisTick,
  formatWatchTimeLabel,
} from "@/lib/feed/format";

// TWO CHARTS, NOT ONE WITH THREE SERIES, and the reason is the axis. `totalWatchedSeconds` is the
// whole platform's seconds for a day; the median and p90 are ONE PERSON's seconds. On a shared
// axis the per-user series is a flat line of invisible slivers under the total — technically
// plotted, practically a claim that nobody watches anything. Same units are what make two series
// comparable, so the per-user pair gets its own frame.
//
// A `null` MEDIAN IS A DAY NOBODY WATCHED. There is no median of an empty set, so the backend
// answers `null` rather than 0 and the bar is simply absent — never floored to the axis.

export function WatchTimeChart({ window }: { readonly window: MetricsDateWindow }) {
  const watchTimeQuery = useWatchTimeDistributionQuery(window);
  const view = toMetricsViewState(watchTimeQuery, (points) => points.length === 0);

  return (
    <MetricsSection
      title="Watch time"
      description="Clamped watch seconds, rolled up per day. A beacon can never claim more seconds than wall-clock time has passed, so these are bounded by the platform rather than reported by the client."
      footnote="The per-user chart is median and 90th percentile SECONDS PER WATCHING USER, which is why it has its own axis — plotting it against the platform total would render it as a flat line."
    >
      <WatchTimeBody view={view} />
    </MetricsSection>
  );
}

function WatchTimeBody({ view }: { readonly view: MetricsViewState<WatchTimePoint[]> }) {
  switch (view.status) {
    case "loading":
      return <MetricsStateNotice message="Loading…" />;
    case "error":
      return <MetricsStateNotice message={view.message} />;
    case "empty":
      return <MetricsStateNotice message="No watch time was recorded in this window." />;
    case "ready": {
      const points = view.data;
      const bands: ChartBand[] = points.map((point) => ({
        key: point.date,
        label: formatShortDayLabel(point.date),
      }));
      const bandLabels = bands.map((band) => band.label);
      const labelEvery = labelEveryForBandCount(bands.length);

      const totalSeconds = points.map((point) => point.totalWatchedSeconds);
      const medianSeconds = points.map((point) => point.medianWatchedSecondsPerUser);
      const p90Seconds = points.map((point) => point.p90WatchedSecondsPerUser);

      const totalMax = totalSeconds.reduce((largest, value) => Math.max(largest, value), 0);
      const perUserMax = [...medianSeconds, ...p90Seconds].reduce<number>(
        (largest, value) => Math.max(largest, value ?? 0),
        0,
      );

      const tableRows = points.map((point) => ({
        key: point.date,
        label: formatShortDayLabel(point.date),
        cells: [
          formatWatchTimeLabel(point.totalWatchedSeconds),
          formatCompactCountLabel(point.watchingUserCount),
          formatWatchTimeLabel(point.medianWatchedSecondsPerUser),
          formatWatchTimeLabel(point.p90WatchedSecondsPerUser),
        ],
      }));

      return (
        <div className="space-y-6">
          <ChartFrame
            bands={bands}
            seriesCount={1}
            rawMaxValue={totalMax}
            formatValue={formatWatchTimeAxisTick}
            labelEvery={labelEvery}
            plotHeightClassName="h-48"
            caption="Total watch time per day, with the number of watching users and their median and 90th-percentile time"
            bandColumnLabel="Day"
            valueColumnLabels={[
              "Total watched",
              "Watching users",
              "Median per user",
              "p90 per user",
            ]}
            tableRows={tableRows}
          >
            {(scale) => (
              <BarSeries
                scale={scale}
                seriesIndex={0}
                values={totalSeconds}
                colorClassName="fill-chart-2"
                seriesLabel="Total watched"
                bandLabels={bandLabels}
                formatValue={formatWatchTimeLabel}
              />
            )}
          </ChartFrame>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Per watching user</h3>
            <ChartFrame
              bands={bands}
              seriesCount={2}
              rawMaxValue={perUserMax}
              formatValue={formatWatchTimeAxisTick}
              labelEvery={labelEvery}
              plotHeightClassName="h-40"
              caption="Median and 90th-percentile watch time per watching user, per day"
              bandColumnLabel="Day"
              valueColumnLabels={["Median per user", "p90 per user"]}
              tableRows={points.map((point) => ({
                key: point.date,
                label: formatShortDayLabel(point.date),
                cells: [
                  formatWatchTimeLabel(point.medianWatchedSecondsPerUser),
                  formatWatchTimeLabel(point.p90WatchedSecondsPerUser),
                ],
              }))}
              legend={[
                { label: "Median", swatchClassName: "bg-chart-3" },
                { label: "90th percentile", swatchClassName: "bg-chart-5" },
              ]}
            >
              {(scale) => (
                <>
                  <BarSeries
                    scale={scale}
                    seriesIndex={0}
                    values={medianSeconds}
                    colorClassName="fill-chart-3"
                    seriesLabel="Median"
                    bandLabels={bandLabels}
                    formatValue={formatWatchTimeLabel}
                  />
                  <BarSeries
                    scale={scale}
                    seriesIndex={1}
                    values={p90Seconds}
                    colorClassName="fill-chart-5"
                    seriesLabel="90th percentile"
                    bandLabels={bandLabels}
                    formatValue={formatWatchTimeLabel}
                  />
                </>
              )}
            </ChartFrame>
          </div>
        </div>
      );
    }
    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}
