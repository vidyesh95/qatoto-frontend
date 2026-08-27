// TRANSPORT: client-query — reviews written about this organization, and the seller's answer to them.
"use client";

// THE SELLER'S HALF OF TRUST, and until now it had no screen at all. `GET /commerce/seller/reviews`
// and both reply routes shipped with no caller, so a seller could be reviewed publicly and had no
// way to read it, let alone answer.
//
// IT REUSES THE PUBLIC PAGE SHAPE EXACTLY — the backend answers the same `{ summary, items, page }`
// the product page reads, so there is no seller-specific projection here and none is wanted.
//
// THREE THINGS THAT LOOK LIKE BUGS AND ARE NOT:
//
//  1. **No helpful control.** `viewer.hasVotedHelpful` is permanently `false` on this surface,
//     because the caller is the SUBJECT of every row and a party to a review may never vote on it.
//     A control here would be a button that always 403s.
//  2. **`reviewer` is often null.** A seller gets no privileged buyer identity in their own inbox —
//     a buyer organization that is not publicly visible reads as "Verified buyer", exactly as on the
//     product page.
//  3. **`summary` does not move when you filter.** It is computed over every visible review of the
//     organization rather than the filtered page, which is what stops the counts renumbering as the
//     chips are clicked.
//
// THE CURSOR IS SORT-SCOPED. Its sort key is encoded into the cursor itself, so carrying one across
// a change of sort is a 422 rather than a reset — which is why changing any filter here starts a new
// read rather than paging the old one.

import { useState } from "react";

import SellerReviewReply from "@/components/studio/commerce/reviews/seller-review-reply";
import { useSellerReviewInboxQuery } from "@/hooks/store/reviews";
import { formatCountLabel, formatIsoInstantLabel } from "@/lib/store/format";
import { REVIEW_SORTS, REVIEW_SORT_LABELS } from "@/lib/store/products.schemas";
import type { ReviewSort } from "@/lib/store/products.schemas";

export default function SellerReviewsPage() {
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [isUnrepliedOnly, setIsUnrepliedOnly] = useState(false);

  // No cursor is carried across a filter change — see the header. Each change is a fresh read.
  const inboxQuery = useSellerReviewInboxQuery({
    sort,
    ...(isUnrepliedOnly ? { unreplied: true } : {}),
  });

  const page = inboxQuery.data?.success ? inboxQuery.data.data : null;

  return (
    <div>
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Reviews of your organization</h1>
        <p className="text-xs text-muted-foreground">
          What buyers said after an order or engagement completed. You can answer each one once, and
          revise that answer once within 30 days.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 pb-4">
        <div className="flex flex-wrap gap-2">
          {REVIEW_SORTS.map((reviewSort) => (
            <button
              key={reviewSort}
              type="button"
              aria-pressed={sort === reviewSort}
              onClick={() => setSort(reviewSort)}
              className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === reviewSort
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground outline -outline-offset-1 outline-border"
              }`}
            >
              {REVIEW_SORT_LABELS[reviewSort]}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isUnrepliedOnly}
            onChange={(changeEvent) => setIsUnrepliedOnly(changeEvent.target.checked)}
            className="size-4 cursor-pointer accent-primary"
          />
          <span className="text-sm text-foreground">Only ones you have not answered</span>
        </label>
      </div>

      {inboxQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : page === null ? (
        <p className="text-sm text-muted-foreground">
          {inboxQuery.data?.success === false
            ? inboxQuery.data.error.message
            : "These reviews could not be loaded."}
        </p>
      ) : (
        <>
          <p className="pb-3 text-xs text-muted-foreground">
            {/* Over every visible review, never the filtered page — see note 3. */}
            {page.summary.reviewCount === 0
              ? "Nobody has reviewed you yet."
              : `${formatCountLabel(page.summary.reviewCount)} in total, averaging ${page.summary.averageRating?.toFixed(1) ?? "—"}.`}
          </p>

          {page.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isUnrepliedOnly ? "You have answered every review." : "Nothing matches that filter."}
            </p>
          ) : (
            <ul className="space-y-4">
              {page.items.map((review) => (
                <li key={review.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-medium text-primary-foreground">
                      {review.rating.toFixed(1)}
                    </span>
                    {/* No privileged identity here — see note 2. */}
                    <span className="text-xs font-medium text-foreground">
                      {review.reviewer?.displayName ?? "Verified buyer"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatIsoInstantLabel(review.createdAt)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatCountLabel(review.helpfulCount)} found this helpful
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-5 whitespace-pre-line text-foreground">
                    {review.body}
                  </p>

                  <SellerReviewReply
                    reviewId={review.id}
                    existingReplyBody={review.reply?.body ?? null}
                  />
                </li>
              ))}
            </ul>
          )}

          {page.page.hasMore && (
            <p className="mt-4 text-xs text-muted-foreground">
              Showing the first {page.items.length}. Narrow the filters to see further back — paging
              deeper is not wired here yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
