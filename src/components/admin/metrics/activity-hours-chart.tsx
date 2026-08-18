// TRANSPORT: client-query — `GET /admin/metrics/activity-hours` via `useActivityByHourQuery`.
"use client";

import {
  MetricsSection,
  MetricsStateNotice,
  toMetricsViewState,
  type MetricsViewState,
} from "@/components/admin/metrics/metrics-section";
import { BarSeries } from "@/components/charts/bar-series";
import { ChartFrame, type ChartBand } from "@/components/charts/chart-frame";
import { useActivityByHourQuery } from "@/hooks/admin/platform-metrics";
import type { ActivityHourBucket, MetricsDateWindow } from "@/lib/admin/platform-metrics.schemas";
import { formatHourLabel } from "@/lib/charts/axis-labels";
import {
  formatCompactCountLabel,
  formatWatchTimeAxisTick,
  formatWatchTimeLabel,
} from "@/lib/feed/format";

/** The histogram is always this wide, whatever the response contains. */
const HOURS_IN_A_DAY = 24;

// THE AXIS IS UTC AND THE HEADING SAYS SO. There is no per-user time zone on this platform, so a
// "local hour" histogram would have to invent one — and the read is deliberately sourced from the
// pre-aggregated, user-id-free table so the answer does not change shape at the 90-day boundary.
//
// `activeUserDayCount` IS A SUM OF PER-DAY DISTINCTS, which is the number that answers "how busy is
// 21:00". One person watching at 21:00 every night for a month contributes thirty. It is a count of
// user-days, not of people, and the column is labelled that way — a distinct-across-the-window
// count would be a smaller number answering a question nobody asked.

export function ActivityHoursChart({ window }: { readonly window: MetricsDateWindow }) {
  const activityHoursQuery = useActivityByHourQuery(window);
  const view = toMetricsViewState(activityHoursQuery, (buckets) =>
    buckets.every((bucket) => bucket.watchedSeconds === 0),
  );

  return (
    <MetricsSection
      title="Activity by hour of day (UTC)"
      description="Watch seconds summed into 24 buckets across the window. The axis is UTC, not local: nothing on this platform records a per-user time zone, so a local histogram would be a guess."
      footnote="Active user-days counts one person once per day per hour bucket — a viewer who watches at 21:00 every night for a month contributes thirty, not one."
    >
      <ActivityHoursBody view={view} />
    </MetricsSection>
  );
}

function ActivityHoursBody({ view }: { readonly view: MetricsViewState<ActivityHourBucket[]> }) {
  switch (view.status) {
    case "loading":
      return <MetricsStateNotice message="Loading…" />;
    case "error":
      return <MetricsStateNotice message={view.message} />;
    case "empty":
      return <MetricsStateNotice message="Nobody watched anything in this window." />;
    case "ready": {
      // Indexed by hour rather than mapped over the response, so a short or reordered payload
      // leaves a gap at the missing hour instead of shifting every later bucket left.
      const bucketsByHour = new Map(view.data.map((bucket) => [bucket.hour, bucket]));
      const bands: ChartBand[] = Array.from({ length: HOURS_IN_A_DAY }, (_unused, hour) => ({
        key: String(hour),
        label: formatHourLabel(hour),
      }));
      const bandLabels = bands.map((band) => band.label);
      const watchedSecondsByHour = Array.from(
        { length: HOURS_IN_A_DAY },
        (_unused, hour) => bucketsByHour.get(hour)?.watchedSeconds ?? null,
      );
      const rawMaxValue = watchedSecondsByHour.reduce<number>(
        (largest, value) => Math.max(largest, value ?? 0),
        0,
      );

      return (
        <ChartFrame
          bands={bands}
          seriesCount={1}
          rawMaxValue={rawMaxValue}
          formatValue={formatWatchTimeAxisTick}
          labelEvery={4}
          plotHeightClassName="h-44"
          caption="Watch time by hour of day (UTC), with active user-days per hour"
          bandColumnLabel="Hour (UTC)"
          valueColumnLabels={["Time watched", "Active user-days"]}
          tableRows={bands.map((band, hour) => {
            const bucket = bucketsByHour.get(hour);
            return {
              key: band.key,
              label: band.label,
              cells: [
                formatWatchTimeLabel(bucket?.watchedSeconds ?? null),
                bucket ? formatCompactCountLabel(bucket.activeUserDayCount) : "Not recorded",
              ],
            };
          })}
        >
          {(scale) => (
            <BarSeries
              scale={scale}
              seriesIndex={0}
              values={watchedSecondsByHour}
              colorClassName="fill-chart-3"
              seriesLabel="Watched"
              bandLabels={bandLabels}
              formatValue={formatWatchTimeLabel}
            />
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
