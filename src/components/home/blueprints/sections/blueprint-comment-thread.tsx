"use client";

// TRANSPORT: client-rendered discussion thread with interactive like, reply, edit, and delete.

import { useState } from "react";
import Image from "next/image";

import BlueprintAvatar from "@/components/home/blueprints/sections/blueprint-avatar";
import BlueprintCommentComposer from "@/components/home/blueprints/sections/blueprint-comment-composer";
import LinkedPlainText from "@/components/home/shared/linked-plain-text";
import RelativeTime from "@/components/home/shared/relative-time";
import type { BlueprintComment } from "@/lib/blueprints/schemas";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";

interface CommentThreadGroup {
  readonly topLevelComment: BlueprintComment;
  readonly replies: readonly BlueprintComment[];
}

function groupIntoThreads(comments: readonly BlueprintComment[]): CommentThreadGroup[] {
  const groups: { topLevelComment: BlueprintComment; replies: BlueprintComment[] }[] = [];

  for (const comment of comments) {
    if (comment.parentCommentId === null) {
      groups.push({ topLevelComment: comment, replies: [] });
      continue;
    }

    const openGroup = groups.at(-1);
    if (
      openGroup === undefined ||
      openGroup.topLevelComment.commentId !== comment.parentCommentId
    ) {
      continue;
    }
    openGroup.replies.push(comment);
  }

  return groups;
}

interface BlueprintCommentRowProps {
  readonly comment: BlueprintComment;
  readonly isReply?: boolean;
  readonly canComment?: boolean;
  readonly isSignedIn?: boolean;
  readonly onToggleLike?: (commentId: string, isSet: boolean) => Promise<void>;
  readonly onReply?: (parentCommentId: string, body: string) => Promise<void>;
  readonly onDeleteComment?: (commentId: string) => Promise<void>;
  readonly onUpdateComment?: (commentId: string, body: string) => Promise<void>;
}

interface CommentLikeButtonProps {
  comment: BlueprintComment;
  isSignedIn: boolean;
  onToggleLike?: (commentId: string, isSet: boolean) => Promise<void>;
}

function CommentLikeButton({ comment, isSignedIn, onToggleLike }: CommentLikeButtonProps) {
  if (onToggleLike && isSignedIn) {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            await onToggleLike(comment.commentId, !comment.viewerState.hasLiked);
          } catch {
            // Handled by mutation error
          }
        }}
        className={`inline-flex cursor-pointer items-center gap-1 tabular-nums transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint ${
          comment.viewerState.hasLiked ? "font-medium text-destructive" : "text-outline-strong"
        }`}
        aria-label={comment.viewerState.hasLiked ? "Unlike comment" : "Like comment"}
      >
        <Image
          src={
            comment.viewerState.hasLiked
              ? "/icons/favorite_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
              : "/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          }
          alt=""
          width={12}
          height={12}
          className={`size-3 shrink-0 ${comment.viewerState.hasLiked ? "brightness-50 -hue-rotate-60 sepia" : "opacity-55"}`}
        />
        <span aria-hidden="true">{formatCompactCountLabel(comment.likeCount)}</span>
        <span className="sr-only">{formatCountLabel(comment.likeCount)} likes</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Image
        src="/icons/favorite_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
        alt=""
        width={12}
        height={12}
        className="size-3 shrink-0 opacity-55"
      />
      <span aria-hidden="true">{formatCompactCountLabel(comment.likeCount)}</span>
      <span className="sr-only">{formatCountLabel(comment.likeCount)} likes</span>
    </span>
  );
}

interface CommentDeleteControlProps {
  commentId: string;
  isConfirming: boolean;
  isPending: boolean;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onDeleteComment?: (commentId: string) => Promise<void>;
  setIsPending: (pending: boolean) => void;
}

function CommentDeleteControl({
  commentId,
  isConfirming,
  isPending,
  onStartConfirm,
  onCancelConfirm,
  onDeleteComment,
  setIsPending,
}: CommentDeleteControlProps) {
  if (!onDeleteComment) return null;

  return (
    <>
      <span aria-hidden="true">·</span>
      {isConfirming ? (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <span className="font-medium text-destructive">Delete?</span>
          <button
            type="button"
            onClick={() => {
              setIsPending(true);
              return onDeleteComment(commentId).finally(() => {
                setIsPending(false);
                onCancelConfirm();
              });
            }}
            disabled={isPending}
            className="cursor-pointer font-medium text-destructive hover:underline disabled:opacity-50"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={onCancelConfirm}
            disabled={isPending}
            className="cursor-pointer text-muted-foreground hover:underline disabled:opacity-50"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={onStartConfirm}
          className="cursor-pointer text-xs text-muted-foreground hover:text-destructive hover:underline"
        >
          Delete
        </button>
      )}
    </>
  );
}

