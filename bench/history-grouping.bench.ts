// WATCH HISTORY, GROUPED TWICE PER PAGE.
//
// `<HistoryList>` groups the rows with the UTC key for the server render and then RE-GROUPS them
// with the reader's local key once `useIsHydrated()` flips, so the cost below is paid twice for
// every page of history — once on a server that is also rendering everything else, once on the
// client during hydration.
//
// The two key functions are not interchangeable in cost: `toUtcDateKey` is a string slice,
// `toLocalDateKeyOf` constructs two `Date`s per row, and `toLocalDateLabel` reaches
// `toLocaleDateString` once per group. Measuring them separately is what keeps the hydration swap
// from silently becoming the expensive half.

import type { Bench } from "tinybench";

import { makeWatchHistoryVideos } from "./fixtures/feed";
import {
  toLocalDateKeyOf,
  toLocalDateLabel,
  toUtcDateKey,
  toWatchHistoryDateGroups,
} from "@/lib/feed/history-grouping";

/** Ten pages of history: fifty calendar days at six rows a day. */
const historyRows = makeWatchHistoryVideos(300, 6);
const watchedInstants = historyRows.map((video) => video.watchedAt ?? "");

/** Fixed "now" (2026-08-14T09:00:00Z) so the Today/Yesterday branches are stable across runs. */
const NOW_MS = 1_786_000_000_000;

export function registerHistoryGroupingBenchmarks(bench: Bench): void {
  bench
    .add("watch history — group by UTC key, 300 rows (server render)", () => {
      toWatchHistoryDateGroups(historyRows, toUtcDateKey, (dateKey) =>
        toLocalDateLabel(dateKey, NOW_MS),
      );
    })
    .add("watch history — group by local key, 300 rows (post-hydration)", () => {
      toWatchHistoryDateGroups(historyRows, toLocalDateKeyOf, (dateKey) =>
        toLocalDateLabel(dateKey, NOW_MS),
      );
    })
    .add("watch history — toLocalDateKeyOf, 300 instants", () => {
      for (const instant of watchedInstants) {
        toLocalDateKeyOf(instant);
      }
    });
}
