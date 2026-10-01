// TRANSPORT: client-query — reactions, replies, reports and moderation all call hooks in
// `@/hooks/rnd/research-programs`.
"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import {
  useModerateProgramPostMutation,
  usePostRepliesQuery,
  usePostReactionMutation,
  useProgramPostMutation,
  useReportProgramContentMutation,
} from "@/hooks/rnd/research-programs";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant } from "@/lib/rnd/format";
import {
  CONTENT_REPORT_REASONS,
  ContentReportReasonSchema,
  type ContentReportReason,
  type ResearchPost,
} from "@/lib/rnd/research-programs.schemas";

import { MutationAcceptedNotice, MutationErrorNotice } from "./mutation-feedback";

const REPORT_REASON_LABELS: Record<ContentReportReason, string> = {
  spam: "Spam",
  plagiarism: "Plagiarism",
  misinformation: "Misinformation",
  harassment: "Harassment",
  off_topic: "Off topic",
  other: "Something else",
};

/**
 * One post or idea, with its replies and every control that acts on it.
 *
 * WHAT WAS BROKEN BEFORE: the mock's like and reply buttons had `aria-label`s and **no `onClick`
 * at all** — backend §10 records this. They looked interactive, were focusable, were announced to
 * a screen reader as buttons, and did nothing. That is worse than their absence.
 *
 * THE REACTION IS NOT OPTIMISTIC, and the reason is not caution: `PUT …/reaction` returns the
 * server's count, so there is a correct number available and guessing at one would only be a way
 * to disagree with it.
 */
