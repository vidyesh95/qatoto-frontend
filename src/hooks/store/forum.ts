"use client";

// TRANSPORT: client-query — the forum's write surface and the author's own read.
//
// The public thread list and thread detail are server fetches and are deliberately not here — same
// call as `hooks/store/providers.ts` and `hooks/store/factories.ts`. What IS here is everything a
// signed-in reader does to a thread they are looking at, plus `/mine`, which is session-scoped and
// nobody's shareable URL.
//
// NOTHING IS OPTIMISTIC, INCLUDING THE HELPFUL TOGGLE. It is tempting there — a vote feels like
// the canonical optimistic update — but the server owns the count, the viewer's own state comes
// back with it, and a toggle that flips locally and then corrects itself is a UI that lies briefly
// about what other people thought.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  acceptForumReply,
  clearForumAcceptedReply,
  clearForumReplyHelpful,
  createCommunityReport,
  createForumReply,
  createForumThread,
  listOwnForumThreads,
  markForumReplyHelpful,
} from "@/lib/store/forum.api";
import type {
  AcceptForumReplyInput,
  CreateCommunityReportInput,
  CreatedCommunityReport,
  CreatedForumReply,
  CreatedForumThread,
  CreateForumReplyInput,
  CreateForumThreadInput,
  ForumReplyHelpfulState,
  ForumThreadAnswerState,
  ListForumThreadsFilter,
  OwnForumThreadListPage,
} from "@/lib/store/forum.schemas";

export const forumKeys = {
  all: ["forum"] as const,
  mine: (board?: string) => ["forum", "mine", board ?? "all"] as const,
  thread: (threadSlug: string) => ["forum", "thread", threadSlug] as const,
};

/**
 * The author's own threads — including `pending_review`, which appears in no public read.
 *
 * WITHOUT THIS AN AUTHOR NEVER LEARNS WHAT HAPPENED to their thread, because a rejection stays
 * `pending_review` and carries its reason here and nowhere else (§17.3).
 */
export function useOwnForumThreadsQuery(filter: ListForumThreadsFilter = {}) {
  return useQuery<ActionResponse<OwnForumThreadListPage>>({
    queryKey: forumKeys.mine(filter.board),
    queryFn: () => listOwnForumThreads(filter),
    retry: false,
  });
}

/**
 * Queues a new thread for moderation.
 *
 * IT INVALIDATES `/mine` AND NOT THE PUBLIC LIST. A `pending_review` thread appears in no public
 * read, so refetching that list would show the author exactly what they saw before and imply their
 * post had failed — while `/mine` is precisely where the new row does appear.
 *
 * The idempotency key is minted by the composer, once per attempt.
 */
export function useCreateForumThread(): UseMutationResult<
  ActionResponse<CreatedForumThread>,
  Error,
  { readonly input: CreateForumThreadInput; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }) =>
      createForumThread(input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: forumKeys.mine() });
    },
  });
}

/**
 * Appends a reply.
 *
 * REFUSED ON A `locked` THREAD with a tagged error rather than a silent no-op, so the caller must
 * render the refusal instead of clearing the box and letting the author believe they answered
 * somebody.
 *
 * The idempotency key is minted by the composer, once per attempt.
 */
export function useCreateForumReply(): UseMutationResult<
  ActionResponse<CreatedForumReply>,
  Error,
  {
    readonly threadId: string;
    readonly input: CreateForumReplyInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, input, idempotencyKey }) =>
      createForumReply(threadId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
    },
  });
}

/**
 * The thread author marks the answer.
 *
 * ALLOWED ON A `locked` THREAD — locking stops new text, not bookkeeping.
 */
export function useAcceptForumReply(): UseMutationResult<
  ActionResponse<ForumThreadAnswerState>,
  Error,
  { readonly threadId: string; readonly input: AcceptForumReplyInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, input }) => acceptForumReply(threadId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
    },
  });
}

/** Unmarks it. The thread returns to `open` and `acceptedReplyId` to `null`. */
export function useClearForumAcceptedReply(): UseMutationResult<
  ActionResponse<ForumThreadAnswerState>,
  Error,
  { readonly threadId: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId }) => clearForumAcceptedReply(threadId),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
    },
  });
}

/**
 * Endorses a reply, or withdraws the endorsement.
 *
 * ONE HOOK FOR BOTH VERBS because they are one control, and NEITHER CARRIES AN IDEMPOTENCY KEY
 * (A24): setting a boolean twice is setting it once, so they are idempotent by verb and a key
 * would imply the write is riskier than it is.
 *
 * `isHelpful: false` WITHDRAWS AN ENDORSEMENT. It is not a downvote, there is no downvote on the
 * wire, and there must never be one in the UI — a negative signal against a named organization on
 * a commerce platform is a reputational act, and this surface has no appeal process behind it.
 */
export function useSetForumReplyHelpful(): UseMutationResult<
  ActionResponse<ForumReplyHelpfulState>,
  Error,
  { readonly replyId: string; readonly isHelpful: boolean }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, isHelpful }) =>
      isHelpful ? markForumReplyHelpful(replyId) : clearForumReplyHelpful(replyId),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: forumKeys.all });
    },
  });
}

/**
 * Reports a thread or a reply.
 *
 * IT INVALIDATES NOTHING, and here that is correct rather than a gap: a report changes no read
 * this viewer has. The content stays exactly where it was until a moderator decides, and a UI that
 * refetched would be implying otherwise.
 */
export function useCreateCommunityReport(): UseMutationResult<
  ActionResponse<CreatedCommunityReport>,
  Error,
  { readonly input: CreateCommunityReportInput }
> {
  return useMutation({
    mutationFn: ({ input }) => createCommunityReport(input),
  });
}
