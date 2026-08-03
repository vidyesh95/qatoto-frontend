// TRANSPORT: props-only — pure contract for `/playlists`.
//
// PLAYLIST VISIBILITY IS NOT VIDEO VISIBILITY. The playlist enum is
// `["public","unlisted","private"]` — three values, a DIFFERENT ORDER, and no `investor_only`.
// Reusing the video tuple here would let the UI offer a value the backend `.strict()`s away,
// and the order matters because these tuples are read positionally by label maps.

import { z } from "zod";

export const PLAYLIST_VISIBILITIES = ["public", "unlisted", "private"] as const;
export const PLAYLIST_VIDEO_ORDERS = [
  "date_published_newest",
  "date_published_oldest",
  "date_added_newest",
  "date_added_oldest",
  "manual",
] as const;

export const PlaylistVisibilitySchema = z.enum(PLAYLIST_VISIBILITIES);
export type PlaylistVisibility = z.infer<typeof PlaylistVisibilitySchema>;
export const PlaylistVideoOrderSchema = z.enum(PLAYLIST_VIDEO_ORDERS);
export type PlaylistVideoOrder = z.infer<typeof PlaylistVideoOrderSchema>;

/** Note the key is `videoId`, NOT `id` — the row identifies the video, not the membership. */
export const PlaylistVideoSchema = z
  .object({
    videoId: z.string(),
    title: z.string(),
    thumbnailUrl: z.string().nullable(),
    position: z.number(),
  })
  .strip();
export type PlaylistVideo = z.infer<typeof PlaylistVideoSchema>;

export const PublicPlaylistSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    visibility: PlaylistVisibilitySchema,
    defaultVideoOrder: PlaylistVideoOrderSchema,
    language: z.string().nullable(),
    videos: z.array(PlaylistVideoSchema),
    videoCount: z.number(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strip();
export type PublicPlaylist = z.infer<typeof PublicPlaylistSchema>;

/** `GET /playlists/mine`. No description, no order, no language, no createdAt — by design. */
export const PlaylistListRowSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    visibility: PlaylistVisibilitySchema,
    videoCount: z.number(),
    updatedAt: z.iso.datetime(),
  })
  .strip();
export type PlaylistListRow = z.infer<typeof PlaylistListRowSchema>;

/** Page and limit only — the query schema is `.strict()`. */
export interface ListMyPlaylistsFilter {
  readonly page?: number;
  readonly limit?: number;
}

/** `POST /playlists`. Only `title` is required. */
export interface CreatePlaylistInput {
  readonly title: string;
  readonly description?: string;
  readonly visibility?: PlaylistVisibility;
  readonly defaultVideoOrder?: PlaylistVideoOrder;
  readonly language?: string;
}

export type UpdatePlaylistInput = Partial<CreatePlaylistInput>;
