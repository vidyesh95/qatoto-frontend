// TRANSPORT: client-query — React Query over `GET /users/me/watch-time` through
// `hooks/account/watch-time.ts`. It writes nothing.
"use client";

// THE ROW THAT CAME BACK. "Time watched" was deleted from the settings list on 2026-08-18 with
// "Your data in app account", both for the same defect — a full-width button with no handler. The
// difference is that this one had an endpoint coming, and now has one.
//
// THREE THINGS THE COPY HERE IS NOT ALLOWED TO DROP, each of them a property of the record rather
// than a nicety:
//
//   - SIGNED-OUT WATCHING IS NOT COUNTED. The beacon writes the hour counter only for a session
//     carrying a viewer id, because the alternative is keying an hour-by-hour behavioural profile
//     on a fingerprint shared by everyone behind one NAT. Somebody who watches signed out and sees
//     a small number here would otherwise conclude the number is wrong.
//   - THE HOUR BREAKDOWN HAS A SHORTER HORIZON THAN THE TOTALS. The per-hour table is pruned at
//     the same 90 days as the view sessions it derives from — it is the FINER record, so it may
//     not outlive the blunter one. The window comes from the response, never from a literal here.
//   - THE DAY BOUNDARY IS THIS DEVICE'S ZONE, and it is named. Every stored column is UTC; the
//     zone is a display preference the backend re-cuts the buckets by and trusts for nothing else.

import Image from "next/image";

import { BarSeries } from "@/components/charts/bar-series";
import { ChartFrame, type ChartBand } from "@/components/charts/chart-frame";
import { resolveDeviceTimeZone, useWatchTimeQuery } from "@/hooks/account/watch-time";
import type { ViewerWatchTime } from "@/lib/account/watch-time.schemas";
import { formatHourLabel, formatShortDayLabel } from "@/lib/charts/axis-labels";
import { formatWatchTimeAxisTick, formatWatchTimeLabel } from "@/lib/feed/format";
import { ApiRequestError, isUnauthorized } from "@/lib/http";

/** How many hour bands the histogram draws, regardless of what the response contains. */
const HOURS_IN_A_DAY = 24;

/**
 * What this panel is showing (CLAUDE.md Pattern 1).
 *
 * `empty` IS A REAL VARIANT, NOT A ZERO. An account with no rows gets `null` totals from the
 * backend, and rendering those as "0 min" would claim we watched the person watch nothing.
 */
type WatchTimeView =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "empty" }
  | { readonly status: "ready"; readonly watchTime: ViewerWatchTime };

type WatchTimePanelProps = {
  /** Header back button — returns to the settings action list. */
  onBack: () => void;
};

export function WatchTimePanel({ onBack }: WatchTimePanelProps) {
  const watchTimeQuery = useWatchTimeQuery();

  const view: WatchTimeView = ((): WatchTimeView => {
    if (watchTimeQuery.isPending) return { status: "loading" };

    if (watchTimeQuery.error) {
      const requestError =
        watchTimeQuery.error instanceof ApiRequestError ? watchTimeQuery.error : null;
      if (requestError && isUnauthorized(requestError.apiError)) {
        return { status: "error", message: "Sign in to see your watch time." };
      }
      return {
        status: "error",
        message: requestError?.apiError.message ?? "We could not load your watch time.",
      };
    }

    const watchTime = watchTimeQuery.data;
    if (!watchTime) return { status: "loading" };

    // The backend nulls all four totals together — `thisYear` is null exactly when the account has
    // no row in either rollup — so one of them is the whole test.
    if (watchTime.totals.thisYear === null) return { status: "empty" };

    return { status: "ready", watchTime };
  })();

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Time watched</h2>
      </header>

      <WatchTimeBody view={view} />
    </div>
  );
}

function WatchTimeBody({ view }: { readonly view: WatchTimeView }) {
  switch (view.status) {
    case "loading":
      return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;

    case "error":
      return (
        <output className="m-4 block rounded-2xl border border-black/10 bg-muted/40 p-3 text-sm text-muted-foreground">
          {view.message}
        </output>
      );

    case "empty":
      return (
        <div className="space-y-3 p-4">
          <p className="text-sm text-foreground">Nothing recorded yet.</p>
          <p className="text-xs text-muted-foreground">
            Watch time is only counted while you are signed in, and it starts a few seconds after a
            video begins playing.
          </p>
        </div>
      );

    case "ready":
      return <WatchTimeCharts watchTime={view.watchTime} />;

    default: {
      const exhaustiveCheck: never = view;
      return exhaustiveCheck;
    }
  }
}

