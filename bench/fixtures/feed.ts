// Deterministic fixtures for the feed benchmarks.
//
// NOTHING HERE IS RANDOM, and that is a requirement rather than a preference. CodSpeed compares
// one commit against another by running the same benchmark twice, so the input has to be
// identical across the two runs — a `Math.random()` payload would make the diff report a change
// in the data as a change in the code.
//
// The shapes are the WIRE shapes (`GET /feed/videos`, `GET /feed/categories`), built raw and then
// pushed through the boundary schemas, so the parsed fixtures used by the view-model benchmarks
// are exactly the values the app holds at runtime.

import type { ContentCategory, FeedVideo } from "@/lib/feed/schemas";
import { FeedVideoPageSchema } from "@/lib/feed/schemas";

/** The page the homepage requests: two desktop rows of Recommended plus an Explore grid. */
export const FEED_PAGE_SIZE = 24;

/** `rankSeed` is `z.string().length(32)` — the echoed exploration seed, not free text. */
const RANK_SEED = "0123456789abcdef0123456789abcdef";

/** Fixed base instant (2026-08-14T09:00:00Z) so every derived timestamp is stable. */
const BASE_EPOCH_MS = 1_786_000_000_000;

const CATEGORY_SLUGS = [
  "robotics",
  "ai",
  "hardware",
  "logistics",
  "energy",
  "agritech",
  "healthtech",
  "space",
] as const;

function toIsoInstant(offsetMs: number): string {
  return new Date(BASE_EPOCH_MS - offsetMs).toISOString();
}

/** A row before it has been through a schema — deliberately untyped, like a fetch body. */
export type RawFeedRow = Record<string, unknown>;

export interface RawFeedVideoPage {
  data: RawFeedRow[];
  pagination: Record<string, number>;
  rankSeed: string;
}

/** One raw `FeedVideoItem`, as the backend serialises it. */
export function makeRawFeedVideo(index: number): RawFeedRow {
  const hasHandle = index % 5 !== 0;
  return {
    videoId: `video-${index}`,
    youtubeVideoId: index % 3 === 0 ? null : `yt-${index}`,
    title: `Teardown ${index}: a shipped unit, start to finish`,
    thumbnailUrl: index % 7 === 0 ? null : `https://cdn.qatoto.test/thumbs/${index}.avif`,
    publishedAt: toIsoInstant(index * 3_600_000),
    durationSeconds: index % 11 === 0 ? null : 120 + index * 7,
    creator: {
      id: `creator-${index % 40}`,
      handle: hasHandle ? `creator${index % 40}` : null,
      name: `Creator ${index % 40}`,
      imageUrl: index % 4 === 0 ? null : `https://cdn.qatoto.test/avatars/${index % 40}.avif`,
    },
    categories: [
      {
        slug: CATEGORY_SLUGS[index % CATEGORY_SLUGS.length],
        label: CATEGORY_SLUGS[index % CATEGORY_SLUGS.length],
      },
      {
        slug: CATEGORY_SLUGS[(index + 3) % CATEGORY_SLUGS.length],
        label: CATEGORY_SLUGS[(index + 3) % CATEGORY_SLUGS.length],
      },
    ],
    stats: {
      viewCount: index * 9_137,
      likeCount: index * 211,
      commentCount: index * 13,
    },
    viewerState: {
      hasLiked: index % 6 === 0,
      hasSaved: index % 9 === 0,
      isSubscribedToCreator: index % 8 === 0,
    },
    isChannelLive: false,
  };
}

/** The whole `GET /feed/videos` envelope, raw. */
export function makeRawFeedVideoPage(rowCount: number): RawFeedVideoPage {
  return {
    data: Array.from({ length: rowCount }, (_unused, index) => makeRawFeedVideo(index)),
    pagination: {
      page: 1,
      limit: rowCount,
      total: rowCount * 12,
      totalPages: 12,
    },
    rankSeed: RANK_SEED,
  };
}

/**
 * A `?mode=watched` page: the same rows plus `watchedAt`, ordered newest first the way the
 * backend orders that mode, with several rows landing on each calendar day.
 */
export function makeRawWatchHistoryPage(rowCount: number, rowsPerDay = 6): RawFeedVideoPage {
  const page = makeRawFeedVideoPage(rowCount);
  for (const [index, row] of page.data.entries()) {
    const dayIndex = Math.trunc(index / rowsPerDay);
    row.watchedAt = toIsoInstant(dayIndex * 86_400_000 + (index % rowsPerDay) * 900_000);
  }
  return page;
}

/** Rows as the app holds them: through the boundary schema, once, outside the measured region. */
export function makeFeedVideos(rowCount: number): FeedVideo[] {
  return FeedVideoPageSchema.parse(makeRawFeedVideoPage(rowCount)).data;
}

export function makeWatchHistoryVideos(rowCount: number, rowsPerDay = 6): FeedVideo[] {
  return FeedVideoPageSchema.parse(makeRawWatchHistoryPage(rowCount, rowsPerDay)).data;
}

/** `GET /feed/categories`, parsed. A chip-only category has no image and must not become a tile. */
export function makeCategories(count: number): ContentCategory[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `category-${index}`,
    slug: `${CATEGORY_SLUGS[index % CATEGORY_SLUGS.length]}-${index}`,
    label: `Category ${index}`,
    imageUrl: index % 3 === 0 ? null : `https://cdn.qatoto.test/categories/${index}.avif`,
    isTile: index % 2 === 0,
    sortOrder: index,
  }));
}
