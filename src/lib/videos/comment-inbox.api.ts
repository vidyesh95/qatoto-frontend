// TRANSPORT: client-query — the creator's comment inbox, read from a studio island.
import {
  buildQueryString,
  getCursorSiblingList,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";
import {
  CreatorInboxCommentSchema,
  type CreatorInboxComment,
} from "@/lib/videos/comment-inbox.schemas";

/**
 * `GET /users/me/video-comments` — every comment across the caller's own videos, newest first.
 *
 * IT ADDS NO PERMISSION. Deleting a comment on your own video has always been allowed; this is
 * the read that finally lets a creator find the comment without opening each video in turn.
 *
 * `nextCursor` rides as a SIBLING of `data`, so this is `getCursorSiblingList`. Pass `null` for
 * the first page and never construct a cursor — a fabricated one is a `422 CURSOR_MALFORMED` by
 * design, rather than a silent restart that would show the reader duplicates.
 */
export function listMyVideoComments(
  cursor: string | null,
  options?: RequestOptions,
): Promise<ActionResponse<{ rows: CreatorInboxComment[]; nextCursor: string | null }>> {
  const queryString = buildQueryString({ cursor: cursor ?? undefined });
  return getCursorSiblingList(
    `/users/me/video-comments${queryString}`,
    CreatorInboxCommentSchema,
    options,
  );
}
