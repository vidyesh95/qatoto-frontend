"use client";

// TRANSPORT: client-query — React Query hooks over review authoring.
//
// NOTHING IS OPTIMISTIC. A review is a published statement about a counterparty and a photo is
// evidence attached to it; showing either before the server agreed would be claiming something
// exists that may not.
//
// NO KEY IS MINTED HERE. Every write below requires an `Idempotency-Key` and it belongs in component
// state, once per attempt — the same rule checkout and the quote composer follow.
//
// THERE IS NO AUTHOR-FACING READ OF A REVIEW, and that shapes what these hooks can offer. The trust
// router has exactly five GETs — completions, three dispute reads and the SELLER's review inbox — so
// an author cannot re-read their own review or its media after leaving the page. The write responses
// are the only source of that data, which is why the media hooks return rows for the caller to hold
// rather than filling a cache anyone else could read.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { useKeysetList, toCursorKeysetPage } from "@/hooks/keyset-list";
import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  attachReviewPhoto,
  attachReviewVideo,
  clearReviewHelpfulVote,
  createReview,
  detachReviewMedia,
  editOwnReview,
  getOwnReview,
  listBuyerCompletions,
  listSellerReviewInbox,
  markReviewHelpful,
  upsertReviewReply,
  withdrawReviewReply,
} from "@/lib/store/reviews.api";
import type {
  AttachReviewVideoInput,
  AuthoredReview,
  AuthoredReviewMedia,
  BuyerCompletion,
  CreateReviewInput,
  DetachedReviewMedia,
  EditOwnReviewInput,
  ListBuyerCompletionsFilter,
  ReviewHelpfulVote,
  ReviewReply,
  SellerReviewInboxFilter,
  UpsertReviewReplyInput,
  WithdrawnReviewReply,
} from "@/lib/store/reviews.schemas";

/**
 * The completions this buyer may review, keyset-paginated.
 *
 * `reviewable` IS PART OF THE KEY because the backend filters in SQL and pages the result — two
 * filters are two different paginations, and sharing one cache entry would splice pages from
 * different result sets together.
 */
export function useBuyerCompletionsList(filter: ListBuyerCompletionsFilter = {}) {
  return useKeysetList<BuyerCompletion>({
    queryKey: storeKeys.buyerCompletionList(filter.reviewable),
    initialPage: null,
    fetchPage: async (token) =>
      toCursorKeysetPage(
        await listBuyerCompletions({
          ...filter,
          ...(token === null ? {} : { cursor: String(token) }),
        }),
      ),
  });
}

/**
 * Writes a review against one completion.
 *
 * Invalidates BOTH completion lists: the row this was written against is no longer reviewable, and
 * `hasReview` is what says so.
 */
export function useCreateReview(): UseMutationResult<
  ActionResponse<AuthoredReview>,
  Error,
  {
    readonly completionId: string;
    readonly input: CreateReviewInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ completionId, input, idempotencyKey }) =>
      createReview(completionId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.buyerCompletionList(true) });
      void queryClient.invalidateQueries({ queryKey: storeKeys.buyerCompletionList(undefined) });
    },
  });
}

/**
 * Spends the author's one edit.
 *
 * INVALIDATES NOTHING BY ITSELF. The completion lists carry `hasReview`, which an edit does not
 * change, and there is no author-facing review read to refresh. The caller holds the returned row.
 */
export function useEditOwnReview(): UseMutationResult<
  ActionResponse<AuthoredReview>,
  Error,
  {
    readonly reviewId: string;
    readonly input: EditOwnReviewInput;
    readonly idempotencyKey: string;
  }
