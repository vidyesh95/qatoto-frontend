"use client";

// TRANSPORT: client-query — a blueprint's discussion thread, over `@/lib/blueprints/comments.api`.
//
// ⚠️ COMMENT WRITES ARE PENDING, NOT OPTIMISTIC. A like can be flipped and rolled back because the
// only thing at stake is a number; a comment must not APPEAR to have posted when it did not. The
// composer awaits and the thread invalidates.

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { blueprintKeys } from "@/hooks/blueprints/keys";
import { toCursorKeysetPage, useKeysetList, type KeysetListResult } from "@/hooks/keyset-list";
import {
  createBlueprintComment,
  deleteBlueprintComment,
  listBlueprintComments,
  setBlueprintCommentLike,
  updateBlueprintComment,
  type BlueprintCommentArm,
} from "@/lib/blueprints/comments.api";
import type { BlueprintComment } from "@/lib/blueprints/schemas";
import { unwrap } from "@/lib/http";

export function useBlueprintCommentThread(
  arm: BlueprintCommentArm,
  slug: string,
): KeysetListResult<BlueprintComment> {
  return useKeysetList<BlueprintComment>({
    queryKey: blueprintKeys.commentThread(arm, slug),
    // No server-rendered first page: the thread is per-viewer (each row carries `hasLiked`), so a
    // server-seeded page would be somebody else's view of it.
    initialPage: null,
    fetchPage: async (token) => {
      const result = await listBlueprintComments({
        arm,
        slug,
        ...(typeof token === "string" ? { cursor: token } : {}),
      });
      return toCursorKeysetPage(result);
    },
  });
}

export interface CreateBlueprintCommentVariables {
  readonly body: string;
  readonly parentCommentId: string | null;
}

export function useCreateBlueprintCommentMutation(
  arm: BlueprintCommentArm,
  slug: string,
): UseMutationResult<BlueprintComment, Error, CreateBlueprintCommentVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: CreateBlueprintCommentVariables) =>
      unwrap(
        await createBlueprintComment({
          arm,
          slug,
          body: variables.body,
          parentCommentId: variables.parentCommentId,
        }),
      ),
    onSuccess: async () => {
      /*
       * ⚠️ INVALIDATE THE THREAD, DO NOT SPLICE THE ROW IN. A reply belongs under its parent's
       * `replyCount`, which also moved; a top-level comment belongs at the end of a keyset page
       * that may not be loaded. Refetching is cheap and cannot put the row in the wrong place.
       *
       * ⚠️ AND THE DETAIL PAGE'S `commentCount` IS DELIBERATELY NOT TOUCHED. It is server-rendered,
       * and the next read carries it.
       */
      await queryClient.invalidateQueries({ queryKey: blueprintKeys.commentThread(arm, slug) });
    },
  });
}

export function useDeleteBlueprintCommentMutation(
  arm: BlueprintCommentArm,
  slug: string,
): UseMutationResult<{ readonly commentId: string }, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => unwrap(await deleteBlueprintComment(commentId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: blueprintKeys.commentThread(arm, slug) });
    },
  });
}

export interface CommentLikeVariables {
  readonly commentId: string;
  readonly isSet: boolean;
}

/**
 * ⚠️ OPTIMISTIC, UNLIKE THE OTHER TWO. A comment like is the same class of thing as a blueprint
 * like — one number, instantly reversible — so the row flips and settles on the server's count.
 */
export function useBlueprintCommentLikeMutation(): UseMutationResult<
  { readonly isSet: boolean; readonly likeCount: number },
  Error,
  CommentLikeVariables
> {
  return useMutation({
    mutationFn: async (variables: CommentLikeVariables) =>
      unwrap(
        await setBlueprintCommentLike({
          commentId: variables.commentId,
          isSet: variables.isSet,
        }),
      ),
  });
}

export interface UpdateBlueprintCommentVariables {
  readonly commentId: string;
  readonly body: string;
}

export function useUpdateBlueprintCommentMutation(
  arm: BlueprintCommentArm,
  slug: string,
): UseMutationResult<
  { readonly commentId: string; readonly body: string; readonly updatedAt: string },
  Error,
  UpdateBlueprintCommentVariables
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: UpdateBlueprintCommentVariables) =>
      unwrap(await updateBlueprintComment(variables)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: blueprintKeys.commentThread(arm, slug) });
    },
  });
}
