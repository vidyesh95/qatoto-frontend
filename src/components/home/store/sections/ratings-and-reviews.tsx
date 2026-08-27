// TRANSPORT: client-query — the first page is seeded from the server; sorting and filtering refetch.
//
// THE SORT AND FILTER CHIPS ARE SERVER READS, NOT A CLIENT RE-SLICE. Re-slicing the page already in
// hand would make every chip lie about anything past the first twelve rows. So a chip changes the
// query key and a new request goes out.
//
// `summary` IS COMPUTED OVER EVERY VISIBLE REVIEW IN SCOPE, never over the filtered subset. That is
// what keeps the chips' own counts from renumbering as you click them and leaving no way back to
// the full picture — the histogram a buyer filters BY must not be the histogram the filter changed.
//
// `viewer` IS NULL FOR A CALLER WITH NO ACTIVE ORGANIZATION, and not `{hasVotedHelpful: false}`.
// The vote table is keyed on the organization, so null is also the honest answer about what the
// caller MAY do — the helpful control renders unpressable rather than un-pressed.
//
// A REVIEW REQUIRES A COMPLETED ORDER. "Rate product" is not a control this page can offer on its
// own: writing one needs a `completionId` from `GET /commerce/completions`, which is a
// buyer-scoped read. Verified purchase is structural here rather than a badge.
"use client";

import { useState } from "react";

import { useSetReviewHelpfulVote } from "@/hooks/store/reviews";

import Image from "next/image";

import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import { useProductReviewsQuery } from "@/hooks/store/products";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  REVIEW_SORTS,
  REVIEW_SORT_LABELS,
  type ReviewListFilter,
  type ReviewSort,
  type StoreReview,
  type StoreReviewListPage,
} from "@/lib/store/products.schemas";

const RATING_VALUES = [5, 4, 3, 2, 1] as const;

