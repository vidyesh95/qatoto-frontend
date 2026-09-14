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
      <p className={`${isReply ? "text-[11px]" : "text-xs"} text-[#6F7979] italic`}>[deleted]</p>
    );
  }

  return (
    <div className="flex gap-2.5">
      <BlueprintAvatar
        displayName={comment.author.displayName}
        avatarUrl={comment.author.avatarUrl}
        sizePx={avatarSizePx}
        className={`${isReply ? "size-5" : "size-6"} mt-0.5`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6F7979]">
          <span className="font-medium text-[#00696E]">
            {comment.author.handle === null
              ? comment.author.displayName
              : `@${comment.author.handle}`}
          </span>
          <span title={formatIsoInstantLabel(comment.createdAt)}>
            <RelativeTime isoInstant={comment.createdAt} />
          </span>
          <span aria-hidden="true">·</span>

          {onToggleLike && isSignedIn ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await onToggleLike(comment.commentId, !comment.viewerState.hasLiked);
                } catch {
                  // Handled by mutation error
                }
              }}
              className={`inline-flex cursor-pointer items-center gap-1 tabular-nums transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E] ${
                comment.viewerState.hasLiked ? "font-medium text-[#BA1A1A]" : "text-[#6F7979]"
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
                className={`size-3 shrink-0 ${comment.viewerState.hasLiked ? "brightness-50 hue-rotate-[-50deg] sepia" : "opacity-55"}`}
              />
              <span aria-hidden="true">{formatCompactCountLabel(comment.likeCount)}</span>
              <span className="sr-only">{formatCountLabel(comment.likeCount)} likes</span>
            </button>
          ) : (
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
          )}

          {!isReply && canComment && onReply && isSignedIn ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setIsReplying((previous) => !previous)}
                className="cursor-pointer text-[11px] font-medium text-[#00696E] hover:underline"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            </>
          ) : null}

          {onUpdateComment ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setIsEditing((previous) => !previous)}
                className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              >
                {isEditing ? "Cancel" : "Edit"}
              </button>
            </>
          ) : null}

          {onDeleteComment ? (
            <>
              <span aria-hidden="true">·</span>
              {isConfirmingDelete ? (
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <span className="font-medium text-destructive">Delete?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setIsActionPending(true);
                        await onDeleteComment(comment.commentId);
                      } finally {
                        setIsActionPending(false);
                        setIsConfirmingDelete(false);
                      }
                    }}
                    disabled={isActionPending}
                    className="cursor-pointer font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    disabled={isActionPending}
                    className="cursor-pointer text-muted-foreground hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="cursor-pointer text-[11px] text-muted-foreground hover:text-destructive hover:underline"
                >
                  Delete
                </button>
              )}
            </>
          ) : null}
        </div>

        {isEditing && onUpdateComment ? (
          <div className="mt-2">
            <BlueprintCommentComposer
              isSignedIn={isSignedIn}
              isPending={isActionPending}
              placeholder="Edit comment"
              initialBody={comment.body}
              submitLabel="Save changes"
              onCancel={() => setIsEditing(false)}
              onSubmit={async (newBody) => {
                try {
                  setIsActionPending(true);
                  await onUpdateComment(comment.commentId, newBody);
                  setIsEditing(false);
                  return null;
                } catch (error: unknown) {
                  return { error };
                } finally {
                  setIsActionPending(false);
                }
              }}
            />
          </div>
        ) : (
          <p className="mt-1 text-sm leading-6 text-foreground">
            <LinkedPlainText text={comment.body} />
          </p>
        )}

        {isReplying && onReply ? (
          <div className="mt-3">
            <BlueprintCommentComposer
              isSignedIn={isSignedIn}
              isPending={isActionPending}
              placeholder={`Reply to @${comment.author.handle ?? comment.author.displayName}…`}
              submitLabel="Post reply"
              onCancel={() => setIsReplying(false)}
              onSubmit={async (replyBody) => {
                try {
                  setIsActionPending(true);
                  await onReply(comment.commentId, replyBody);
                  setIsReplying(false);
                  return null;
                } catch (error: unknown) {
                  return { error };
                } finally {
                  setIsActionPending(false);
                }
              }}
            />
          </div>
        ) : null}
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
    <section id="discussion" className="scroll-mt-20 border-t border-[#CAC4D0]/60 pt-6">
      <h2 className="text-sm font-medium text-foreground">Discussion</h2>

      {threadGroups.length === 0 ? (
        <p className="mt-4 text-sm text-[#6F7979]">No comments yet.</p>
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
                <ul className="mt-3 ml-3 space-y-4 border-l border-[#CAC4D0]/60 pl-4">
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
