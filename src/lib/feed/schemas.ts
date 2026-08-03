// TRANSPORT: props-only — pure contract. Zod schemas, wire enums and view-model mappers for
// the home feed, the watch payload and engagement. No network here; `api.ts` does the I/O.
//
// The Express backend owns data truth, but the network is untrusted (CLAUDE.md Pattern 2):
// every payload arrives as `unknown` and is parsed, never asserted. `.strip()` everywhere, so
// a backend minor release that adds a field is a no-op rather than a blank homepage.

import { z } from "zod";

import { formatViewCountLabel } from "@/lib/feed/format";
import type { VideoCardProps } from "@/types/video";

/* -------------------------------------------------------------------------- */
/* Wire enums — snake_case, byte-identical to the backend                      */
/* -------------------------------------------------------------------------- */

/**
 * `?mode=` on `GET /feed/videos`. Mirrors `FEED_MODES` in the backend's
 * `src/services/feed.service.ts` — a plain `as const` tuple there too, NOT a `pgEnum`,
 * because no column stores a feed mode.
 *
 * These are DATA, not identifiers (CLAUDE.md wire-casing table). `new_to_you` must never be
 * "corrected" to `new-to-you`: the backend's query schema is `.strict()` with `z.enum`, so a
 * kebab-cased mode is a 422, not an ignored value.
 */
export const FEED_MODES = [
  "all",
  "trending",
  "new_to_you",
  "recently_uploaded",
  "watched",
] as const;
export const FeedModeSchema = z.enum(FEED_MODES);
export type FeedMode = z.infer<typeof FeedModeSchema>;

/**
 * Where a watch session came from, sent on every beacon. Mirrors the `video_feed_source`
 * pgEnum — this one IS a column, so the labels are stored verbatim.
 */
export const FEED_SOURCES = [
  "feed_recommended",
  "feed_explore",
  "feed_spotlight",
  "feed_filtered",
  "search",
  "channel",
  "direct",
] as const;
export const FeedSourceSchema = z.enum(FEED_SOURCES);
export type FeedSource = z.infer<typeof FeedSourceSchema>;

/** `video_share_channel` pgEnum. */
export const SHARE_CHANNELS = ["copy_link", "x", "whatsapp", "linkedin", "email"] as const;
export const ShareChannelSchema = z.enum(SHARE_CHANNELS);
export type ShareChannel = z.infer<typeof ShareChannelSchema>;

/**
 * The YouTube IFrame API error codes the backend accepts, and ONLY these.
 *
 * `POST /videos/:videoId/playback-error` validates against a closed `z.union` of literals, so
 * an unlisted code is a 422 rather than a recorded report. The player must drop anything else
 * instead of forwarding it — see `use-watch-progress-beacon.ts`.
 *
 * 101 and 150 are "embedding disallowed", 100 is "not found", 2 is a malformed id and 5 is an
 * HTML5 player failure.
 */
export const PLAYBACK_ERROR_CODES = [2, 5, 100, 101, 150] as const;
export const PlaybackErrorCodeSchema = z.union([
  z.literal(2),
  z.literal(5),
  z.literal(100),
  z.literal(101),
  z.literal(150),
]);
export type PlaybackErrorCode = z.infer<typeof PlaybackErrorCodeSchema>;

/** `video_source` pgEnum. Every row is `youtube` today; `hosted` is Studio Appendix A. */
export const VIDEO_SOURCES = ["youtube", "hosted"] as const;
export const VideoSourceSchema = z.enum(VIDEO_SOURCES);
export type VideoSource = z.infer<typeof VideoSourceSchema>;

/** `video_type` pgEnum. */
export const VIDEO_TYPES = ["pitch", "demo", "update", "ama", "anime_episode"] as const;
export const VideoTypeSchema = z.enum(VIDEO_TYPES);
export type VideoType = z.infer<typeof VideoTypeSchema>;

/* -------------------------------------------------------------------------- */
/* Categories                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One row of `GET /feed/categories`.
 *
 * TWO SURFACES, ONE LIST, AND THEY ARE NOT THE SAME SUBSET. The chip row renders every active
 * category; the "What's on your mind?" tile grid renders only those with `isTile` AND an
 * image. `imageUrl` is NULLABLE — a chip-only category legitimately has none, and treating
 * the absence as a broken tile would put a hole in the grid. Use `toCategoryTiles` below
 * rather than filtering by hand at each call site.
 */
