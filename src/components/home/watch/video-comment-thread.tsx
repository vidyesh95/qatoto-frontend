"use client";

// TRANSPORT: client-query — the real comment thread. Reads `GET /videos/:id/comments` (keyset)
// and writes create / edit / delete / like.
//
// SEEDED FROM THE SERVER WHEN THE SERVER GOT A PAGE: page one arrives with the watch page render,
// so opening a video costs no extra request for its comments. When that read FAILED the seed is
// `null`, not an empty page — a fabricated empty page is indistinguishable from "nobody has
// commented" and, pinned by `staleTime: Infinity`, would never be corrected.
//
// THREE THINGS THE BACKEND DOES THAT THE UI MUST NOT PAPER OVER:
//
//   1. DELETE IS A TOMBSTONE. The row survives with `body: null` and `author: null` so its
//      replies keep their anchor. Dropping the node client-side would orphan replies the
//      server still returns, so a deleted comment renders as "[deleted]".
//   2. THERE IS NO SORT PARAMETER. The backend fixes the order — newest-first for the thread,
//      oldest-first for replies. The old mock had Top/New pills that sorted nothing; a control
//      that cannot do what it says is worse than no control, so they are gone.
//   3. COMMENTS-OFF IS A 200 WITH AN EMPTY PAGE, not a 409. `areCommentsEnabled` is what
//      distinguishes "turned off" from "nobody has commented", and only the caller knows it.

import Image from "next/image";
import { useState } from "react";

import LoadMoreControl from "@/components/home/shared/load-more-control";
import RelativeTime from "@/components/home/shared/relative-time";
import {
  describeEngagementError,
  useCreateVideoCommentMutation,
  useDeleteVideoCommentMutation,
  useUpdateVideoCommentMutation,
  useVideoCommentLikeMutation,
} from "@/hooks/feed/mutations";
import { useVideoCommentsList } from "@/hooks/feed/queries";
import { formatCompactCountLabel } from "@/lib/feed/format";
import type { VideoComment } from "@/lib/feed/schemas";
import { newIdempotencyKey } from "@/lib/idempotency";

/** The backend's own `.max(50)`; asking for more is a 422. */
const COMMENTS_PAGE_LIMIT = 20;
/** Replies are usually few — a smaller page keeps an expanded thread from dominating the panel. */
const REPLIES_PAGE_LIMIT = 10;
/** The backend's `z.string().trim().min(1).max(2000)`. */
const COMMENT_MAX_LENGTH = 2000;

const PLACEHOLDER_AVATAR_SRC = "/dummy/profile_image_01.avif";

export default function VideoCommentThread({
  videoId,
  areCommentsEnabled,
  initialComments,
  initialNextCursor,
  isViewerSignedIn,
}: {
  readonly videoId: string;
  readonly areCommentsEnabled: boolean;
  /** Null when the server-side read failed — the client then fetches page one itself. */
  readonly initialComments: VideoComment[] | null;
  readonly initialNextCursor: string | null;
  readonly isViewerSignedIn: boolean;
}) {
  const thread = useVideoCommentsList({
    videoId,
    serverRenderedFirstPage:
      initialComments === null ? null : { rows: initialComments, nextCursor: initialNextCursor },
    limit: COMMENTS_PAGE_LIMIT,
  });

  if (!areCommentsEnabled) {
    return (
      <p className="px-4 py-6 text-sm text-[#6F7979]">Comments are turned off for this video.</p>
    );
  }

  return (
    <div>
      {isViewerSignedIn ? (
        <CommentComposer videoId={videoId} />
      ) : (
        <p className="px-4 py-3 text-xs text-[#6F7979]">Sign in to leave a comment.</p>
      )}

      {thread.isLoadingFirstPage ? (
        <p className="px-4 py-6 text-sm text-[#6F7979]">Loading comments…</p>
      ) : thread.firstPageErrorMessage !== null ? (
        <p role="alert" className="px-4 py-6 text-sm text-red-700">
          {thread.firstPageErrorMessage}
        </p>
      ) : thread.rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-[#6F7979]">No comments yet. Be the first.</p>
      ) : (
        <ul className="px-4 pb-2">
          {thread.rows.map((comment) => (
            <CommentItem
              key={comment.commentId}
              videoId={videoId}
              comment={comment}
              isViewerSignedIn={isViewerSignedIn}
            />
          ))}
        </ul>
      )}

      <div className="px-4 pb-3">
        <LoadMoreControl
          hasNextPage={thread.hasNextPage}
          isFetchingNextPage={thread.isFetchingNextPage}
          errorMessage={thread.loadMoreErrorMessage}
          onLoadNextPage={thread.loadNextPage}
          label="Load more comments"
        />
      </div>
    </div>
  );
}

