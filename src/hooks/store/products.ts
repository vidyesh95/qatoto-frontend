"use client";

// TRANSPORT: client-query — the product page's interactive islands.
//
// THE PAGE ITSELF IS A SERVER FETCH. These hooks exist only for the parts that change after first
// paint: the engagement toggles, the review list's sort and filter, the Q&A list, and the delivery
// estimate the buyer asks for by naming a destination. Everything else on the product page arrives
// with the document.
//
// NOTHING HERE IS OPTIMISTIC. Every engagement write answers the refreshed `engagement` object, so
// the server's own count replaces the cache whole rather than being incremented locally. These are
// small numbers on a public page and a counter that flickers back teaches a buyer that none of the
// numbers are to be trusted.
//
// NO IDEMPOTENCY KEY ON ANY OF THESE. Like and bookmark are `PUT`/`DELETE` of a boolean and are
// idempotent by verb; a key would be ceremony around an operation already safe to repeat. That is
// the same rule the backend applies to review and answer helpful votes.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { storeKeys } from "@/hooks/store/keys";
import type { ActionResponse } from "@/lib/http";
import {
  bookmarkStoreProduct,
  getStoreProductDeliveryEstimate,
  listStoreProductQuestions,
  listStoreProductReviews,
  listStoreQuestionAnswers,
  likeStoreProduct,
  shareStoreProduct,
  unbookmarkStoreProduct,
  unlikeStoreProduct,
} from "@/lib/store/products.api";
import type {
  ProductAnswerListPage,
  ProductDeliveryEstimatePage,
  ProductEngagement,
  ProductQuestionListPage,
  ReviewListFilter,
  StoreReviewListPage,
} from "@/lib/store/products.schemas";

/**
 * A stable cache-key fragment for a review filter.
 *
 * Built from named fields rather than `JSON.stringify` so key order cannot change the key, which
 * would silently split one filter's cache across two entries.
 */
function reviewFilterKey(filter: ReviewListFilter): string {
  return [
    filter.sort ?? "recent",
    filter.rating ?? "any",
    filter.hasMedia === undefined ? "any" : String(filter.hasMedia),
    filter.cursor ?? "first",
  ].join("|");
}

/**
 * The product's engagement counters and the caller's own state.
 *
 * SEEDED FROM THE SERVER RENDER rather than fetched again on mount. The product page already
 * carries `engagement`, and `initialData` is what stops the bar from flashing empty and then
 * filling in — which on a counter reads as the number changing.
 *
 * There is no engagement READ endpoint; the object only ever arrives with the product or as a
 * write's response. So `queryFn` never runs — `staleTime: Infinity` and no refetch triggers keep
 * it that way — and the entry exists purely as the place the toggles write to.
 */
