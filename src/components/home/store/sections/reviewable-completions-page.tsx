// TRANSPORT: client-query — the buyer's completed trade, and the way into reviewing it.
"use client";

// THE ENTRY POINT THE REVIEW ROUTES NEVER HAD. `POST /commerce/completions/:completionId/reviews`
// shipped in Phase 7 and `completionId` was projected on nothing, so the id it demands was
// unobtainable — ratings, photos and videos were all reachable only by guessing a UUID.
// `GET /commerce/completions` closed that on the backend; this page is the half that was missing.
//
// `hasReview` COUNTS HIDDEN REVIEWS, so a row that has been reviewed offers no write even when the
// review is invisible to buyers. The unique index behind it has no partial predicate, so pretending
// otherwise would offer a write the server refuses.
//
// FILTERED SERVER-SIDE. The `reviewable` toggle is a query parameter, never a filter over a fetched
// page: post-filtering a keyset page returns short pages and a cursor computed from rows that were
// then dropped, so the next page starts past rows the reader never saw.

import { useState } from "react";

import ReviewComposer from "@/components/home/store/composers/review-composer";
import { useBuyerCompletionsList } from "@/hooks/store/reviews";
import type { BuyerCompletion } from "@/lib/store/reviews.schemas";

export default function ReviewableCompletionsPage() {
  const [isUnreviewedOnly, setIsUnreviewedOnly] = useState(true);
  const [completionBeingReviewed, setCompletionBeingReviewed] = useState<BuyerCompletion | null>(
    null,
  );

  const completionsList = useBuyerCompletionsList(isUnreviewedOnly ? { reviewable: true } : {});

  if (completionBeingReviewed !== null) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setCompletionBeingReviewed(null)}
          className="cursor-pointer text-sm font-medium text-foreground underline"
        >
          Back to everything you can review
        </button>
        <div className="mt-4">
          <ReviewComposer completion={completionBeingReviewed} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="pb-4">
        <h1 className="text-lg font-semibold text-foreground">Reviews you can leave</h1>
        <p className="text-xs text-muted-foreground">
          Every order and engagement of yours that has completed. You can review each one once.
        </p>
      </header>

      <label className="mb-4 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={isUnreviewedOnly}
          onChange={(changeEvent) => setIsUnreviewedOnly(changeEvent.target.checked)}
          className="size-4 cursor-pointer accent-primary"
        />
        <span className="text-sm text-foreground">Only show what I have not reviewed</span>
      </label>

      {completionsList.isLoadingFirstPage ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : completionsList.firstPageErrorMessage !== null ? (
        <p className="text-sm text-muted-foreground">{completionsList.firstPageErrorMessage}</p>
      ) : completionsList.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isUnreviewedOnly
            ? "You have reviewed everything that has completed."
            : "Nothing of yours has completed yet. A review can only be left once an order or engagement finishes."}
        </p>
      ) : (
        <ul className="space-y-3">
          {completionsList.rows.map((completion) => (
            <li key={completion.completionId} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  {completion.counterpartyOrganization.displayName}
                </p>
                <span className="text-xs text-muted-foreground">
                  {completion.targetKind === "product" ? "Order" : "Service engagement"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Completed {new Date(completion.completedAt).toLocaleDateString()}
              </p>
              <div className="mt-2">
                {completion.hasReview ? (
                  // No write offered, and the sentence says why without claiming to know whether a
                  // moderator hid it — `hasReview` cannot distinguish those and neither should this.
                  <p className="text-xs text-muted-foreground">
                    You have already reviewed this one.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCompletionBeingReviewed(completion)}
                    className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Write a review
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {completionsList.loadMoreErrorMessage !== null && (
        <p className="mt-3 text-xs text-destructive">{completionsList.loadMoreErrorMessage}</p>
      )}

      {completionsList.hasNextPage && (
        <button
          type="button"
          onClick={completionsList.loadNextPage}
          disabled={completionsList.isFetchingNextPage}
          className="mt-4 cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border disabled:opacity-60"
        >
          {completionsList.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