interface CommentReplyComposerProps {
  comment: BlueprintComment;
  isReplying: boolean;
  isSignedIn: boolean;
  isActionPending: boolean;
  onReply?: (parentCommentId: string, body: string) => Promise<void>;
  onCancel: () => void;
  setIsActionPending: (pending: boolean) => void;
}

function CommentReplyComposer({
  comment,
  isReplying,
  isSignedIn,
  isActionPending,
  onReply,
  onCancel,
  setIsActionPending,
}: CommentReplyComposerProps) {
  if (!isReplying || !onReply) return null;

  const authorHandle = comment.author?.handle ?? comment.author?.displayName ?? "";

  return (
    <div className="mt-3">
      <BlueprintCommentComposer
        isSignedIn={isSignedIn}
        isPending={isActionPending}
        placeholder={`Reply to @${authorHandle}…`}
        submitLabel="Post reply"
        onCancel={onCancel}
        onSubmit={(replyBody) => {
          setIsActionPending(true);
          return onReply(comment.commentId, replyBody)
            .then(
              () => {
                onCancel();
                return null;
              },
              (error: unknown) => ({ error }),
            )
            .finally(() => setIsActionPending(false));
        }}
      />
    </div>
  );
}

interface CommentReplyButtonProps {
  isReply: boolean;
  canComment: boolean;
  onReply?: (parentCommentId: string, body: string) => Promise<void>;
  isSignedIn: boolean;
  isReplying: boolean;
  onToggleReplying: () => void;
}

function CommentReplyButton({
  isReply,
  canComment,
  onReply,
  isSignedIn,
  isReplying,
  onToggleReplying,
}: CommentReplyButtonProps) {
  if (isReply || !canComment || !onReply || !isSignedIn) return null;
  return (
    <>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={onToggleReplying}
        className="cursor-pointer text-xs font-medium text-primary-imprint hover:underline"
      >
        {isReplying ? "Cancel" : "Reply"}
      </button>
    </>
  );
}

function CommentEditButton({
  onUpdateComment,
  isEditing,
  onToggleEditing,
}: {
  onUpdateComment?: (commentId: string, body: string) => Promise<void>;
  isEditing: boolean;
  onToggleEditing: () => void;
}) {
  if (!onUpdateComment) return null;
  return (
    <>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={onToggleEditing}
        className="cursor-pointer text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {isEditing ? "Cancel" : "Edit"}
      </button>
    </>
  );
}

interface CommentInlineEditorProps {
  comment: BlueprintComment;
  isEditing: boolean;
  isSignedIn: boolean;
  isActionPending: boolean;
  onUpdateComment?: (commentId: string, body: string) => Promise<void>;
  onCancel: () => void;
  setIsActionPending: (pending: boolean) => void;
}

function CommentInlineEditor({
  comment,
  isEditing,
  isSignedIn,
  isActionPending,
  onUpdateComment,
  onCancel,
  setIsActionPending,
}: CommentInlineEditorProps) {
  if (isEditing && onUpdateComment && comment.body !== null) {
    return (
      <div className="mt-2">
        <BlueprintCommentComposer
          isSignedIn={isSignedIn}
          isPending={isActionPending}
          placeholder="Edit comment"
          initialBody={comment.body}
          submitLabel="Save changes"
          onCancel={onCancel}
          onSubmit={(newBody) => {
            setIsActionPending(true);
            return onUpdateComment(comment.commentId, newBody)
              .then(
                () => {
                  onCancel();
                  return null;
                },
                (error: unknown) => ({ error }),
              )
              .finally(() => setIsActionPending(false));
          }}
        />
      </div>
    );
  }

  return (
    <p className="mt-1 text-sm leading-6 text-foreground">
      <LinkedPlainText text={comment.body ?? ""} />
    </p>
  );
}

