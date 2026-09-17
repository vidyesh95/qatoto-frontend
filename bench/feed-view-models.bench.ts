// THE MAPPING LAYER BETWEEN A PARSED PAGE AND THE RENDERED GRID.
//
// Every card on the homepage, in search results and on a channel page goes through
// `toVideoCardProps`, and every one of them formats a view count. These are small functions called
// once per row per render, which is exactly the shape of code that gets slower without anybody
// noticing: nothing here is slow enough to show up in a profile on its own.
//
// The counts fed to the formatters span all four branches (`views`, `K`, `M`, `B`) so a change to
// the compact-label arithmetic cannot hide in an unexercised branch.

import type { Bench } from "tinybench";

import { FEED_PAGE_SIZE, makeCategories, makeFeedVideos } from "./fixtures/feed";
import { buildFeedChips, isChipSelected, toChipHrefPatch } from "@/lib/feed/chips";
import {
  formatCompactCountLabel,
  formatDurationLabel,
  formatSubscriberCountLabel,
  formatViewCountLabel,
} from "@/lib/feed/format";
import { toCategoryTiles, toVideoCardProps } from "@/lib/feed/schemas";
import { splitFeedPage } from "@/lib/feed/slice-feed-page";

const onePage = makeFeedVideos(FEED_PAGE_SIZE);
/** Ten pages: the accumulated list the homepage re-splits on every infinite-scroll append. */
const accumulatedList = makeFeedVideos(FEED_PAGE_SIZE * 10);
const categories = makeCategories(40);
const chips = buildFeedChips(categories);
const selection = { mode: "trending", categorySlug: undefined } as const;

/**
 * Four values per decade from ones to billions, so the exact branch, all three compact branches
 * and the boundaries between them are all measured rather than one arbitrary number each.
 */
const COUNTS = [
  0,
  1,
  ...[1, 2.5, 4.7, 9.9].flatMap((mantissa) =>
    Array.from({ length: 10 }, (_unused, exponent) => Math.trunc(mantissa * 10 ** exponent)),
  ),
];
const DURATIONS = [null, 0, 42, 412, 3_725, 14_400];

export function registerFeedViewModelBenchmarks(bench: Bench): void {
  bench
    .add("feed view models — toVideoCardProps, one page (24 rows)", () => {
      for (const [index, video] of onePage.entries()) {
        toVideoCardProps(video, { isPriority: index < 4 });
      }
    })
    .add("feed view models — splitFeedPage, accumulated list (240 rows)", () => {
      splitFeedPage(accumulatedList);
    })
    .add("feed view models — toCategoryTiles, 40 categories", () => {
      toCategoryTiles(categories);
    })
    .add("feed view models — buildFeedChips, 40 categories", () => {
      buildFeedChips(categories);
    })
    .add("feed view models — chip selection pass over the built row", () => {
      for (const chip of chips) {
        isChipSelected(chip, selection);
        toChipHrefPatch(chip);
      }
    })
    .add("feed view models — count and duration formatters, every branch", () => {
      for (const count of COUNTS) {
        formatViewCountLabel(count);
        formatCompactCountLabel(count);
        formatSubscriberCountLabel(count);
      }
      for (const duration of DURATIONS) {
        formatDurationLabel(duration);
      }
    });
}