/**
 * The composer. It did not exist before this change — there was no `<textarea>` anywhere in the
 * watch tree, so the comment-create route had nothing to call it.
 *
 * NOT OPTIMISTIC, DELIBERATELY. A comment is a piece of writing, and showing it as posted when
 * it was not is a lie the reader acts on: they close the tab believing they said something.
 * Pending state, then the server's own row.
 */
function CommentComposer({
  videoId,
  parentCommentId,
  placeholder = "Add a comment…",
  onPosted,
}: {
  readonly videoId: string;
  /** Present for a REPLY. One level only — the backend 409s a reply on a reply. */
  readonly parentCommentId?: string;
  readonly placeholder?: string;
  readonly onPosted?: () => void;
}) {
  const [draftBody, setDraftBody] = useState("");
  // Minted ONCE PER ATTEMPT — `newIdempotencyKey` is passed UNCALLED so React runs it a single
  // time. Regenerating it inside a retry would defeat the whole mechanism, which is why it is
  // not derived from the draft text either.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const createComment = useCreateVideoCommentMutation(videoId);

  const trimmedBody = draftBody.trim();
  const isSubmittable = trimmedBody.length > 0 && trimmedBody.length <= COMMENT_MAX_LENGTH;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSubmittable || createComment.isPending) return;
    createComment.mutate(
      {
        body: trimmedBody,
        ...(parentCommentId === undefined ? {} : { parentCommentId }),
        idempotencyKey,
      },
      {
        onSuccess: () => {
          setDraftBody("");
          // A NEW attempt deserves a NEW key: the next comment is a different thing, and
          // reusing this one would come back 409 (same key, different body).
          setIdempotencyKey(newIdempotencyKey());
          onPosted?.();
        },
      },
    );
  };

  const refusal =
    createComment.error === null ? null : describeEngagementError(createComment.error);

  return (
    <form onSubmit={handleSubmit} className="space-y-2 px-4 py-3">
      <textarea
        value={draftBody}
        onChange={(event) => setDraftBody(event.target.value)}
        maxLength={COMMENT_MAX_LENGTH}
        rows={2}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-none rounded-lg border border-[#CAC4D0] px-3 py-2 text-sm outline-none focus:border-[#00696E]"
      />
      <div className="flex flex-row items-center justify-end gap-3">
        {refusal !== null && (
          <p role="alert" className="flex-1 text-xs text-red-700">
            {refusal.message}
          </p>
        )}
        <button
          type="submit"
          disabled={!isSubmittable || createComment.isPending}
          className="rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {createComment.isPending
            ? "Posting…"
            : parentCommentId === undefined
              ? "Comment"
              : "Reply"}
        </button>
      </div>
    </form>
  );
}

