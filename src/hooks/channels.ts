"use client";

// TRANSPORT: client-query — the channel grid's "load more", seeded from the server's first page.

import { useKeysetList, toCursorKeysetPage, type KeysetListResult } from "@/hooks/keyset-list";
import { listChannelVideos } from "@/lib/channels/api";
import type { FeedVideo } from "@/lib/feed/schemas";

export const channelKeys = {
  videos: (handle: string) => ["channel", "videos", handle] as const,
};

/**
 * A channel's videos, continuing from the page the server already rendered.
 *
 * `initialPage` IS THE SERVER'S PAGE, not null. The route is a server component that reads page
 * one with the caller's cookie, so passing it here is what stops the browser repeating that
 * request on mount — the shared hook's banner is explicit that seeding is the difference between
 * one fetch and two on first paint. A caller with no server page (a failed read) passes `null`
 * and the hook fetches; an EMPTY page must never be substituted for that.
 *
 * The `typeof` guard is what the hook's concrete `KeysetToken` union requires. This read uses the
 * string arm — an opaque, server-issued cursor.
 */
export function useChannelVideosQuery(input: {
  readonly handle: string;
  readonly initialRows: FeedVideo[] | null;
  readonly initialNextCursor: string | null;
}): KeysetListResult<FeedVideo> {
  return useKeysetList<FeedVideo>({
    queryKey: channelKeys.videos(input.handle),
    initialPage:
      input.initialRows === null
        ? null
        : { rows: input.initialRows, nextToken: input.initialNextCursor },
    fetchPage: async (token) =>
      toCursorKeysetPage(
        await listChannelVideos(input.handle, {
          cursor: typeof token === "string" ? token : null,
        }),
      ),
  });
}