export default function RatingsAndReviews({
  productSlug,
  initialPage,
}: {
  readonly productSlug: string;
  readonly initialPage: StoreReviewListPage | null;
}) {
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [rating, setRating] = useState<number | null>(null);
  const [hasMediaOnly, setHasMediaOnly] = useState(false);

  const filter: ReviewListFilter = {
    ...(sort === "recent" ? {} : { sort }),
    ...(rating === null ? {} : { rating }),
    ...(hasMediaOnly ? { hasMedia: true } : {}),
  };

  const reviewsQuery = useProductReviewsQuery(productSlug, filter, initialPage);
  const result = reviewsQuery.data;

  if (result === undefined) {
    return (
      <section className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <h2 className="text-sm tracking-[0.25px] text-[#191C1C]">Ratings and reviews</h2>
        <p className="pt-2 text-xs text-[#6F7979]">Loading reviews…</p>
      </section>
    );
  }

  if (!result.success) {
    return (
      <section className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
        <h2 className="pb-2 text-sm tracking-[0.25px] text-[#191C1C]">Ratings and reviews</h2>
        <StoreErrorPanel message={result.error.message} />
      </section>
    );
  }

  const { summary, items } = result.data;

  // No reviews AT ALL is different from no reviews matching a filter, and only the first is a
  // statement about the product.
  const hasAnyReviews = summary.reviewCount > 0;
  const hasActiveFilter = rating !== null || hasMediaOnly;

  return (
    <section className="border-t border-[#CAC4D0]/60 px-4 py-4 lg:px-6">
      <h2 className="pb-3 text-sm tracking-[0.25px] text-[#191C1C]">Ratings and reviews</h2>

      {!hasAnyReviews ? (
        <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
          No reviews yet. Reviews can only be left by a buyer whose order completed, so this is a
          new listing rather than an unpopular one.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-6 pb-3">
            <div>
              <p className="text-3xl leading-9 font-medium text-[#191C1C]">
                {summary.averageRating === null ? "—" : summary.averageRating.toFixed(1)}
              </p>
              <p className="text-xs leading-4 text-[#6F7979]">
                {formatCountLabel(summary.reviewCount)}{" "}
                {summary.reviewCount === 1 ? "review" : "reviews"}
              </p>
            </div>

            <ul className="min-w-40 flex-1 space-y-1">
              {RATING_VALUES.map((ratingValue) => {
                const count = summary.ratingHistogram[`rating${ratingValue}`];
                const sharePercentage =
                  summary.reviewCount === 0 ? 0 : (count / summary.reviewCount) * 100;
                return (
                  <li key={ratingValue} className="flex items-center gap-2">
                    <span className="w-3 text-[11px] text-[#6F7979]">{ratingValue}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E0E3E3]">
                      <span
                        className="block h-full rounded-full bg-[#00696E]"
                        style={{ width: `${sharePercentage}%` }}
                      />
                    </span>
                    <span className="w-8 text-right text-[11px] text-[#6F7979]">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sub-scores, each with its own sample size. A null average is "not enough ratings on
              this dimension yet", never a zero. */}
          <ul className="flex flex-wrap gap-4 pb-3">
            {(
              [
                ["Service", summary.scoreAverages.service],
                ["Shipping", summary.scoreAverages.shipping],
                ["Quality", summary.scoreAverages.quality],
              ] as const
            ).map(([label, score]) => (
              <li key={label} className="text-xs leading-4 text-[#6F7979]">
                {label}:{" "}
                <span className="font-medium text-[#191C1C]">
                  {score.average === null ? "Not rated yet" : score.average.toFixed(1)}
                </span>
                {score.count > 0 && <span> ({score.count})</span>}
              </li>
            ))}
          </ul>

          {/* Every chip below drives a QUERY PARAMETER. */}
          <div className="flex flex-wrap gap-2 pb-3">
            {REVIEW_SORTS.map((sortOption) => (
              <button
                key={sortOption}
                type="button"
                aria-pressed={sort === sortOption}
                onClick={() => setSort(sortOption)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  sort === sortOption
                    ? "border-[#00696E] bg-[#00696E]/10 font-medium text-[#00696E]"
                    : "border-[#CAC4D0] text-[#6F7979]"
                }`}
              >
                {REVIEW_SORT_LABELS[sortOption]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pb-3">
            {RATING_VALUES.map((ratingValue) => (
              <button
                key={ratingValue}
                type="button"
                aria-pressed={rating === ratingValue}
                onClick={() => setRating(rating === ratingValue ? null : ratingValue)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  rating === ratingValue
                    ? "border-[#00696E] bg-[#00696E]/10 font-medium text-[#00696E]"
                    : "border-[#CAC4D0] text-[#6F7979]"
                }`}
              >
                {ratingValue} star
              </button>
            ))}
            {summary.reviewsWithMediaCount > 0 && (
              <button
                type="button"
                aria-pressed={hasMediaOnly}
                onClick={() => setHasMediaOnly(!hasMediaOnly)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  hasMediaOnly
                    ? "border-[#00696E] bg-[#00696E]/10 font-medium text-[#00696E]"
                    : "border-[#CAC4D0] text-[#6F7979]"
                }`}
              >
                With photos ({summary.reviewsWithMediaCount})
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
              {hasActiveFilter ? "No reviews match those filters." : "No reviews on this page."}
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} productSlug={productSlug} />
                </li>
              ))}
            </ul>
          )}

          {/* MORE PAGES EXIST AND THIS SECTION DOES NOT PAGE THEM. Said rather than hidden: a
              buyer who has read twelve reviews needs to know the thirteenth exists. The cursor
              belongs to the reviews route, and following it here would grow the product page into
              an unbounded list. */}
          {result.data.page.hasMore && (
            <p className="pt-3 text-xs leading-4 text-[#6F7979]">
              Showing the first {items.length} of {formatCountLabel(summary.reviewCount)} reviews.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function ReviewCard({
  review,
  productSlug,
}: {
  readonly review: StoreReview;
  readonly productSlug: string;
}) {
  const setHelpfulVoteMutation = useSetReviewHelpfulVote();
  // `viewer` IS THE PERMISSION, not just the current state. Null means the caller has no active
  // trading organization — or is a party to this review, who may never vote on it — so the control
  // renders as a plain count with nothing to press, which is what this file's header specifies.
  const canVote = review.viewer !== null;
  const hasVotedHelpful = review.viewer?.hasVotedHelpful ?? false;

  const photos = review.media.filter((media) => media.mediaKind === "photo");
  const videos = review.media.filter((media) => media.mediaKind === "youtube_video");

  return (
    <article className="border-b border-[#CAC4D0]/60 pb-4">
      <div className="flex items-center gap-2 pb-1">
        <span className="rounded bg-[#00696E] px-1.5 py-0.5 text-[11px] font-medium text-white">
          {review.rating.toFixed(1)}
        </span>
        {/* A null reviewer is an organization that is not publicly visible. Its identity is not
            disclosed by the act of leaving a review. */}
        <span className="text-xs font-medium text-[#191C1C]">
          {review.reviewer?.displayName ?? "Verified buyer"}
        </span>
        <span className="text-[11px] text-[#6F7979]">
          {formatIsoInstantLabel(review.createdAt)}
        </span>
      </div>

      <p className="text-sm leading-5 whitespace-pre-line text-[#191C1C]">{review.body}</p>

      {photos.length > 0 && (
        <ul className="flex gap-2 pt-2">
          {photos.map((photo) => (
            <li key={photo.id} className="relative size-16 overflow-hidden rounded bg-[#F5F5F5]">
              {photo.url !== null && (
                <Image src={photo.url} fill sizes="64px" alt="" className="object-cover" />
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Review video is a YOUTUBE ID. There is no first-party video ingest anywhere in this
          domain, so this links out rather than pretending to host anything. */}
      {videos.length > 0 && (
        <ul className="flex flex-wrap gap-3 pt-2">
          {videos.map((video) => (
            <li key={video.id}>
              {video.youtubeVideoId !== null && (
                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-[#2A76FD]"
                >
                  Watch buyer video
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 pt-2">
        <span className="text-[11px] text-[#6F7979]">
          {formatCountLabel(review.helpfulCount)} found this helpful
        </span>
        {canVote && (
          <button
            type="button"
            aria-pressed={hasVotedHelpful}
            disabled={setHelpfulVoteMutation.isPending}
            onClick={() =>
              setHelpfulVoteMutation.mutate({
                reviewId: review.id,
                productSlug,
                // The toggle direction is decided from what the SERVER last said, never from an
                // optimistic local flip — the count beside it has to stay true.
                isHelpful: !hasVotedHelpful,
              })
            }
            className={`cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
              hasVotedHelpful
                ? "bg-[#00696E] text-white"
                : "bg-transparent text-[#00696E] outline -outline-offset-1 outline-[#00696E]"
            }`}
          >
            {hasVotedHelpful ? "Helpful" : "Mark helpful"}
          </button>
        )}
      </div>

      {review.reply !== null && (
        <div className="mt-2 rounded-lg bg-[#F2F4F4] px-3 py-2">
          <p className="text-[11px] font-medium text-[#191C1C]">
            {review.reply.responder?.displayName ?? "Seller"} replied
          </p>
          <p className="text-xs leading-4 whitespace-pre-line text-[#191C1C]">
            {review.reply.body}
          </p>
        </div>
      )}
    </article>
  );
}
