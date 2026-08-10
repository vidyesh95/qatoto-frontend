"use client";

// TRANSPORT: client-query — the community moderation console.
//
// THREE QUEUES, ONE CAPABILITY. Forum threads, content reports and cofounder profiles are all
// gated by `moderate_content`, so `isEnabled` is threaded from the capability check on every query
// and no speculative 403 fires. `retry: false` throughout: a 403 is an answer, not a flake.
//
// NOTHING IS OPTIMISTIC. A moderation decision is a statement the platform makes about somebody
// else's writing; showing it as applied before the server agrees is the one place a rollback is
// genuinely embarrassing.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type { ActionResponse } from "@/lib/http";
import {
  dismissCommunityContentReport,
  listAdminCofounderProfiles,
  listAdminForumThreads,
  listCommunityContentReports,
  moderateCofounderProfile,
  moderateForumReply,
  moderateForumThread,
} from "@/lib/store/admin-community.api";
import type {
  AdminCofounderProfileQueuePage,
  ListAdminCofounderProfilesFilter,
  ModerateCofounderProfileInput,
} from "@/lib/store/cofounders.schemas";
import type {
  AdminForumThreadQueuePage,
  CommunityContentReportQueuePage,
  DismissCommunityContentReportInput,
  ListAdminForumThreadsFilter,
  ListCommunityContentReportsFilter,
  ModerateForumReplyInput,
  ModerateForumThreadInput,
} from "@/lib/store/forum.schemas";

export const communityModerationKeys = {
  all: ["community-moderation"] as const,
  forumThreads: (state?: string) =>
    ["community-moderation", "forum-threads", state ?? "all"] as const,
  contentReports: (state?: string) =>
    ["community-moderation", "content-reports", state ?? "all"] as const,
  cofounderProfiles: (state?: string) =>
    ["community-moderation", "cofounder-profiles", state ?? "all"] as const,
};

// --- Forum threads -----------------------------------------------------------

export function useAdminForumThreadsQuery(
  isEnabled: boolean,
  filter: ListAdminForumThreadsFilter = {},
) {
  return useQuery<ActionResponse<AdminForumThreadQueuePage>>({
    queryKey: communityModerationKeys.forumThreads(filter.state),
    queryFn: () => listAdminForumThreads(filter),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Publish, reject, lock or unlock.
 *
 * `reject` IS NOT A DELETE. It leaves the thread `pending_review` with the moderator's note
 * attached — invisible in every public read, readable by its author on `/mine`. The console's copy
 * has to say that, because a moderator who believes they deleted something will be surprised later.
 */
export function useModerateForumThreadMutation(): UseMutationResult<
  ActionResponse<AdminForumThreadQueuePage>,
  Error,
  { readonly threadId: string; readonly input: ModerateForumThreadInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, input }) => moderateForumThread(threadId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: communityModerationKeys.all });
    },
  });
}

/** Hide a reply or restore it. Never a delete — the reply keeps its place in the thread. */
export function useModerateForumReplyMutation(): UseMutationResult<
  ActionResponse<AdminForumThreadQueuePage>,
  Error,
  { readonly replyId: string; readonly input: ModerateForumReplyInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ replyId, input }) => moderateForumReply(replyId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: communityModerationKeys.all });
    },
  });
}

// --- Content reports ---------------------------------------------------------

export function useCommunityContentReportsQuery(
  isEnabled: boolean,
  filter: ListCommunityContentReportsFilter = {},
) {
  return useQuery<ActionResponse<CommunityContentReportQueuePage>>({
    queryKey: communityModerationKeys.contentReports(filter.state),
    queryFn: () => listCommunityContentReports(filter),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Dismisses a report.
 *
 * DISMISSAL IS THE ONLY DECISION THIS ROUTE MAKES. Acting on the reported content is a separate
 * moderate call, deliberately: a report is a claim about content, and closing the claim is not the
 * same act as removing the text. Two calls keep the audit trail able to say which one happened.
 */
export function useDismissCommunityContentReportMutation(): UseMutationResult<
  ActionResponse<CommunityContentReportQueuePage>,
  Error,
  { readonly reportId: string; readonly input: DismissCommunityContentReportInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, input }) => dismissCommunityContentReport(reportId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: communityModerationKeys.all });
    },
  });
}

// --- Cofounder profiles ------------------------------------------------------

export function useAdminCofounderProfilesQuery(
  isEnabled: boolean,
  filter: ListAdminCofounderProfilesFilter = {},
) {
  return useQuery<ActionResponse<AdminCofounderProfileQueuePage>>({
    queryKey: communityModerationKeys.cofounderProfiles(filter.state),
    queryFn: () => listAdminCofounderProfiles(filter),
    enabled: isEnabled,
    retry: false,
  });
}

/**
 * Publish or reject a profile.
 *
 * REJECTING RETURNS IT TO `draft` with the note attached, unlike a forum thread. A profile is meant
 * to be revised — its owner acts on the note and submits again — where a rejected question is
 * simply not one this board will carry.
 */
export function useModerateCofounderProfileMutation(): UseMutationResult<
  ActionResponse<AdminCofounderProfileQueuePage>,
  Error,
  { readonly profileId: string; readonly input: ModerateCofounderProfileInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, input }) => moderateCofounderProfile(profileId, input),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: communityModerationKeys.all });
    },
  });
}