> {
  return useMutation({
    mutationFn: ({ reviewId, input, idempotencyKey }) =>
      editOwnReview(reviewId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
  });
}

export function useAttachReviewPhoto(): UseMutationResult<
  ActionResponse<AuthoredReviewMedia>,
  Error,
  { readonly reviewId: string; readonly imageFile: File; readonly idempotencyKey: string }
> {
  return useMutation({
    mutationFn: ({ reviewId, imageFile, idempotencyKey }) =>
      attachReviewPhoto(reviewId, imageFile, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

export function useAttachReviewVideo(): UseMutationResult<
  ActionResponse<AuthoredReviewMedia>,
  Error,
  {
    readonly reviewId: string;
    readonly input: AttachReviewVideoInput;
    readonly idempotencyKey: string;
  }
> {
  return useMutation({
    mutationFn: ({ reviewId, input, idempotencyKey }) =>
      attachReviewVideo(reviewId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
  });
}

export function useDetachReviewMedia(): UseMutationResult<
  ActionResponse<DetachedReviewMedia>,
  Error,
  { readonly reviewId: string; readonly mediaId: string; readonly idempotencyKey: string }
> {
  return useMutation({
    mutationFn: ({ reviewId, mediaId, idempotencyKey }) =>
      detachReviewMedia(reviewId, mediaId, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  });
}

/**
 * One review the caller wrote, with its media.
 *
 * GATED ON A NON-EMPTY ID, like every other dependent read in this app: a first render with `""`
 * would fetch `/commerce/reviews/` and cache a 404 under the empty key.
 */
export function useOwnReviewQuery(reviewId: string) {
  return useQuery({
    queryKey: storeKeys.ownReview(reviewId),
    queryFn: () => getOwnReview(reviewId),
    enabled: reviewId.length > 0,
  });
}

/** Reviews written about the caller's organization. */
export function useSellerReviewInboxQuery(filter: SellerReviewInboxFilter = {}) {
  return useQuery({
    queryKey: storeKeys.sellerReviewInbox(JSON.stringify(filter)),
    queryFn: () => listSellerReviewInbox(filter),
  });
}

/**
 * Marks a review helpful, or withdraws the vote.
 *
 * ONE HOOK FOR BOTH DIRECTIONS, because both routes answer the same projection and the caller always
 * knows which way it is going. NO IDEMPOTENCY KEY — PUT and DELETE of a boolean are idempotent by
 * verb, which is why the routes carry no such middleware.
 *
 * Invalidates the PRODUCT REVIEWS PREFIX rather than one filter key: a vote changes `helpfulCount`,
 * and "Most helpful" is a server-side sort, so every cached filter of that product is now suspect.
 */
export function useSetReviewHelpfulVote(): UseMutationResult<
  ActionResponse<ReviewHelpfulVote>,
  Error,
  { readonly reviewId: string; readonly productSlug: string; readonly isHelpful: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, isHelpful }) =>
      isHelpful ? markReviewHelpful(reviewId) : clearReviewHelpfulVote(reviewId),
    onSuccess: (result, { productSlug }) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({
        queryKey: ["store", "products", productSlug, "reviews"],
      });
    },
  });
}

/**
 * Writes or revises the seller's reply.
 *
 * The caller must be ready for a 409 it cannot pre-empt: the reply may be revised once only, and
 * only within 30 days of being posted, and `editedAt` is not on the wire — so the server's sentence
 * is the authority rather than a local guess.
 */
export function useUpsertReviewReply(): UseMutationResult<
  ActionResponse<ReviewReply>,
  Error,
  {
    readonly reviewId: string;
    readonly input: UpsertReviewReplyInput;
    readonly idempotencyKey: string;
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, input, idempotencyKey }) =>
      upsertReviewReply(reviewId, input, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.sellerReviewInboxRoot() });
    },
  });
}

/** Withdraws the reply. Withdrawing one that does not exist is not an error. */
export function useWithdrawReviewReply(): UseMutationResult<
  ActionResponse<WithdrawnReviewReply>,
  Error,
  { readonly reviewId: string; readonly idempotencyKey: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, idempotencyKey }) =>
      withdrawReviewReply(reviewId, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (result) => {
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.sellerReviewInboxRoot() });
    },
  });
}