function ResearchPostAuthorHeader({
  author,
  createdAt,
  isAuthoredByViewer,
  title,
  isHidden,
  bodyText,
}: {
  author: ResearchPost["author"];
  createdAt: string;
  isAuthoredByViewer: boolean;
  title: string | null;
  isHidden: boolean;
  bodyText: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {author.avatarImageUrl ? (
        <Image
          src={author.avatarImageUrl}
          alt=""
          width={36}
          height={36}
          className="size-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-imprint/10 text-xs font-medium text-primary-imprint"
        >
          {author.name.slice(0, 1).toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-sm font-medium">{author.name}</p>
          {author.locationLabel && (
            <span className="text-xs text-muted-foreground">{author.locationLabel}</span>
          )}
          <span className="text-xs text-muted-foreground">{formatIsoInstant(createdAt)}</span>
          {isAuthoredByViewer && (
            <span className="rounded-full bg-primary-imprint/10 px-2 py-0.5 text-xs text-primary-imprint">
              You
            </span>
          )}
        </div>

        {title && <p className="text-sm font-medium">{title}</p>}
        <p className={`text-sm ${isHidden ? "text-muted-foreground italic" : "text-foreground"}`}>
          {bodyText}
        </p>
      </div>
    </div>
  );
}

function ResearchPostReplyForm({
  programSlug,
  parentPostId,
  onClose,
}: {
  programSlug: string;
  parentPostId: string;
  onClose: () => void;
}) {
  const [replyText, setReplyText] = useState("");
  const replyMutation = useProgramPostMutation(programSlug);

  function handleReplySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(
      { action: "reply", parentPostId, bodyText: replyText.trim() },
      {
        onSuccess: () => {
          setReplyText("");
          onClose();
        },
      },
    );
  }

  return (
    <form onSubmit={handleReplySubmit} className="space-y-2 pl-12">
      <textarea
        required
        value={replyText}
        onChange={(event) => setReplyText(event.target.value)}
        maxLength={10_000}
        rows={2}
        aria-label="Add a reply"
        placeholder="Add a reply"
        className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={replyMutation.isPending || !replyText.trim()}
        className="cursor-pointer rounded-full bg-primary-imprint px-4 py-1.5 text-xs font-medium text-primary-imprint-foreground disabled:opacity-60"
      >
        {replyMutation.isPending ? "Posting…" : "Post reply"}
      </button>
      {replyMutation.error instanceof ApiRequestError && (
        <MutationErrorNotice error={replyMutation.error.apiError} />
      )}
    </form>
  );
}

function ResearchPostReportPanel({
  programSlug,
  postId,
  onClose,
}: {
  programSlug: string;
  postId: string;
  onClose: () => void;
}) {
  const [reportReason, setReportReason] = useState<ContentReportReason>("spam");
  const reportMutation = useReportProgramContentMutation(programSlug);

  if (reportMutation.isSuccess) {
    return (
      <div className="pl-12">
        <MutationAcceptedNotice message="Reported. A moderator will review it." />
      </div>
    );
  }

  return (
    <div className="space-y-2 pl-12">
      <label className="block space-y-1 text-xs">
        <span className="font-medium">Why are you reporting this?</span>
        <select
          value={reportReason}
          onChange={(event) => {
            const parsed = ContentReportReasonSchema.safeParse(event.target.value);
            if (parsed.success) setReportReason(parsed.data);
          }}
          className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 text-sm"
        >
          {CONTENT_REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REPORT_REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={reportMutation.isPending}
        onClick={() =>
          reportMutation.mutate(
            {
              targetKind: "post",
              targetId: postId,
              reason: reportReason,
              detailText: null,
            },
            { onSuccess: () => onClose() },
          )
        }
        className="cursor-pointer rounded-full border border-outline-variant px-4 py-1.5 text-xs disabled:opacity-60"
      >
        {reportMutation.isPending ? "Reporting…" : "Send report"}
      </button>
      {reportMutation.error instanceof ApiRequestError && (
        <MutationErrorNotice error={reportMutation.error.apiError} />
      )}
    </div>
  );
}

function ResearchPostActionButtons({
  post,
  canInteract,
  canModerate,
  isReactionPending,
  isModerationPending,
  areRepliesExpanded,
  onToggleReaction,
  onToggleReply,
  onToggleExpandReplies,
  onToggleReport,
  onToggleModerate,
}: {
  post: ResearchPost;
  canInteract: boolean;
  canModerate: boolean;
  isReactionPending: boolean;
  isModerationPending: boolean;
  areRepliesExpanded: boolean;
  onToggleReaction: () => void;
  onToggleReply: () => void;
  onToggleExpandReplies: () => void;
  onToggleReport: () => void;
  onToggleModerate: () => void;
}) {
  const showReplyButton = post.depth === 0;
  const showRepliesToggle = post.replyCount > 0;
  const showReportButton = canInteract && !post.isAuthoredByViewer;

  return (
    <div className="flex flex-wrap items-center gap-2 pl-12">
      <button
        type="button"
        disabled={!canInteract || isReactionPending}
        aria-pressed={post.isReactedByViewer}
        onClick={onToggleReaction}
        className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          post.isReactedByViewer
            ? "border-primary-imprint bg-primary-imprint/10 text-primary-imprint"
            : "border-outline-variant hover:bg-muted"
        }`}
      >
        {post.reactionCount.toLocaleString()} {post.reactionCount === 1 ? "reaction" : "reactions"}
      </button>

      {showReplyButton && (
        <button
          type="button"
          disabled={!canInteract}
          onClick={onToggleReply}
          className="cursor-pointer rounded-full border border-outline-variant px-3 py-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reply
        </button>
      )}

      {showRepliesToggle && (
        <button
          type="button"
          onClick={onToggleExpandReplies}
          className="cursor-pointer text-xs text-primary-imprint underline"
        >
          {areRepliesExpanded
            ? "Hide replies"
            : `Show ${post.replyCount.toLocaleString()} ${post.replyCount === 1 ? "reply" : "replies"}`}
        </button>
      )}

      {showReportButton && (
        <button
          type="button"
          onClick={onToggleReport}
          className="cursor-pointer text-xs text-muted-foreground underline"
        >
          Report
        </button>
      )}

      {canModerate && (
        <button
          type="button"
          disabled={isModerationPending}
          onClick={onToggleModerate}
          className="cursor-pointer rounded-full border border-destructive px-3 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
        >
          {post.isHidden ? "Restore" : "Hide"}
        </button>
      )}
    </div>
  );
}

/**
 * One post or idea, with its replies and every control that acts on it.
 */
export function ResearchPostItem({
  programSlug,
  post,
  canInteract,
  canModerate,
}: {
  programSlug: string;
  post: ResearchPost;
  canInteract: boolean;
  canModerate: boolean;
}) {
  const reactionMutation = usePostReactionMutation(programSlug);
  const moderationMutation = useModerateProgramPostMutation(programSlug);

  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [areRepliesExpanded, setAreRepliesExpanded] = useState(false);

  const hasMoreReplies = post.replyCount > post.replies.length;
  const repliesQuery = usePostRepliesQuery(programSlug, post.postId, {
    isEnabled: areRepliesExpanded && hasMoreReplies,
  });

  const visibleReplies = areRepliesExpanded
    ? (repliesQuery.data?.rows ?? post.replies)
    : post.replies;

  const firstError = [reactionMutation.error, moderationMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  return (
    <li className="space-y-3 rounded-2xl border border-outline-variant/60 bg-card p-4">
      <ResearchPostAuthorHeader
        author={post.author}
        createdAt={post.createdAt}
        isAuthoredByViewer={post.isAuthoredByViewer}
        title={post.title}
        isHidden={post.isHidden}
        bodyText={post.bodyText}
      />

      <ResearchPostActionButtons
        post={post}
        canInteract={canInteract}
        canModerate={canModerate}
        isReactionPending={reactionMutation.isPending}
        isModerationPending={moderationMutation.isPending}
        areRepliesExpanded={areRepliesExpanded}
        onToggleReaction={() =>
          reactionMutation.mutate({
            postId: post.postId,
            isReacted: post.isReactedByViewer,
          })
        }
        onToggleReply={() => setIsReplyOpen((isOpen) => !isOpen)}
        onToggleExpandReplies={() => setAreRepliesExpanded((isExpanded) => !isExpanded)}
        onToggleReport={() => setIsReportOpen((isOpen) => !isOpen)}
        onToggleModerate={() =>
          moderationMutation.mutate({
            postId: post.postId,
            decision: post.isHidden ? "restored" : "hidden",
            reasonNote: post.isHidden ? "Restored by a moderator." : "Hidden by a moderator.",
          })
        }
      />

      {isReplyOpen && (
        <ResearchPostReplyForm
          programSlug={programSlug}
          parentPostId={post.postId}
          onClose={() => setIsReplyOpen(false)}
        />
      )}

      {isReportOpen && (
        <ResearchPostReportPanel
          programSlug={programSlug}
          postId={post.postId}
          onClose={() => setIsReportOpen(false)}
        />
      )}

      {firstError && (
        <div className="pl-12">
          <MutationErrorNotice error={firstError.apiError} />
        </div>
      )}

      {areRepliesExpanded && visibleReplies.length > 0 && (
        <ul className="space-y-3 border-l border-outline-variant/60 pl-4">
          {visibleReplies.map((reply) => (
            <ResearchPostItem
              key={reply.postId}
              programSlug={programSlug}
              post={reply}
              canInteract={canInteract}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