export const ContentCategorySchema = z
  .object({
    id: z.string(),
    // Kebab-case, server-generated, and linked the moment it exists — therefore never
    // constructed or edited client-side. This is the value `?categorySlug=` carries.
    slug: z.string(),
    label: z.string(),
    imageUrl: z.string().nullable(),
    isTile: z.boolean(),
    sortOrder: z.number(),
  })
  .strip();
export type ContentCategory = z.infer<typeof ContentCategorySchema>;

/* -------------------------------------------------------------------------- */
/* Feed videos                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One card in `GET /feed/videos`. Mirrors `FeedVideoItem` in the backend's
 * `src/services/feed.service.ts`.
 *
 * `viewerState` IS EMBEDDED, never a second round trip — twenty-four cards must not become
 * twenty-five requests. For an anonymous viewer every flag is `false` by construction, never
 * `null`, so no call site needs a nullish branch.
 *
 * `creator.isVerified` IS DELIBERATELY ABSENT. No creator-verification concept exists in the
 * backend schema, so there is nothing to render; a hard-coded `false` would be a trust signal
 * the platform cannot support. Do not add it here "for completeness" — `.strip()` would
 * silently keep it undefined and the badge would never light.
 */
export const FeedVideoSchema = z
  .object({
    videoId: z.string(),
    youtubeVideoId: z.string().nullable(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    // ISO 8601, NEVER a pre-formatted label. Formatting it during a server render would
    // freeze the string into the `cacheComponents` cache entry — see `relative-time.tsx`.
    //
    // `z.iso.datetime()`, not `z.string()`. This route once served the Postgres text form
    // `'2026-08-02 17:36:54.105'` — no `T`, no zone — which `Date.parse` reads as LOCAL
    // time, so every "posted X ago" was off by the viewer's UTC offset. A loose `z.string()`
    // accepted it silently and rendered the wrong hour. This fails at the boundary instead.
    publishedAt: z.iso.datetime().nullable(),
    // Null until the nightly median job has >= 5 independent samples. Absence is not zero:
    // render nothing rather than "0:00".
    durationSeconds: z.number().nullable(),
    creator: z
      .object({
        id: z.string(),
        handle: z.string().nullable(),
        name: z.string(),
        imageUrl: z.string().nullable(),
      })
      .strip(),
    categories: z.array(z.object({ slug: z.string(), label: z.string() }).strip()),
    // THREE keys. The watch payload's `stats` has five; they are separate schemas on purpose.
    stats: z
      .object({
        viewCount: z.number(),
        likeCount: z.number(),
        commentCount: z.number(),
      })
      .strip(),
    viewerState: z
      .object({
        hasLiked: z.boolean(),
        hasSaved: z.boolean(),
        isSubscribedToCreator: z.boolean(),
      })
      .strip(),
    // The literal, not a boolean. No stream domain exists (HOME_BACKEND §5.3), so the backend
    // sends `false` and the type says a `true` would be a contract violation, not a live show.
    isChannelLive: z.literal(false),
  })
  .strip();
export type FeedVideo = z.infer<typeof FeedVideoSchema>;

/** The `pagination` sibling on `PaginatedResponse`. */
export const PaginationMetaSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  })
  .strip();

/**
 * The WHOLE `GET /feed/videos` envelope, because `rankSeed` is a third top-level sibling of
 * `data` and `pagination` and `getPaginated` would discard it.
 *
 * `rankSeed` is what makes exploration deterministic across pages: it is minted server-side on
 * a first request, echoed here, and sent back on every subsequent page. Lose it and page 2
 * ranks against a fresh seed, which reshuffles the feed and shows the same video twice.
 */
export const FeedVideoPageSchema = z
  .object({
    data: z.array(FeedVideoSchema),
    pagination: PaginationMetaSchema,
    rankSeed: z.string().length(32),
  })
  .strip();
export type FeedVideoPage = z.infer<typeof FeedVideoPageSchema>;

/**
 * One page of `GET /feed/search`.
 *
 * THE ITEM SCHEMA IS SHARED WITH THE FEED, and that is a statement about the backend, not a
 * convenience: `searchVideos` selects through the same `feedSelectClause`, so a search result
 * IS a feed card — same `viewerState`, same `categories`, same counters. Duplicating the item
 * schema would let the two drift apart while both kept parsing.
 *
 * NO `rankSeed` HERE, and its absence is the contract. The feed's seed pins an exploration
 * term across pages; search has no exploration term because relevance is deterministic, so
 * this envelope has exactly two top-level keys and is read with `getPaginated`.
 */