function BlueprintCommentRow({
  comment,
  isReply = false,
  canComment = true,
  isSignedIn = false,
  onToggleLike,
  onReply,
  onDeleteComment,
  onUpdateComment,
}: BlueprintCommentRowProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const avatarSizePx = isReply ? 20 : 24;

  if (comment.body === null || comment.author === null) {
    return (
      <p className={`${isReply ? "text-xs" : "text-xs"} text-outline-strong italic`}>[deleted]</p>
    );
  }

  const authorHandle =
    comment.author.handle === null ? comment.author.displayName : `@${comment.author.handle}`;

  return (
    <div className="flex gap-2.5">
      <BlueprintAvatar
        displayName={comment.author.displayName}
        avatarUrl={comment.author.avatarUrl}
        sizePx={avatarSizePx}
        className={`${isReply ? "size-5" : "size-6"} mt-0.5`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-outline-strong">
          <span className="font-medium text-primary-imprint">{authorHandle}</span>
          <span title={formatIsoInstantLabel(comment.createdAt)}>
            <RelativeTime isoInstant={comment.createdAt} />
          </span>
          <span aria-hidden="true">·</span>

          <CommentLikeButton
            comment={comment}
            isSignedIn={isSignedIn}
            onToggleLike={onToggleLike}
          />

          <CommentReplyButton
            isReply={isReply}
            canComment={canComment}
            onReply={onReply}
            isSignedIn={isSignedIn}
            isReplying={isReplying}
            onToggleReplying={() => setIsReplying((previous) => !previous)}
          />

          <CommentEditButton
            onUpdateComment={onUpdateComment}
            isEditing={isEditing}
            onToggleEditing={() => setIsEditing((previous) => !previous)}
          />

          <CommentDeleteControl
            commentId={comment.commentId}
            isConfirming={isConfirmingDelete}
            isPending={isActionPending}
            onStartConfirm={() => setIsConfirmingDelete(true)}
            onCancelConfirm={() => setIsConfirmingDelete(false)}
            onDeleteComment={onDeleteComment}
            setIsPending={setIsActionPending}
          />
        </div>

        <CommentInlineEditor
          comment={comment}
          isEditing={isEditing}
          isSignedIn={isSignedIn}
          isActionPending={isActionPending}
          onUpdateComment={onUpdateComment}
          onCancel={() => setIsEditing(false)}
          setIsActionPending={setIsActionPending}
        />

        <CommentReplyComposer
          comment={comment}
          isReplying={isReplying}
          isSignedIn={isSignedIn}
          isActionPending={isActionPending}
          onReply={onReply}
          onCancel={() => setIsReplying(false)}
          setIsActionPending={setIsActionPending}
        />
      </div>
    </div>
  );
}

export default function BlueprintCommentThread({
  comments,
  canComment = true,
  isSignedIn = false,
  onToggleLike,
  onReply,
  onDeleteComment,
  onUpdateComment,
}: {
  readonly comments: readonly BlueprintComment[];
  readonly canComment?: boolean;
  readonly isSignedIn?: boolean;
  readonly onToggleLike?: (commentId: string, isSet: boolean) => Promise<void>;
  readonly onReply?: (parentCommentId: string, body: string) => Promise<void>;
  readonly onDeleteComment?: (commentId: string) => Promise<void>;
  readonly onUpdateComment?: (commentId: string, body: string) => Promise<void>;
}) {
  const threadGroups = groupIntoThreads(comments);

  return (
    <section id="discussion" className="scroll-mt-20 border-t border-outline-variant/60 pt-6">
      <h2 className="text-sm font-medium text-foreground">Discussion</h2>

      {threadGroups.length === 0 ? (
        <p className="mt-4 text-sm text-outline-strong">No comments yet.</p>
      ) : (
        <ul className="mt-5 space-y-6">
          {threadGroups.map((group) => (
            <li key={group.topLevelComment.commentId}>
              <BlueprintCommentRow
                comment={group.topLevelComment}
                canComment={canComment}
                isSignedIn={isSignedIn}
                onToggleLike={onToggleLike}
                onReply={onReply}
                onDeleteComment={onDeleteComment}
                onUpdateComment={onUpdateComment}
              />
              {group.replies.length === 0 ? null : (
                <ul className="mt-3 ml-3 space-y-4 border-l border-outline-variant/60 pl-4">
                  {group.replies.map((reply) => (
                    <li key={reply.commentId}>
                      <BlueprintCommentRow
                        comment={reply}
                        isReply
                        canComment={canComment}
                        isSignedIn={isSignedIn}
                        onToggleLike={onToggleLike}
                        onDeleteComment={onDeleteComment}
                        onUpdateComment={onUpdateComment}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
