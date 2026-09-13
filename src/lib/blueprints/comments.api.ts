// TRANSPORT: client-query — the blueprint comment threads.
//
// ⚠️ TWO ARMS, NOT THREE. A case study has no thread: `case_study_stats` has no `comment_count`,
// and that arm is a numbered lesson with no discussion surface. There is no `case_study` value in
// `BlueprintCommentArm` to pass by mistake.
//
// ⚠️ ONE LEVEL OF REPLIES. A reply names a TOP-LEVEL comment; the server answers 409 for a
// reply-to-a-reply, because nothing in the body is wrong — the thread shape is.

import {
  BlueprintCommentPageSchema,
  BlueprintCommentSchema,
  type BlueprintComment,
  type BlueprintCommentPage,
} from "@/lib/blueprints/schemas";
import {
  buildQueryString,
  getJson,
  sendJson,
  type ActionResponse,
  type RequestOptions,
} from "@/lib/http";

/** The arms that have a thread. Narrower than `BlueprintArm`, deliberately. */
export type BlueprintCommentArm = "teardown" | "showcase";

const COMMENT_ARM_SEGMENTS = {
  teardown: "teardowns",
  showcase: "showcases",
} as const satisfies Record<BlueprintCommentArm, string>;

/**
 * One page of a thread, oldest first.
 *
 * ⚠️ THE READ RESOLVES AN OPTIONAL SESSION, so each row carries `viewerState.hasLiked`. That is why
 * it is the one blueprints read with a limiter on it: it is per-viewer, no cache absorbs it, and the
 * server's own comment says so.
 *
 * ⚠️ GATED ON `published` ONLY — stricter than the page around it. A quarantined teardown still
 * renders, but its thread is withheld with its files: a rights claim is unresolved, and a discussion
 * of a survey under dispute is part of what is disputed.
 */
export function listBlueprintComments(
  input: {
    readonly arm: BlueprintCommentArm;
    readonly slug: string;
    readonly parentCommentId?: string;
    readonly cursor?: string;
    readonly limit?: number;
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintCommentPage>> {
  const queryString = buildQueryString({
    parentCommentId: input.parentCommentId,
    cursor: input.cursor,
    limit: input.limit,
  });
  return getJson(
    `/blueprints/${COMMENT_ARM_SEGMENTS[input.arm]}/${encodeURIComponent(input.slug)}/comments${queryString}`,
    BlueprintCommentPageSchema,
    options,
  );
}

/**
 * `POST /blueprints/<arm>/:slug/comments`.
 *
 * The idempotency key is optional on this route — unlike the teardown submit, where a missing one is
 * a 400. A comment box is a high-frequency control fired without ceremony; a one-per-several-hours
 * submit is a place where a missing key is a real error.
 */
export function createBlueprintComment(
  input: {
    readonly arm: BlueprintCommentArm;
    readonly slug: string;
    readonly body: string;
    readonly parentCommentId: string | null;
    readonly idempotencyKey?: string;
  },
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintComment>> {
  return sendJson(
    `/blueprints/${COMMENT_ARM_SEGMENTS[input.arm]}/${encodeURIComponent(input.slug)}/comments`,
    "POST",
    { body: input.body, parentCommentId: input.parentCommentId },
    BlueprintCommentSchema,
    input.idempotencyKey === undefined
      ? options
      : { ...options, headers: { "Idempotency-Key": input.idempotencyKey } },
  );
}

/**
 * `DELETE /blueprints/comments/:commentId` — a TOMBSTONE, never a row delete.
 *
 * ⚠️ THE ROW SURVIVES SO ITS REPLIES KEEP THEIR ANCHOR, which is why the renderer must keep drawing
 * the node with `body === null` rather than dropping it.
 */
export function deleteBlueprintComment(
  commentId: string,
  options?: RequestOptions,
): Promise<ActionResponse<{ readonly commentId: string }>> {
  return sendJson(
    `/blueprints/comments/${encodeURIComponent(commentId)}`,
    "DELETE",
    undefined,
    BlueprintCommentSchema.pick({ commentId: true }),
    options,
  );
}

/** `PUT`/`DELETE /blueprints/comments/:commentId/like`. */
export function setBlueprintCommentLike(
  input: { readonly commentId: string; readonly isSet: boolean },
  options?: RequestOptions,
): Promise<ActionResponse<{ readonly isSet: boolean; readonly likeCount: number }>> {
  return sendJson(
    `/blueprints/comments/${encodeURIComponent(input.commentId)}/like`,
    input.isSet ? "PUT" : "DELETE",
    undefined,
    BlueprintCommentSchema.pick({ likeCount: true }).extend({
      isSet: BlueprintCommentSchema.shape.viewerState.shape.hasLiked,
    }),
    options,
  );
}