export const SearchVideoPageSchema = z
  .object({
    data: z.array(FeedVideoSchema),
    pagination: PaginationMetaSchema,
  })
  .strip();
export type SearchVideoPage = z.infer<typeof SearchVideoPageSchema>;

/**
 * Server-side filter for `GET /feed/search`.
 *
 * `query` is REQUIRED — the backend's schema is `.min(1)` after trimming, so an empty search
 * is a 422 rather than "everything". A caller with an empty box must not call at all.
 */
export interface SearchVideosFilter {
  readonly query: string;
  readonly page?: number;
  readonly limit?: number;
}

/** Server-side filter for `GET /feed/videos`. Every key is a `.strict()` query param. */
export interface ListFeedVideosFilter {
  readonly mode?: FeedMode;
  readonly categorySlug?: string;
  readonly page?: number;
  readonly limit?: number;
  readonly rankSeed?: string;
}

/* -------------------------------------------------------------------------- */
/* Watch payload                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `GET /feed/watch/:videoId`. Mirrors `WatchPayload` in the backend's
 * `src/services/video-watch.service.ts`.
 *
 * NOT A SUPERSET OF `FeedVideoSchema`. `stats` carries five counters here and three there, and
 * sharing one schema would make the feed silently accept a payload it never receives. The
 * duplication is the point.
 *
 * The backend also deliberately omits `visibility`, `publishStatus`, `reviewStatus`,
 * `uploadStatus` and `isSourceVerified`: they are the creator's business, and a public watch
 * route that leaked them would tell a stranger which of your drafts exist.
 */
export const WatchPayloadSchema = z
  .object({
    videoId: z.string(),
    videoSource: VideoSourceSchema,
    youtubeVideoId: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    thumbnailUrl: z.string().nullable(),
    publishedAt: z.iso.datetime().nullable(),
    durationSeconds: z.number().nullable(),
    videoType: VideoTypeSchema,
    areCommentsEnabled: z.boolean(),
    chapters: z.array(z.object({ startSeconds: z.number(), title: z.string() }).strip()),
    creator: z
      .object({
        id: z.string(),
        handle: z.string().nullable(),
        name: z.string(),
        imageUrl: z.string().nullable(),
        subscriberCount: z.number(),
      })
      .strip(),
    categories: z.array(z.object({ slug: z.string(), label: z.string() }).strip()),
    stats: z
      .object({
        viewCount: z.number(),
        likeCount: z.number(),
        commentCount: z.number(),
        shareCount: z.number(),
        saveCount: z.number(),
      })
      .strip(),
    viewerState: z
      .object({
        hasLiked: z.boolean(),
        hasSaved: z.boolean(),
        isSubscribedToCreator: z.boolean(),
      })
      .strip(),
    isChannelLive: z.literal(false),
  })
  .strip();
export type WatchPayload = z.infer<typeof WatchPayloadSchema>;

/* -------------------------------------------------------------------------- */
/* Comments                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One comment from `GET /videos/:videoId/comments`. Mirrors `CommentView`.
 *
 * `body` AND `author` ARE BOTH NULLABLE, and they go null together on a tombstone. Deleting a
 * comment does not delete the row — that would orphan its replies — it blanks the content and
 * sets `isDeleted`. `author` is also null for a closed account on a live comment. Render the
 * tombstone, never a card with an empty name.
 */
