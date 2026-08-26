// TRANSPORT: client-query — the viewer's own collections, read from the /library island.
import {
  buildQueryString,
  getCursorSiblingList,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  LibraryVideoRowSchema,
  SubscribedCreatorRowSchema,
  type LibraryVideoRow,
  type SubscribedCreatorRow,
} from "@/lib/library/schemas";

/**
 * The three library reads. Their WRITE halves have shipped since the engagement surface landed —
 * `PUT`/`DELETE /videos/:videoId/like`, `.../save` and `/creators/:creatorId/subscribe` — and
 * until now NOTHING read a row back. A viewer could like a video and then have no way to find it.
 *
 * ALL THREE ARE KEYSET. Pass `null` for the first page and then only a cursor the server handed
 * back; a constructed one is a `422 CURSOR_MALFORMED` by design, rather than a silent restart
 * that would show the reader duplicates. `nextCursor` rides as a SIBLING of `data`, which is why
 * these use `getCursorSiblingList` rather than `getCursorPaginated`.
 */
function readLibraryPage<TRow>(
  path: string,
  rowSchema: Parameters<typeof getCursorSiblingList<TRow>>[1],
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: TRow[]; nextCursor: string | null }>> {
  const queryString = buildQueryString({ cursor: cursor ?? undefined });
  return getCursorSiblingList(`${path}${queryString}`, rowSchema, options);
}

/** `GET /users/me/liked-videos` — newest like first. */
export function listMyLikedVideos(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: LibraryVideoRow[]; nextCursor: string | null }>> {
  return readLibraryPage("/users/me/liked-videos", LibraryVideoRowSchema, cursor, options);
}

/** `GET /users/me/saved-videos` — watch later, newest save first. */
export function listMySavedVideos(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: LibraryVideoRow[]; nextCursor: string | null }>> {
  return readLibraryPage("/users/me/saved-videos", LibraryVideoRowSchema, cursor, options);
}

/** `GET /users/me/subscriptions` — channels the caller follows, newest first. */
export function listMySubscriptions(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: SubscribedCreatorRow[]; nextCursor: string | null }>> {
  return readLibraryPage("/users/me/subscriptions", SubscribedCreatorRowSchema, cursor, options);
}
