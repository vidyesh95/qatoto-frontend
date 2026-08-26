// TRANSPORT: props-only — the contract for the creator's comment inbox. No network.
import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * One comment on one of the caller's videos.
 *
 * `author` IS NULLABLE AND A NULL IS A REAL ROW, not a broken one. The author FK is `set null`,
 * so a comment outlives the account that wrote it — render "deleted account" rather than dropping
 * the row, because the comment is still on the creator's video and still theirs to act on.
 *
 * TOMBSTONES NEVER ARRIVE. The server excludes them: deleting a comment erases its body to an
 * empty string, so a tombstone here would be a blank row offering a delete already performed.
 *
 * `video` rides along so a row is actionable without a second lookup — an inbox spanning every
 * video is useless if you cannot tell which video each comment is on.
 */
export const CreatorInboxCommentSchema = z
  .object({
    commentId: z.string(),
    /** Non-null for a reply. Replies are the majority in practice and are deliberately included. */
    parentCommentId: z.string().nullable(),
    body: z.string(),
    likeCount: z.number().int(),
    replyCount: z.number().int(),
    createdAt: IsoDateTimeSchema,
    author: z
      .object({
        id: z.string(),
        handle: z.string().nullable(),
        name: z.string(),
        imageUrl: z.string().nullable(),
      })
      .strip()
      .nullable(),
    video: z
      .object({
        videoId: z.string(),
        title: z.string(),
        thumbnailUrl: z.string().nullable(),
      })
      .strip(),
  })
  .strip();
export type CreatorInboxComment = z.infer<typeof CreatorInboxCommentSchema>;
