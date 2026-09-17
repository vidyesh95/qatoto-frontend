// THE BOUNDARY PARSE, which every feed render pays for before it draws anything.
//
// `GET /feed/videos` is the hottest read in the app and its response goes through
// `FeedVideoPageSchema` in full — twenty-four rows, each with a nested creator, a category array,
// a stats object, a viewer-state object and two `z.iso.datetime()` checks. Infinite scroll pays it
// again per page, so the 240-row case is the accumulated-list cost, not a synthetic one.
//
// The `safeParse` case measures the FAILURE path on purpose: a schema that is cheap to pass and
// ruinous to fail still stalls a render when the backend serves the bare Postgres timestamp form
// this schema exists to reject.

import type { Bench } from "tinybench";

import { FEED_PAGE_SIZE, makeRawFeedVideoPage } from "./fixtures/feed";
import { FeedVideoPageSchema, SearchVideoPageSchema } from "@/lib/feed/schemas";

const onePage = makeRawFeedVideoPage(FEED_PAGE_SIZE);
const tenPages = makeRawFeedVideoPage(FEED_PAGE_SIZE * 10);

/** The search envelope: same rows, two top-level keys, no `rankSeed`. */
const searchPage = {
  data: makeRawFeedVideoPage(FEED_PAGE_SIZE).data,
  pagination: { page: 1, limit: FEED_PAGE_SIZE, total: 240, totalPages: 10 },
};

/** The exact shape the route used to serve: no `T`, no zone. One row of twenty-four is invalid. */
const pageWithInvalidInstant = (() => {
  const page = makeRawFeedVideoPage(FEED_PAGE_SIZE);
  page.data[17].publishedAt = "2026-08-02 17:36:54.105";
  return page;
})();

export function registerFeedBoundaryBenchmarks(bench: Bench): void {
  bench
    .add("feed boundary — FeedVideoPageSchema.parse, one page (24 rows)", () => {
      FeedVideoPageSchema.parse(onePage);
    })
    .add("feed boundary — FeedVideoPageSchema.parse, ten pages (240 rows)", () => {
      FeedVideoPageSchema.parse(tenPages);
    })
    .add("feed boundary — SearchVideoPageSchema.parse, one page (24 rows)", () => {
      SearchVideoPageSchema.parse(searchPage);
    })
    .add("feed boundary — FeedVideoPageSchema.safeParse, rejected page", () => {
      FeedVideoPageSchema.safeParse(pageWithInvalidInstant);
    });
}
