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
  const replyMutation = useProgramPostMutation(programSlug);
  const reportMutation = useReportProgramContentMutation(programSlug);
  const moderationMutation = useModerateProgramPostMutation(programSlug);

  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ContentReportReason>("spam");
  const [areRepliesExpanded, setAreRepliesExpanded] = useState(false);

  // The feed ships up to three inline replies. The full list is fetched only when expanded, and
  // only when there is more to fetch than what already arrived.
  const hasMoreReplies = post.replyCount > post.replies.length;
  const repliesQuery = usePostRepliesQuery(programSlug, post.postId, {
    isEnabled: areRepliesExpanded && hasMoreReplies,
  });

  const visibleReplies = areRepliesExpanded
    ? (repliesQuery.data?.rows ?? post.replies)
    : post.replies;

  const firstError = [
    reactionMutation.error,
    replyMutation.error,
    reportMutation.error,
    moderationMutation.error,
  ].find((error): error is ApiRequestError => error instanceof ApiRequestError);

  function handleReplySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate(
      { action: "reply", parentPostId: post.postId, bodyText: replyText.trim() },
      {
        onSuccess: () => {
          setReplyText("");
          setIsReplyOpen(false);
        },
      },
    );
  }

  return (
    <li className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 bg-card p-4">
      <div className="flex items-start gap-3">
        {post.author.avatarImageUrl ? (
          <Image
            src={post.author.avatarImageUrl}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00696E]/10 text-xs font-medium text-[#00696E]"
          >
            {post.author.name.slice(0, 1).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-sm font-medium">{post.author.name}</p>
            {/*
              A self-set claim about themselves, never verified and never used for anything —
              see the `user.locationLabel` column comment.
            */}
            {post.author.locationLabel && (
              <span className="text-xs text-muted-foreground">{post.author.locationLabel}</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatIsoInstant(post.createdAt)}
            </span>
            {post.isAuthoredByViewer && (
              <span className="rounded-full bg-[#00696E]/10 px-2 py-0.5 text-[10px] text-[#00696E]">
                You
              </span>
            )}
          </div>

          {post.title && <p className="text-sm font-medium">{post.title}</p>}
          <p
            className={`text-sm ${post.isHidden ? "text-muted-foreground italic" : "text-foreground"}`}
          >
            {post.bodyText}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-12">
        <button
          type="button"
          disabled={!canInteract || reactionMutation.isPending}
          aria-pressed={post.isReactedByViewer}
          onClick={() =>
            reactionMutation.mutate({
              postId: post.postId,
              isReacted: post.isReactedByViewer,
            })
          }
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            post.isReactedByViewer
              ? "border-[#00696E] bg-[#00696E]/10 text-[#00696E]"
              : "border-[#CAC4D0] hover:bg-muted"
          }`}
        >
          {/* An integer, formatted here. The wire carries no "1,203" string. */}
          {post.reactionCount.toLocaleString()}{" "}
          {post.reactionCount === 1 ? "reaction" : "reactions"}
        </button>

        {/* Replies only nest one level, so a reply gets no reply button — the backend answers 409. */}
        {post.depth === 0 && (
          <button
            type="button"
            disabled={!canInteract}
            onClick={() => setIsReplyOpen((isOpen) => !isOpen)}
            className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reply
          </button>
        )}

        {post.replyCount > 0 && (
          <button
            type="button"
            onClick={() => setAreRepliesExpanded((isExpanded) => !isExpanded)}
            className="cursor-pointer text-xs text-[#00696E] underline"
          >
            {areRepliesExpanded
              ? "Hide replies"
              : `Show ${post.replyCount.toLocaleString()} ${post.replyCount === 1 ? "reply" : "replies"}`}
          </button>
        )}

        {canInteract && !post.isAuthoredByViewer && (
          <button
            type="button"
            onClick={() => setIsReportOpen((isOpen) => !isOpen)}
            className="cursor-pointer text-xs text-muted-foreground underline"
          >
            Report
          </button>
        )}

        {canModerate && (
          <button
            type="button"
            disabled={moderationMutation.isPending}
            onClick={() =>
              moderationMutation.mutate({
                postId: post.postId,
                decision: post.isHidden ? "restored" : "hidden",
                reasonNote: post.isHidden ? "Restored by a moderator." : "Hidden by a moderator.",
              })
            }
            className="cursor-pointer rounded-full border border-[#BA1A1A] px-3 py-1 text-xs text-[#BA1A1A] transition-colors hover:bg-[#BA1A1A]/10 disabled:opacity-60"
          >
            {post.isHidden ? "Restore" : "Hide"}
          </button>
        )}
      </div>

      {isReplyOpen && (
        <form onSubmit={handleReplySubmit} className="space-y-2 pl-12">
          <textarea
            required
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            maxLength={10_000}
            rows={2}
            placeholder="Add a reply"
            className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={replyMutation.isPending || !replyText.trim()}
            className="cursor-pointer rounded-full bg-[#00696E] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
          >
            {replyMutation.isPending ? "Posting…" : "Post reply"}
          </button>
        </form>
      )}

      {isReportOpen && (
        <div className="space-y-2 pl-12">
          <label className="block space-y-1 text-xs">
            <span className="font-medium">Why are you reporting this?</span>
            <select
              value={reportReason}
              onChange={(event) => {
                const parsed = ContentReportReasonSchema.safeParse(event.target.value);
                if (parsed.success) setReportReason(parsed.data);
              }}
              className="w-full rounded-lg border border-[#CAC4D0]/60 px-3 py-2 text-sm"
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
                  targetId: post.postId,
                  reason: reportReason,
                  detailText: null,
                },
                { onSuccess: () => setIsReportOpen(false) },
              )
            }
            className="cursor-pointer rounded-full border border-[#CAC4D0] px-4 py-1.5 text-xs disabled:opacity-60"
          >
            {reportMutation.isPending ? "Reporting…" : "Send report"}
          </button>
        </div>
      )}

      {reportMutation.isSuccess && !isReportOpen && (
        <div className="pl-12">
          <MutationAcceptedNotice message="Reported. A moderator will review it." />
        </div>
      )}
      {firstError && (
        <div className="pl-12">
          <MutationErrorNotice error={firstError.apiError} />
        </div>
      )}

      {areRepliesExpanded && visibleReplies.length > 0 && (
        <ul className="space-y-3 border-l border-[#CAC4D0]/60 pl-4">
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
