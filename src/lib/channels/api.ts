// TRANSPORT: server-fetch + client-query — the channel page reads its first page on the server
// and pages further from the browser, so both take the optional `RequestOptions`.
import {
  buildQueryString,
  getCursorSiblingList,
  getJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  ChannelProfileSchema,
  ListedChannelSchema,
  type ChannelProfile,
  type ListedChannel,
} from "@/lib/channels/schemas";
import { FeedVideoSchema, type FeedVideo } from "@/lib/feed/schemas";

/**
 * `GET /channels/:handle` — the header.
 *
 * 404 COVERS TWO FACTS: no such handle, and a handle nobody has claimed. The page must not
 * distinguish them either, or it becomes an oracle for which handles exist.
 */
export function getChannel(
  handle: string,
  options?: RequestOptions,
): Promise<ActionResponse<ChannelProfile>> {
  return getJson(`/channels/${encodeURIComponent(handle)}`, ChannelProfileSchema, options);
}

/**
 * `GET /channels/:handle/videos` — that creator's public videos, newest first.
 *
 * THE ROWS ARE `FeedVideoSchema`, the SAME shape `/feed/videos` answers with, which is why
 * `toVideoCardProps` and `VideoCard` render this grid unchanged. The backend reuses the feed's
 * own select clause and row mapper for exactly this reason: a card on a channel page and the
 * same card on the home page cannot disagree.
 *
 * NOT THE FEED, though. No personalization, no already-watched exclusion, no recency window —
 * a channel is a catalogue and shows everybody the same thing in publication order.
 *
 * `nextCursor` rides as a SIBLING of `data`, so this is `getCursorSiblingList`. Never construct
 * a cursor: a fabricated one is a `422` by design rather than a silent restart.
 */
export function listChannelVideos(
  handle: string,
  filter: { readonly limit?: number; readonly cursor?: string | null } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: FeedVideo[]; nextCursor: string | null }>> {
  const queryString = buildQueryString({
    limit: filter.limit,
    cursor: filter.cursor ?? undefined,
  });
  return getCursorSiblingList(
    `/channels/${encodeURIComponent(handle)}/videos${queryString}`,
    FeedVideoSchema,
    options,
  );
}

/**
 * `GET /channels` — the channels whose owners asked to be listed.
 *
 * ⚠️ OPT-IN, AND THE ABSENCE OF A CREATOR HERE MEANS NOTHING ABOUT THEM. `is_channel_listed`
 * defaults false and the backend also requires at least one publicly-servable video, so this list
 * is a subset of the public channels rather than an index of them. Do not build a "browse creators"
 * surface on it and call it complete — it would silently omit everybody who never opted in.
 *
 * `nextCursor` rides as a SIBLING of `data`, like `listChannelVideos` above.
 */
export function listChannels(
  filter: { readonly limit?: number; readonly cursor?: string | null } = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: ListedChannel[]; nextCursor: string | null }>> {
  const queryString = buildQueryString({
    limit: filter.limit,
    cursor: filter.cursor ?? undefined,
  });
  return getCursorSiblingList(`/channels${queryString}`, ListedChannelSchema, options);
}
