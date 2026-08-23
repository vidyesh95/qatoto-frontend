// TRANSPORT: server-fetch + client-query — callable from both sides via the optional
// `RequestOptions`. All `requireAuth`, every lookup failure a 404.
//
// THE PLAYLIST IS OWNER-SCOPED; ITS CONTENTS ARE NOT. A playlist the caller does not own is
// still a 404, but the VIDEOS in one may be anyone's — any publicly-servable video, plus the
// owner's own unpublished drafts. That is what makes the card menu's "Save to playlist"
// possible; before it, every id but your own uploads was refused.

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
 * `PUT /videos/:id/playlists` is the other direction and only appends. A video that is not
 * available to add — private, unpublished, or no such id — is a 422 naming the offending ids,
 * not a silent drop.
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

/*
 * The single-video pair — what a card menu uses.
 *
 * NOT `replacePlaylistVideos` WITH ONE MORE ID. That route sets membership AND order from the
 * array it is given, so a menu would have to read the playlist, append, and send the whole
 * thing back — three round trips instead of one, and it would clobber any reordering done in
 * the studio meanwhile. These append and touch nothing else.
 *
 * Both answer the WHOLE playlist, so a picker settles its checked state and its count on the
 * server's answer rather than guessing which of the two it just moved.
 */

/** `PUT /playlists/:playlistId/videos/:videoId` — append. Idempotent; a repeat is a no-op. */
export function addVideoToPlaylist(
  playlistId: string,
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return sendJson(
    `/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`,
    "PUT",
    undefined,
    PublicPlaylistSchema,
    options,
  );
}

/** `DELETE /playlists/:playlistId/videos/:videoId`. Removing what is not there succeeds. */
export function removeVideoFromPlaylist(
  playlistId: string,
  videoId: string,
  options?: RequestOptions,
): Promise<ActionResponse<PublicPlaylist>> {
  return sendJson(
    `/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`,
    "DELETE",
    undefined,
    PublicPlaylistSchema,
    options,
  );
}