export const VideoCommentSchema = z
  .object({
    commentId: z.string(),
    parentCommentId: z.string().nullable(),
    body: z.string().nullable(),
    isDeleted: z.boolean(),
    author: z
      .object({
        id: z.string(),
        handle: z.string().nullable(),
        name: z.string(),
        imageUrl: z.string().nullable(),
      })
      .strip()
      .nullable(),
    likeCount: z.number(),
    replyCount: z.number(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    viewerState: z.object({ hasLiked: z.boolean() }).strip(),
  })
  .strip();
export type VideoComment = z.infer<typeof VideoCommentSchema>;

/** `PATCH /comments/:commentId` answers a partial, not a whole `CommentView`. */
export const UpdatedVideoCommentSchema = z
  .object({
    commentId: z.string(),
    body: z.string(),
    updatedAt: z.iso.datetime(),
  })
  .strip();
export type UpdatedVideoComment = z.infer<typeof UpdatedVideoCommentSchema>;

/** `DELETE /comments/:commentId` — a tombstone acknowledgement. */
export const DeletedVideoCommentSchema = z.object({ commentId: z.string() }).strip();

/* -------------------------------------------------------------------------- */
/* Engagement toggle results                                                    */
/* -------------------------------------------------------------------------- */

/*
 * THREE DIFFERENT SPELLINGS FOR "AM I SUBSCRIBED", AND THEY ARE NOT UNIFIED HERE.
 *
 *   feed / watch  `viewerState.isSubscribedToCreator`
 *   PUT/DELETE    `isSubscribed`
 *
 * Same for like: the feed says `viewerState.hasLiked` and the toggle says `hasLiked`, which
 * happens to match, while save is `hasSaved` in both. Renaming any of them at the boundary
 * would make the schema stop describing the wire, and the next person to read the backend
 * would find a field this file claims does not exist. Map them in the hooks, not here.
 */

export const LikeToggleResultSchema = z
  .object({ hasLiked: z.boolean(), likeCount: z.number() })
  .strip();
export type LikeToggleResult = z.infer<typeof LikeToggleResultSchema>;

export const SaveToggleResultSchema = z
  .object({ hasSaved: z.boolean(), saveCount: z.number() })
  .strip();
export type SaveToggleResult = z.infer<typeof SaveToggleResultSchema>;

export const SubscribeToggleResultSchema = z
  .object({ isSubscribed: z.boolean(), subscriberCount: z.number() })
  .strip();
export type SubscribeToggleResult = z.infer<typeof SubscribeToggleResultSchema>;

export const ShareResultSchema = z.object({ shareCount: z.number() }).strip();
export type ShareResult = z.infer<typeof ShareResultSchema>;

/**
 * The 202 routes — view-beacon and playback-error — answer with NO `data` key at all.
 *
 * Not `null`, absent: the envelope is `{ status, statusCode, message }` and nothing else. That
 * is deliberate on the backend's side, because returning the clamped watch time would hand an
 * attacker an oracle for the clamp. `z.undefined()` is therefore the correct schema, and a
 * `z.object({})` here would fail every call.
 */
export const AcknowledgedSchema = z.undefined();

/* -------------------------------------------------------------------------- */
/* View models                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Active categories that can be a tile.
 *
 * The image is required for a tile and nullable on the wire, so this narrows the type as well
 * as filtering — callers get `imageUrl: string` and no non-null assertion.
 */
export function toCategoryTiles(
  categories: readonly ContentCategory[],
): (Omit<ContentCategory, "imageUrl"> & { readonly imageUrl: string })[] {
  const tiles: (Omit<ContentCategory, "imageUrl"> & { readonly imageUrl: string })[] = [];
  for (const category of categories) {
    if (!category.isTile || category.imageUrl === null) continue;
    tiles.push({ ...category, imageUrl: category.imageUrl });
  }
  return tiles;
}

/** Fallback thumbnail for a row whose `thumbnailUrl` is null. */
const PLACEHOLDER_THUMBNAIL_SRC = "/dummy/spotlight_image01.avif";
/** Fallback avatar for a creator with no uploaded image. */
const PLACEHOLDER_AVATAR_SRC = "/dummy/profile_image01.avif";

/**
 * A feed row as the shared `VideoCard` wants it.
 *
 * `views` and `postedAt` are display strings on `VideoCardProps` for historical reasons, so
 * this fills `views` with a formatted count and leaves `postedAt` empty — the card renders
 * `publishedAt` through `<RelativeTime>` instead, because a relative label computed here would
 * be computed during a SERVER render and frozen into the `cacheComponents` entry.
 *
 * `channelHref` is omitted rather than guessed when a creator has no handle: a link to
 * `/channel/null` is worse than no link.
 */
export function toVideoCardProps(
  video: FeedVideo,
  options: { readonly isPriority?: boolean } = {},
): VideoCardProps {
  return {
    videoId: video.videoId,
    thumbnailSrc: video.thumbnailUrl ?? PLACEHOLDER_THUMBNAIL_SRC,
    profileSrc: video.creator.imageUrl ?? PLACEHOLDER_AVATAR_SRC,
    title: video.title,
    channelName: video.creator.name,
    views: formatViewCountLabel(video.stats.viewCount),
    postedAt: "",
    publishedAt: video.publishedAt,
    isChannelLive: video.isChannelLive,
    href: `/watch?v=${encodeURIComponent(video.videoId)}`,
    ...(video.creator.handle === null
      ? {}
      : { channelHref: `/channel/${encodeURIComponent(video.creator.handle)}` }),
    ...(options.isPriority === undefined ? {} : { isPriority: options.isPriority }),
  };
}