export function useProductEngagement(productSlug: string, initialEngagement: ProductEngagement) {
  return useQuery<ProductEngagement>({
    queryKey: storeKeys.productEngagement(productSlug),
    queryFn: () => Promise.resolve(initialEngagement),
    initialData: initialEngagement,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Writes the server's own returned counters into the cache. Never increments locally. */
function useEngagementWriter(productSlug: string) {
  const queryClient = useQueryClient();
  return (result: ActionResponse<ProductEngagement>) => {
    if (!result.success) return;
    queryClient.setQueryData(storeKeys.productEngagement(productSlug), result.data);
  };
}

/**
 * The like toggle — a public counter, and DELIBERATELY NOT a wishlist write.
 *
 * It invalidates nothing. A like moves `likeCount` on this one product and changes no list
 * anywhere, so the counter write above is the entire cache effect. The asymmetry with the bookmark
 * hook below is the point of the whole feature, not an oversight to tidy up.
 */
export function useToggleProductLiked(
  productSlug: string,
): UseMutationResult<ActionResponse<ProductEngagement>, Error, { readonly isLiked: boolean }> {
  const writeEngagement = useEngagementWriter(productSlug);
  return useMutation({
    mutationFn: ({ isLiked }) =>
      isLiked ? unlikeStoreProduct(productSlug) : likeStoreProduct(productSlug),
    onSuccess: writeEngagement,
  });
}

/**
 * The bookmark toggle — this one DOES change a list, so it invalidates the wishlist.
 *
 * Without the invalidation `/wishlist` shows a stale set until something else refetches it. That
 * was survivable while `useBookmarkedProductsQuery` had no `staleTime` and refetched on mount, but
 * relying on that is relying on an accident: the moment anyone sets a `staleTime` there, a buyer
 * bookmarks a product, opens their wishlist and does not find it.
 */
export function useToggleProductBookmarked(
  productSlug: string,
): UseMutationResult<ActionResponse<ProductEngagement>, Error, { readonly isBookmarked: boolean }> {
  const queryClient = useQueryClient();
  const writeEngagement = useEngagementWriter(productSlug);
  return useMutation({
    mutationFn: ({ isBookmarked }) =>
      isBookmarked ? unbookmarkStoreProduct(productSlug) : bookmarkStoreProduct(productSlug),
    onSuccess: (result) => {
      writeEngagement(result);
      if (!result.success) return;
      void queryClient.invalidateQueries({ queryKey: storeKeys.bookmarkedProducts() });
    },
  });
}

/**
 * Records a share.
 *
 * AN ANONYMOUS SHARE STILL SUCCEEDS AND STILL RETURNS AN UNCHANGED COUNT. The route accepts a
 * signed-out caller — most shares are — and writes the row without moving the counter, because an
 * anonymous session is not a ranking input. That is not an error to surface: the share happened.
 */
export function useRecordProductShare(
  productSlug: string,
): UseMutationResult<ActionResponse<ProductEngagement>, Error, void> {
  const writeEngagement = useEngagementWriter(productSlug);
  return useMutation({
    mutationFn: () => shareStoreProduct(productSlug),
    onSuccess: writeEngagement,
  });
}

/**
 * One page of reviews.
 *
 * `initialPage` seeds the FIRST, UNFILTERED read so the section renders with the document. As soon
 * as the buyer picks a sort or a rating the key changes and a real request goes out — the filtering
 * is the SERVER's, never a re-slice of the page already in hand.
 */
export function useProductReviewsQuery(
  productSlug: string,
  filter: ReviewListFilter,
  initialPage: StoreReviewListPage | null,
) {
  const filterKey = reviewFilterKey(filter);
  const isInitialFilter = filterKey === reviewFilterKey({});
  return useQuery<ActionResponse<StoreReviewListPage>>({
    queryKey: storeKeys.productReviews(productSlug, filterKey),
    queryFn: () => listStoreProductReviews(productSlug, filter),
    ...(isInitialFilter && initialPage !== null
      ? { initialData: { success: true, data: initialPage } as const }
      : {}),
    // A 401 or 403 is an answer, not a flake. Retrying one only delays the explanation.
    retry: false,
  });
}

export function useProductQuestionsQuery(
  productSlug: string,
  initialPage: ProductQuestionListPage | null,
) {
  return useQuery<ActionResponse<ProductQuestionListPage>>({
    queryKey: storeKeys.productQuestions(productSlug),
    queryFn: () => listStoreProductQuestions(productSlug),
    ...(initialPage === null ? {} : { initialData: { success: true, data: initialPage } as const }),
    retry: false,
  });
}

/** Every answer to one question. Fetched only when the buyer opens that question. */
export function useQuestionAnswersQuery(
  productSlug: string,
  questionId: string,
  isEnabled: boolean,
) {
  return useQuery<ActionResponse<ProductAnswerListPage>>({
    queryKey: storeKeys.productQuestionAnswers(productSlug, questionId),
    queryFn: () => listStoreQuestionAnswers(productSlug, questionId),
    enabled: isEnabled && questionId.length > 0,
    retry: false,
  });
}

/**
 * An indicative delivery estimate for a destination the buyer named.
 *
 * NOT FETCHED ON MOUNT. The destination is a required parameter and the browse-country preference
 * is not a trustworthy default for a commercial figure, so this runs when a destination has
 * actually been chosen.
 *
 * AN EMPTY `estimates` ARRAY IS A SUCCESSFUL ANSWER meaning no provider covers the route. It is not
 * an error and it is not free — the caller renders "we cannot estimate this route", never a zero.
 */
export function useProductDeliveryEstimateQuery(
  productSlug: string,
  destinationCountryCode: string | null,
  quantity: number,
) {
  return useQuery<ActionResponse<ProductDeliveryEstimatePage>>({
    queryKey: storeKeys.productDeliveryEstimate(
      productSlug,
      destinationCountryCode ?? "",
      quantity,
    ),
    queryFn: () =>
      getStoreProductDeliveryEstimate(productSlug, {
        destinationCountryCode: destinationCountryCode ?? "",
        quantity,
      }),
    enabled: destinationCountryCode !== null && destinationCountryCode.length > 0,
    retry: false,
  });
}