function CommentItem({
  videoId,
  comment,
  isViewerSignedIn,
}: {
  readonly videoId: string;
  readonly comment: VideoComment;
  readonly isViewerSignedIn: boolean;
}) {
  const [isLiked, setIsLiked] = useState(comment.viewerState.hasLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [areRepliesExpanded, setAreRepliesExpanded] = useState(false);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const likeComment = useVideoCommentLikeMutation();
  const deleteComment = useDeleteVideoCommentMutation(videoId);

  // A tombstone. The row is kept so its replies keep an anchor; rendering it as a normal card
  // with an empty name would look like a bug. Its REPLIES are still reachable — that is the
  // whole reason the backend tombstones instead of deleting.
  if (comment.isDeleted || comment.body === null) {
    return (
      <li className="py-3">
        <p className="text-xs text-[#6F7979] italic">[deleted]</p>
        {comment.replyCount > 0 && (
          <ReplyThread videoId={videoId} parentCommentId={comment.commentId} />
        )}
      </li>
    );
  }

  const handleLikeClick = () => {
    // OPTIMISTIC, and safe to be: the toggle has a per-user unique key server-side, so a
    // double-tap is idempotent by construction rather than a second like.
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((previousCount) => previousCount + (nextIsLiked ? 1 : -1));
    likeComment.mutate(
      { commentId: comment.commentId, shouldBeLiked: nextIsLiked },
      {
        onSuccess: (result) => {
          setIsLiked(result.hasLiked);
          setLikeCount(result.likeCount);
        },
        onError: () => {
          setIsLiked(!nextIsLiked);
          setLikeCount((previousCount) => previousCount + (nextIsLiked ? -1 : 1));
        },
      },
    );
  };

  return (
    <li className="flex flex-row gap-3 py-3">
      <Image
        src={comment.author?.imageUrl ?? PLACEHOLDER_AVATAR_SRC}
        width={32}
        height={32}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        {/* `author` is null for a closed account even on a live comment. */}
        <span className="text-[11px] font-medium text-foreground">
          {comment.author?.name ?? "Former member"}
        </span>

        {isEditing ? (
          <CommentEditor
            videoId={videoId}
            commentId={comment.commentId}
            initialBody={comment.body}
            onDone={() => setIsEditing(false)}
          />
        ) : (
          <>
            <p className="mt-1 text-xs leading-snug font-medium">{comment.body}</p>
            <RelativeTime
              isoInstant={comment.createdAt}
              className="mt-1 block text-[11px] text-[#6F7979]"
            />
          </>
        )}

        <div className="mt-2 flex flex-row flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={handleLikeClick}
            aria-pressed={isLiked}
            aria-label="Like comment"
            className="flex cursor-pointer flex-row items-center gap-1.5 text-[11px] text-foreground hover:text-[#6F7979]"
          >
            <Image
              src={`/icons/favorite_24dp_000000_FILL${isLiked ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
              width={14}
              height={14}
              alt=""
            />
            {formatCompactCountLabel(likeCount)}
          </button>

          {/*
            ONE LEVEL OF THREADING ONLY — replying to a reply is a 409. So this control lives on
            top-level comments and never inside `ReplyThread`.
          */}
          {isViewerSignedIn && (
            <button
              type="button"
              onClick={() => setIsReplyComposerOpen((isOpen) => !isOpen)}
              aria-expanded={isReplyComposerOpen}
              className="cursor-pointer text-[11px] text-[#6F7979] hover:text-foreground"
            >
              Reply
            </button>
          )}

          {/*
            Edit and Delete are shown to everyone: the BACKEND authorises them, answering 403 to
            anyone who is neither the author nor (for delete) the video's creator. A client-side
            ownership check would need the viewer's own id on the wire and would still be
            advisory — the refusal below is the real gate.
          */}
          {isViewerSignedIn && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="cursor-pointer text-[11px] text-[#6F7979] hover:text-foreground"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => deleteComment.mutate(comment.commentId)}
            disabled={deleteComment.isPending}
            className="cursor-pointer text-[11px] text-[#6F7979] hover:text-foreground disabled:opacity-50"
          >
            Delete
          </button>
        </div>

        {deleteComment.error !== null && (
          <p role="alert" className="mt-1 text-[11px] text-red-700">
            {describeEngagementError(deleteComment.error).message}
          </p>
        )}

        {isReplyComposerOpen && (
          <CommentComposer
            videoId={videoId}
            parentCommentId={comment.commentId}
            placeholder="Add a reply…"
            onPosted={() => {
              setIsReplyComposerOpen(false);
              // Open the thread so the reply that was just written is visible. Leaving it
              // collapsed reads as "nothing happened".
              setAreRepliesExpanded(true);
            }}
          />
        )}

        {(comment.replyCount > 0 || areRepliesExpanded) && (
          <button
            type="button"
            onClick={() => setAreRepliesExpanded((isExpanded) => !isExpanded)}
            aria-expanded={areRepliesExpanded}
            className="mt-2 flex cursor-pointer flex-row items-center gap-2 text-xs text-[#6F7979] hover:text-foreground"
          >
            <span className="h-px w-6 bg-[#D5DBDB]" />
            {areRepliesExpanded
              ? "Collapse"
              : `Show ${formatCompactCountLabel(comment.replyCount)} ${
                  comment.replyCount === 1 ? "reply" : "replies"
                }`}
          </button>
        )}

        {areRepliesExpanded && (
          <ReplyThread videoId={videoId} parentCommentId={comment.commentId} />
        )}
      </div>
    </li>
  );
}

/**
 * One comment's replies.
 *
 * FETCHED ON EXPAND, NEVER SEEDED. Replies are their own keyset list — the backend serves them
 * OLDEST-first while the top-level thread is newest-first — so they cannot be sliced out of the
 * parent page and there is nothing to seed from the server render. The seed is therefore `null`,
 * which is what makes this list issue its own first request.
 *
 * IT USED TO PASS AN EMPTY PAGE, and that was the bug: an empty seed is data as far as React
 * Query is concerned, so with `staleTime: Infinity` the list never fetched. A reply posted while
 * the thread was collapsed rendered as "No replies yet." — the mutation's `invalidateQueries`
 * had already run against a query that was not mounted yet — and only a SECOND reply, arriving
 * once this component was mounted and active, refetched and revealed both.
 *
 * `parentCommentId` is part of the query key, so two expanded threads never share a cache entry.
 */
function ReplyThread({
  videoId,
  parentCommentId,
}: {
  readonly videoId: string;
  readonly parentCommentId: string;
}) {
  const replies = useVideoCommentsList({
    videoId,
    parentCommentId,
    serverRenderedFirstPage: null,
    limit: REPLIES_PAGE_LIMIT,
  });

  return (
    <div className="mt-2 border-l border-[#D5DBDB] pl-3">
      {replies.isLoadingFirstPage ? (
        <p className="py-2 text-[11px] text-[#6F7979]">Loading replies…</p>
      ) : replies.firstPageErrorMessage !== null ? (
        <p role="alert" className="py-2 text-[11px] text-red-700">
          {replies.firstPageErrorMessage}
        </p>
      ) : replies.rows.length === 0 ? (
        <p className="py-2 text-[11px] text-[#6F7979]">No replies yet.</p>
      ) : (
        <ul>
          {replies.rows.map((reply) => (
            <ReplyItem key={reply.commentId} videoId={videoId} reply={reply} />
          ))}
        </ul>
      )}
      <LoadMoreControl
        hasNextPage={replies.hasNextPage}
        isFetchingNextPage={replies.isFetchingNextPage}
        errorMessage={replies.loadMoreErrorMessage}
        onLoadNextPage={replies.loadNextPage}
        label="Load more replies"
      />
    </div>
  );
}

/**
 * A single reply.
 *
 * NO REPLY BUTTON — threading is one level deep and the backend answers 409 to a reply on a
 * reply. Offering the control and letting the server refuse would be a worse experience than
 * not offering it.
 */
function ReplyItem({ videoId, reply }: { readonly videoId: string; readonly reply: VideoComment }) {
  const [isLiked, setIsLiked] = useState(reply.viewerState.hasLiked);
  const [likeCount, setLikeCount] = useState(reply.likeCount);
  const likeComment = useVideoCommentLikeMutation();
  const deleteComment = useDeleteVideoCommentMutation(videoId);

  if (reply.isDeleted || reply.body === null) {
    return (
      <li className="py-2">
        <p className="text-[11px] text-[#6F7979] italic">[deleted]</p>
      </li>
    );
  }

  const handleLikeClick = () => {
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((previousCount) => previousCount + (nextIsLiked ? 1 : -1));
    likeComment.mutate(
      { commentId: reply.commentId, shouldBeLiked: nextIsLiked },
      {
        onSuccess: (result) => {
          setIsLiked(result.hasLiked);
          setLikeCount(result.likeCount);
        },
        onError: () => {
          setIsLiked(!nextIsLiked);
          setLikeCount((previousCount) => previousCount + (nextIsLiked ? -1 : 1));
        },
      },
    );
  };

  return (
    <li className="flex flex-row gap-2 py-2">
      <Image
        src={reply.author?.imageUrl ?? PLACEHOLDER_AVATAR_SRC}
        width={28}
        height={28}
        alt=""
        className="size-7 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium text-foreground">
          {reply.author?.name ?? "Former member"}
        </span>
        <p className="mt-1 text-xs leading-snug font-medium">{reply.body}</p>
        <RelativeTime
          isoInstant={reply.createdAt}
          className="mt-1 block text-[11px] text-[#6F7979]"
        />
        <div className="mt-2 flex flex-row items-center gap-5">
          <button
            type="button"
            onClick={handleLikeClick}
            aria-pressed={isLiked}
            aria-label="Like reply"
            className="flex cursor-pointer flex-row items-center gap-1.5 text-[11px] text-foreground hover:text-[#6F7979]"
          >
            <Image
              src={`/icons/favorite_24dp_000000_FILL${isLiked ? 1 : 0}_wght400_GRAD0_opsz24.svg`}
              width={14}
              height={14}
              alt=""
            />
            {formatCompactCountLabel(likeCount)}
          </button>
          <button
            type="button"
            onClick={() => deleteComment.mutate(reply.commentId)}
            disabled={deleteComment.isPending}
            className="cursor-pointer text-[11px] text-[#6F7979] hover:text-foreground disabled:opacity-50"
          >
            Delete
          </button>
        </div>
        {deleteComment.error !== null && (
          <p role="alert" className="mt-1 text-[11px] text-red-700">
            {describeEngagementError(deleteComment.error).message}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Inline edit of one's own comment.
 *
 * `PATCH /comments/:commentId` answers a PARTIAL — `{ commentId, body, updatedAt }` — not a
 * whole comment, which is why the hook invalidates the thread rather than patching a row in.
 *
 * NO IDEMPOTENCY KEY: an edit is naturally idempotent (the same body twice is the same body),
 * and the route does not run the idempotency middleware. Only create does.
 */
function CommentEditor({
  videoId,
  commentId,
  initialBody,
  onDone,
}: {
  readonly videoId: string;
  readonly commentId: string;
  readonly initialBody: string;
  readonly onDone: () => void;
}) {
  const [draftBody, setDraftBody] = useState(initialBody);
  const updateComment = useUpdateVideoCommentMutation(videoId);

  const trimmedBody = draftBody.trim();
  const isSubmittable = trimmedBody.length > 0 && trimmedBody.length <= COMMENT_MAX_LENGTH;
  const refusal =
    updateComment.error === null ? null : describeEngagementError(updateComment.error);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isSubmittable || updateComment.isPending) return;
        updateComment.mutate({ commentId, body: trimmedBody }, { onSuccess: onDone });
      }}
      className="mt-1 space-y-2"
    >
      <textarea
        value={draftBody}
        onChange={(event) => setDraftBody(event.target.value)}
        maxLength={COMMENT_MAX_LENGTH}
        rows={2}
        aria-label="Edit comment"
        className="w-full resize-none rounded-lg border border-[#CAC4D0] px-3 py-2 text-xs outline-none focus:border-[#00696E]"
      />
      <div className="flex flex-row items-center gap-3">
        {refusal !== null && (
          <p role="alert" className="flex-1 text-[11px] text-red-700">
            {refusal.message}
          </p>
        )}
        <button
          type="button"
          onClick={onDone}
          className="cursor-pointer text-[11px] text-[#6F7979] hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isSubmittable || updateComment.isPending}
          className="rounded-full bg-[#00696E] px-3 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {updateComment.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
