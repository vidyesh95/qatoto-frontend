"use client";

// TRANSPORT: client-query — React Query mutations over `@/lib/feed/api`.
//
// THREE CLASSES OF WRITE, AND THEY BEHAVE DIFFERENTLY ON PURPOSE:
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
//   PREFERENCE   not-interested, creator mute, and the watch-history trio. Pending like the
//                above, but for a different reason: each turns its own control into an UNDO,
//                and an Undo offered for something the server never stored is a second call
//                with nothing to reverse. They also refuse to invalidate the feed — see the
//                block above the watch-history hooks for what that would cost.
//
// MOST authed writes are refused with 403 — not 401 — for a better-auth anonymous session.
// Those callers hold a cookie and a userId, so a 401-only check lets them through and they
// meet a silent no-op. `describeEngagementError` below is the one place that is decided.
//
// The PREFERENCE pair is the exception: the backend lets an anonymous session write both, so
// a 403 from those two is a real domain refusal (self-mute) rather than the account wall.
// `describeEngagementError` still classifies it as `full_account_required`, which is the wrong
// LABEL for that one case but carries the backend's own message verbatim — and the message is
// what every caller renders.

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { feedKeys } from "@/hooks/feed/keys";
import {
  clearWatchHistory,
  createVideoComment,
  deleteVideoComment,
  hideVideoFromWatchHistory,
  likeVideo,
  markVideoNotInterested,
  muteCreator,
  restoreVideoToWatchHistory,
  likeVideoComment,
  recordVideoShare,
  saveVideo,
  subscribeToCreator,
  unlikeVideo,
  unlikeVideoComment,
  unmarkVideoNotInterested,
  unmuteCreator,
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
/* Feed preferences — pending, never optimistic, never invalidating             */
/* -------------------------------------------------------------------------- */

/*
 * A THIRD CLASS OF WRITE, and it differs from both above.
 *
 * NOT OPTIMISTIC, for the reason the watch-history writes are not: the control these back
 * turns into an UNDO once it succeeds, and an Undo offered for a preference the server never
 * stored is a second call that answers "there was nothing to undo" — a state neither the menu
 * nor the server can explain. They wait, then render what came back.
 *
 * NEITHER INVALIDATES THE FEED, and that is the same rule the watch-history block below
 * states at length: `feedKeys.videos` is an infinite query seeded from the server and pinned
 * at `staleTime: Infinity`, so invalidating it refetches page one and DISCARDS every page the
 * reader scrolled through. The dismissed card stays on screen until the next real load, which
 * is why the menu says "we won't recommend this" rather than "removed" — the copy has to
 * describe what actually happened.
 *
 * REACHABLE WITHOUT A FULL ACCOUNT. These are the only engagement writes that are; see the
 * header of `@/lib/feed/api`. A 403 here means self-mute, not the account wall — which is
 * why the caller still runs it through `describeEngagementError` rather than assuming.
 */

/** "Not interested" — hides one video from this viewer's feed. `true` sets, `false` undoes. */
export function useVideoNotInterestedMutation(videoId: string) {
  return useMutation({
    mutationFn: async (shouldBeSet: boolean) =>
      unwrap(
        await (shouldBeSet ? markVideoNotInterested(videoId) : unmarkVideoNotInterested(videoId)),
      ),
  });
}

/** "Don't recommend channel" — hides every video by one creator from this viewer's feed. */
export function useCreatorMuteMutation(creatorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shouldBeSet: boolean) =>
      unwrap(await (shouldBeSet ? muteCreator(creatorId) : unmuteCreator(creatorId))),
    // The ONE invalidation in this block, and it is deliberately NOT the feed. The
    // muted-creators list is a small unpaginated read with no scroll position to lose, and it
    // is the only surface that can lift a mute — leaving it stale would show a channel as
    // still muted right after the viewer unmuted it, on the very screen built to fix that.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedKeys.mutedCreators() });
    },
  });
}

