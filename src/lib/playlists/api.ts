// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. All `requireAuth`, all owner-scoped, every lookup failure a 404.

import {
  buildQueryString,
  getJson,
  getPaginated,
  sendJson,
  type ActionResponse,
  type PaginationMeta,
  type RequestOptions,
} from "@/lib/http";
import {
  PlaylistListRowSchema,
  PublicPlaylistSchema,
  type CreatePlaylistInput,
  type ListMyPlaylistsFilter,
  type PlaylistListRow,
  type PublicPlaylist,
  type UpdatePlaylistInput,
} from "@/lib/playlists/schemas";
import { DeletedSchema, PaginationMetaSchema } from "@/lib/videos/schemas";

/** `GET /playlists/mine`. */
export function listMyPlaylists(
  filter: ListMyPlaylistsFilter = {},
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: PlaylistListRow[]; pagination: PaginationMeta }>> {
  return getPaginated(
    `/playlists/mine${buildQueryString({ ...filter })}`,
    PlaylistListRowSchema,
    PaginationMetaSchema,
    options,
  );
}

/** `GET /playlists/:playlistId` — includes the ordered video list. */
export function getPlaylist(
  playlistId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return getJson(`/playlists/${encodeURIComponent(playlistId)}`, PublicPlaylistSchema, options);
}

/** `POST /playlists` — 201. */
export function createPlaylist(
  input: CreatePlaylistInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return sendJson("/playlists", "POST", input, PublicPlaylistSchema, options);
}

/**
 * `PATCH /playlists/:playlistId` — KEYED BY ID.
 *
 * The mock context this replaced keyed playlist updates by their previous TITLE, so renaming
 * two playlists to the same thing silently merged them. Ids do not have that problem.
 */
export function updatePlaylist(
  playlistId: string,
  input: UpdatePlaylistInput,
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return sendJson(
    `/playlists/${encodeURIComponent(playlistId)}`,
    "PATCH",
    input,
    PublicPlaylistSchema,
    options,
  );
}

export function deletePlaylist(
  playlistId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ deleted: boolean }>> {
  return sendJson(
    `/playlists/${encodeURIComponent(playlistId)}`,
    "DELETE",
    undefined,
    DeletedSchema,
    options,
  );
}

/**
 * `PUT /playlists/:playlistId/videos` — full replace, AND the only route that sets ORDER.
 *
 * Position comes from array index, so this is both "which videos" and "in what order".
 * `PUT /videos/:id/playlists` is the other direction and only appends. A video you do not own
 * is a 422 naming the offending ids, not a silent drop.
 */
export function replacePlaylistVideos(
  playlistId: string,
  videoIds: readonly string[],
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return sendJson(
    `/playlists/${encodeURIComponent(playlistId)}/videos`,
    "PUT",
    { videoIds },
    PublicPlaylistSchema,
    options,
  );
}