function WatchTimeCharts({ watchTime }: { readonly watchTime: ViewerWatchTime }) {
  const deviceTimeZone = resolveDeviceTimeZone();

  const dayBands: ChartBand[] = watchTime.dailySeries.map((day) => ({
    key: day.date,
    label: formatShortDayLabel(day.date),
  }));
  const dailyValues = watchTime.dailySeries.map((day) => day.watchedSeconds);
  const dailyMaxSeconds = dailyValues.reduce((largest, value) => Math.max(largest, value), 0);

  // Walked 0..23 rather than mapped over the response, so a short array degrades to a gap at the
  // missing hour instead of shifting every later bucket one column to the left.
  const hourBands: ChartBand[] = Array.from({ length: HOURS_IN_A_DAY }, (_unused, hour) => ({
    key: String(hour),
    label: formatHourLabel(hour),
  }));
  const hourValues = Array.from(
    { length: HOURS_IN_A_DAY },
    (_unused, hour) => watchTime.hourHistogram[hour] ?? null,
  );
  const hourMaxSeconds = hourValues.reduce<number>(
    (largest, value) => Math.max(largest, value ?? 0),
    0,
  );

  return (
    <div className="space-y-6 p-4">
      <dl className="grid grid-cols-2 gap-3">
        <TotalCell label="Today" watchedSeconds={watchTime.totals.today} />
        <TotalCell label="This week" watchedSeconds={watchTime.totals.thisWeek} />
        <TotalCell label="This month" watchedSeconds={watchTime.totals.thisMonth} />
        <TotalCell label="This year" watchedSeconds={watchTime.totals.thisYear} />
      </dl>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Last 30 days</h3>
        <ChartFrame
          bands={dayBands}
          seriesCount={1}
          rawMaxValue={dailyMaxSeconds}
          formatValue={formatWatchTimeAxisTick}
          labelEvery={6}
          caption="Time watched per day over the last 30 days"
          bandColumnLabel="Day"
          valueColumnLabels={["Time watched"]}
          tableRows={watchTime.dailySeries.map((day) => ({
            key: day.date,
            label: formatShortDayLabel(day.date),
            cells: [formatWatchTimeLabel(day.watchedSeconds)],
          }))}
        >
          {(scale) => (
            <BarSeries
              scale={scale}
              seriesIndex={0}
              values={dailyValues}
              colorClassName="fill-chart-2"
              seriesLabel="Watched"
              bandLabels={dayBands.map((band) => band.label)}
              formatValue={formatWatchTimeLabel}
            />
          )}
        </ChartFrame>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">When you watch</h3>
        <ChartFrame
          bands={hourBands}
          seriesCount={1}
          rawMaxValue={hourMaxSeconds}
          formatValue={formatWatchTimeAxisTick}
          labelEvery={4}
          plotHeightClassName="h-28"
          caption={`Time watched by hour of the day, over the last ${String(watchTime.hourDetailRetentionDays)} days`}
          bandColumnLabel={`Hour (${deviceTimeZone})`}
          valueColumnLabels={["Time watched"]}
          tableRows={hourBands.map((band, hour) => ({
            key: band.key,
            label: band.label,
            cells: [formatWatchTimeLabel(hourValues[hour] ?? null)],
          }))}
        >
          {(scale) => (
            <BarSeries
              scale={scale}
              seriesIndex={0}
              values={hourValues}
              colorClassName="fill-chart-3"
              seriesLabel="Watched"
              bandLabels={hourBands.map((band) => band.label)}
              formatValue={formatWatchTimeLabel}
            />
          )}
        </ChartFrame>
        <p className="text-xs text-muted-foreground">
          Hours are shown in {deviceTimeZone}, and cover the last{" "}
          {watchTime.hourDetailRetentionDays} days — the hour-by-hour record is kept for a shorter
          time than the daily totals above.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        Only what you watch while signed in is counted. Watching signed out, or on a device where
        you are not signed in, does not appear here.
      </p>
    </div>
  );
}

function TotalCell({
  label,
  watchedSeconds,
}: {
  readonly label: string;
  readonly watchedSeconds: number | null;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-medium text-foreground">
        {formatWatchTimeLabel(watchedSeconds)}
      </dd>
    </div>
  );
}
