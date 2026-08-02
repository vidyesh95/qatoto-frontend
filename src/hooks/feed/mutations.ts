"use client";

// TRANSPORT: client-query — React Query mutations over `@/lib/feed/api`.
//
// TWO CLASSES OF WRITE, AND THEY BEHAVE DIFFERENTLY ON PURPOSE:
//
//   OPTIMISTIC   like, save, comment-like. Cheap, idempotent server-side (each has a per-user
//                unique key), and visually instant. Rolling one back on failure costs nothing
//                because nothing was authored.
//
//   PENDING      subscribe, comment create/edit/delete, share. A comment is a piece of writing
//                that must NOT appear to have posted when it did not; a subscription is a
//                relationship; a share count is a ranking input the server may decline to move
//                for an anonymous sharer. These wait for the server and render its answer.
//
// Every authed write is refused with 403 — not 401 — for a better-auth anonymous session.
// Those callers hold a cookie and a userId, so a 401-only check lets them through and they
// meet a silent no-op. `describeEngagementError` below is the one place that is decided.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { feedKeys } from "@/hooks/feed/keys";
import {
  createVideoComment,
  deleteVideoComment,
  likeVideo,
  likeVideoComment,
  recordVideoShare,
  saveVideo,
  subscribeToCreator,
  unlikeVideo,
  unlikeVideoComment,
  unsaveVideo,
  unsubscribeFromCreator,
  updateVideoComment,
  type CreateVideoCommentInput,
} from "@/lib/feed/api";
import type { ShareChannel } from "@/lib/feed/schemas";
import { isForbidden, isUnauthorized, unwrap, ApiRequestError } from "@/lib/http";

/** What a failed engagement write means for THIS viewer, as UI copy. */
export type EngagementRefusal =
  | { readonly kind: "sign_in_required"; readonly message: string }
  | { readonly kind: "full_account_required"; readonly message: string }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Classifies a mutation error into the three affordances that differ.
 *
 * 401 and 403 are NOT interchangeable here. A signed-out viewer needs a sign-in control; an
 * anonymous-session viewer is already "signed in" as far as the cookie is concerned and needs
 * a finish-signing-up control instead — offering them sign-in is a loop with no exit. Anything
 * else keeps the backend's own message verbatim rather than a generic apology, because a 409
 * on this surface usually says something specific and true.
 */
export function describeEngagementError(error: unknown): EngagementRefusal {
  if (!(error instanceof ApiRequestError)) {
    return { kind: "failed", message: "Something went wrong. Please try again." };
  }
  if (isUnauthorized(error.apiError)) {
    return { kind: "sign_in_required", message: "Sign in to do that." };
  }
  if (isForbidden(error.apiError)) {
    return { kind: "full_account_required", message: error.apiError.message };
  }
  return { kind: "failed", message: error.apiError.message };
}

/* -------------------------------------------------------------------------- */
/* Video like / save — optimistic                                               */
/* -------------------------------------------------------------------------- */

/**
 * Toggles a like and reports the server's count.
 *
 * The caller holds the displayed state and flips it before this resolves; the mutation returns
 * the authoritative `{ hasLiked, likeCount }` so the caller can settle on it. Deliberately NOT
 * writing into the feed query cache: the feed list is seeded from the server and pinned with
 * `staleTime: Infinity`, and surgically patching one row of one page of an infinite list is
 * how a cache and a screen quietly disagree. The count the viewer just changed is theirs to
 * render; the next server read carries it for everyone.
 */
export function useVideoLikeMutation(videoId: string) {
  return useMutation({
    mutationFn: async (shouldBeLiked: boolean) =>
      unwrap(await (shouldBeLiked ? likeVideo(videoId) : unlikeVideo(videoId))),
  });
}

/** Watch-later. Same shape and same reasoning as like. */
export function useVideoSaveMutation(videoId: string) {
  return useMutation({
    mutationFn: async (shouldBeSaved: boolean) =>
      unwrap(await (shouldBeSaved ? saveVideo(videoId) : unsaveVideo(videoId))),
  });
}

/* -------------------------------------------------------------------------- */
/* Share                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Records a share.
 *
 * NOT optimistic, and the count is not incremented locally: `videoStats.shareCount` moves only
 * for a signed-in sharer, because share count feeds the quality score's engagement rate and
 * anonymous traffic must not move a ranking input. So the honest render is whatever the server
 * answers, which for an anonymous sharer is the unchanged number.
 */
export function useVideoShareMutation(videoId: string) {
  return useMutation({
    mutationFn: async (channel: ShareChannel) => unwrap(await recordVideoShare(videoId, channel)),
  });
}

/* -------------------------------------------------------------------------- */
/* Subscribe — pending, never optimistic                                        */
/* -------------------------------------------------------------------------- */

/**
 * Subscribe / unsubscribe.
 *
 * A relationship, not a tap: showing "Subscribed" before the server agrees means a viewer who
 * lost their connection believes they are following a creator they are not, and finds out
 * weeks later by not being notified. Waits, then renders `{ isSubscribed, subscriberCount }`.
 *
 * Subscribing to your own channel is a 403 with its own message — surface it rather than
 * hiding the control, since the button is reachable from a creator's own watch page.
 */
export function useCreatorSubscriptionMutation(creatorId: string) {
  return useMutation({
    mutationFn: async (shouldBeSubscribed: boolean) =>
      unwrap(
        await (shouldBeSubscribed
          ? subscribeToCreator(creatorId)
          : unsubscribeFromCreator(creatorId)),
      ),
  });
}

/* -------------------------------------------------------------------------- */
/* Comments — pending, never optimistic                                         */
/* -------------------------------------------------------------------------- */

/**
 * Posts a comment.
 *
 * `idempotencyKey` is a MUTATION VARIABLE, not something this hook mints. The key must be
 * stable across every retry of one attempt, and a hook body re-runs on every render — minting
 * it here would hand each retry a fresh key and defeat the mechanism entirely. The component
 * holds it in `useState(newIdempotencyKey)` and regenerates only after a success.
 *
 * Invalidates the thread on success so the new comment arrives in server order rather than
 * being spliced in at a guessed position.
 */
export function useCreateVideoCommentMutation(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVideoCommentInput) =>
      unwrap(await createVideoComment(videoId, input)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedKeys.commentsRoot(videoId) });
    },
  });
}

/** Edits one's own comment. Answers a partial — `{ commentId, body, updatedAt }`. */
export function useUpdateVideoCommentMutation(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { readonly commentId: string; readonly body: string }) =>
      unwrap(await updateVideoComment(variables.commentId, variables.body)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedKeys.commentsRoot(videoId) });
    },
  });
}

/**
 * Deletes a comment — author, or the video's creator.
 *
 * A TOMBSTONE. The row survives with `body: null` and `author: null` so its replies keep their
 * anchor, which is why this invalidates rather than removing the node from the list: dropping
 * it client-side would orphan replies the server still returns.
 */
export function useDeleteVideoCommentMutation(videoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => unwrap(await deleteVideoComment(commentId)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedKeys.commentsRoot(videoId) });
    },
  });
}

/** Comment like — optimistic, same class as a video like. */
export function useVideoCommentLikeMutation() {
  return useMutation({
    mutationFn: async (variables: {
      readonly commentId: string;
      readonly shouldBeLiked: boolean;
    }) =>
      unwrap(
        await (variables.shouldBeLiked
          ? likeVideoComment(variables.commentId)
          : unlikeVideoComment(variables.commentId)),
      ),
  });
}