/** Which of the two preference lists a row belongs to. */
export type FeedPreferenceKind = "video" | "creator";

/**
 * Lift one feed preference, given its kind and id — the settings panel's Remove control.
 *
 * WHY IT DOES NOT REUSE THE TWO HOOKS ABOVE. Both of those close over a SINGLE id at call
 * time, which is right for a card menu that concerns exactly one video and one creator. A list
 * has an id per row and does not know them until it renders, so reusing them would mean either
 * a hook call inside a `map` — illegal — or a wrapper component per row whose only job is to
 * hold a hook. Taking the id in `mutate` is what a list actually needs.
 *
 * REMOVE ONLY, never set. The panel is an undo surface; a control that could re-apply a
 * preference from a list of preferences you are trying to clear is a footgun with no use case.
 * That is why the variable is the id rather than a boolean.
 *
 * NOT OPTIMISTIC, matching the card menu: these settle on the server's answer. A row that
 * vanished optimistically and then failed would have to reappear in a list the reader is
 * actively working through, and they would have no way to tell it apart from one they had not
 * reached yet.
 *
 * INVALIDATES ITS OWN LIST AND NOTHING ELSE — specifically NOT the feed. The feed is an
 * infinite query pinned at `staleTime: Infinity`; refetching it would drop every page the
 * reader has scrolled. The lifted preference reaches the feed on its next real load, which is
 * why the panel's copy says what was removed rather than promising the video is back.
 */
export function useRemoveFeedPreferenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: { readonly kind: FeedPreferenceKind; readonly id: string }) =>
      target.kind === "video"
        ? unwrap(await unmarkVideoNotInterested(target.id))
        : unwrap(await unmuteCreator(target.id)),
    onSuccess: (_result, target) => {
      void queryClient.invalidateQueries({
        queryKey:
          target.kind === "video" ? feedKeys.notInterestedVideos() : feedKeys.mutedCreators(),
      });
    },
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

/* -------------------------------------------------------------------------- */
/* Watch history — pending, never optimistic                                    */
/* -------------------------------------------------------------------------- */

/*
 * PENDING, NOT OPTIMISTIC, AND THE REASON IS UNDO RATHER THAN CAUTION.
 *
 * A like that flips early and rolls back has cost the viewer a glance. A removal that flips
 * early offers an Undo control for a removal that never happened — and Undo is a SECOND server
 * call, which would then answer `restoredSessionCount: 0` and leave the card in a state neither
 * the page nor the server can explain. So the card waits for the server, and only then does the
 * "Removed — Undo" row replace it.
 *
 * NONE OF THESE INVALIDATE THE HISTORY LIST. `feedKeys.videos({ mode: "watched" })` is an
 * infinite query seeded from the server with `staleTime: Infinity`; invalidating it refetches
 * page one and DISCARDS every page the reader scrolled through. `<HistoryList>` tracks removed
 * ids in component state and filters its render instead — the cost is that `pagination.total`
 * drifts by the number removed until the next full load, which is a stale count rather than a
 * lost scroll position.
 */

/** Removes one video from the viewer's history. Server-truthful; the caller renders after. */
export function useHideFromWatchHistoryMutation() {
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await hideVideoFromWatchHistory(videoId)),
  });
}

/**
 * Undo for the above.
 *
 * The caller MUST branch on `restoredSessionCount`: zero means the session rows aged past the
 * backend's 90-day prune between the removal and the undo, so the card is gone for good and
 * putting it back would be a lie the next reload corrects.
 */
export function useRestoreToWatchHistoryMutation() {
  return useMutation({
    mutationFn: async (videoId: string) => unwrap(await restoreVideoToWatchHistory(videoId)),
  });
}

/**
 * Clears the whole history.
 *
 * THIS ONE DOES INVALIDATE, and it is the exception that proves the rule above: there is no
 * scroll position worth preserving through an operation whose entire result is an empty list.
 */
export function useClearWatchHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrap(await clearWatchHistory()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedKeys.videosRoot() });
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
