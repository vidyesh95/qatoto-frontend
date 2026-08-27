// TRANSPORT: client-query — writes one review against one completed piece of trade.
"use client";

// THE FIRST SURFACE ON THIS PLATFORM THAT CAN LEAVE A REVIEW. The product page has always rendered
// "Reviews can only be left by a buyer whose order completed", which read as a gate and was in fact a
// description of a surface nobody could reach: every write route had shipped and none had a caller.
//
// TWO PHASES, AND THE ORDER IS FORCED BY THE WIRE. Media attaches to a REVIEW ID, so the review is
// written first and the evidence panel appears after. Staging photos beforehand would mean holding
// files whose destination might never exist, and a failed create would strand them.
//
// THE SCORE AXES ARE NOT ALWAYS THREE. `shipping` is meaningless on a service engagement — nothing
// shipped — and sending it there is a 422 `UNSUPPORTED_SCORE_AXIS` refused under the lock the service
// already holds on the completion row. So the axis is offered only for a product completion, and its
// absence is explained rather than silent.
//
// SCORES ARE ALL-OR-NOTHING AS A KEY: at least one axis, or omit `scores` entirely. An empty object
// is refused, so "I did not rate any axis" must become an omitted key rather than `{}`.
//
// NOTHING IS OPTIMISTIC. A review is a published statement about a counterparty.

import { useState } from "react";

import { TextAreaField } from "@/components/commerce/composer/composer-fields";
import ReviewMediaPanel from "@/components/home/store/composers/review-media-panel";
import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useCreateReview, useEditOwnReview } from "@/hooks/store/reviews";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  REVIEW_SCORE_AXIS_LABELS,
  type AuthoredReview,
  type BuyerCompletion,
  type ReviewScoreAxis,
  type ReviewScoresInput,
} from "@/lib/store/reviews.schemas";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/** `shipping` is offered only where something shipped. See the header. */
function scoreAxesFor(targetKind: BuyerCompletion["targetKind"]): readonly ReviewScoreAxis[] {
  return targetKind === "product" ? ["service", "shipping", "quality"] : ["service", "quality"];
}

export default function ReviewComposer({
  completion,
  onReviewPublished,
}: {
  completion: BuyerCompletion;
  onReviewPublished?: (review: AuthoredReview) => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [axisScores, setAxisScores] = useState<Partial<Record<ReviewScoreAxis, number>>>({});
  const [publishedReview, setPublishedReview] = useState<AuthoredReview | null>(null);

  const createAttempt = useResettableAttemptIdempotencyKey();
  const editAttempt = useResettableAttemptIdempotencyKey();
  const createReviewMutation = useCreateReview();
  const editOwnReviewMutation = useEditOwnReview();

  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const offeredAxes = scoreAxesFor(completion.targetKind);

  async function handlePublishClick() {
    if (rating === null) return;
    const trimmedBody = body.trim();
    if (trimmedBody === "") return;

    // AT LEAST ONE AXIS OR NO KEY AT ALL. `{}` is refused by the backend's own refinement, so an
    // untouched score section must omit `scores` rather than send an empty object.
    //
    // Only the OFFERED axes are read, so a `shipping` score left behind by switching completions
    // could never reach a service engagement.
    const scores: ReviewScoresInput = Object.fromEntries(
      offeredAxes.flatMap((axis) => {
        const axisScore = axisScores[axis];
        return axisScore === undefined ? [] : [[axis, axisScore] as const];
      }),
    );
    const hasAnyScore = Object.keys(scores).length > 0;

    const result = await createReviewMutation.mutateAsync({
      completionId: completion.completionId,
      input: {
        rating,
        body: trimmedBody,
        ...(hasAnyScore ? { scores } : {}),
      },
      idempotencyKey: createAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    createAttempt.resetIdempotencyKey();
    setPublishedReview(result.data);
    onReviewPublished?.(result.data);
  }

  /**
   * Spends the one edit.
   *
   * BOTH FIELDS GO EVERY TIME. The backend takes no partial patch here on purpose: there is exactly
   * one edit, so a request carrying only the body would spend it and silently keep a rating the
   * author may have meant to change. The form is therefore prefilled with both.
   */
  async function handleSaveEditClick() {
    if (publishedReview === null || editRating === null) return;
    const trimmedBody = editBody.trim();
    if (trimmedBody === "") return;

    const result = await editOwnReviewMutation.mutateAsync({
      reviewId: publishedReview.id,
      input: { rating: editRating, body: trimmedBody },
      idempotencyKey: editAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    editAttempt.resetIdempotencyKey();
    setPublishedReview(result.data);
    setIsEditing(false);
  }

  if (publishedReview !== null) {
    // `editedAt` IS SET ONCE AND IS PUBLIC. A rewritten review that does not say it was rewritten is
    // the manipulation, not the edit — so once it is set, the control is gone rather than disabled
    // with an excuse.
    const hasSpentTheEdit = publishedReview.editedAt !== null;

    return (
      <div className="space-y-4">
        <section className="rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-foreground">Your review is published</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {publishedReview.visibility === "hidden"
              ? "A moderator has hidden it, so buyers cannot see it. It still counts as your one review for this order."
              : "Buyers can see it on the product page."}
          </p>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <fieldset>
                <legend className="text-xs font-medium text-muted-foreground">
                  Overall rating
                </legend>
                <div className="mt-1 flex gap-2">
                  {RATING_VALUES.map((ratingValue) => (
                    <button
                      key={ratingValue}
                      type="button"
                      aria-pressed={editRating === ratingValue}
                      onClick={() => setEditRating(ratingValue)}
                      className={`size-9 cursor-pointer rounded-full text-sm font-medium transition-colors ${
                        editRating === ratingValue
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-foreground outline -outline-offset-1 outline-border"
                      }`}
                    >
                      {ratingValue}
                    </button>
                  ))}
                </div>
              </fieldset>
              <TextAreaField
                label="What happened"
                value={editBody}
                onValueChange={setEditBody}
                maxLength={4000}
              />
              <p className="text-[11px] leading-4 text-muted-foreground">
                This is your only edit, and it replaces both the rating and the words. The review
                will be publicly marked as edited.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    editRating === null || editBody.trim() === "" || editOwnReviewMutation.isPending
                  }
                  onClick={() => void handleSaveEditClick()}
                  className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editOwnReviewMutation.isPending ? "Saving…" : "Save the edit"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="cursor-pointer text-sm font-medium text-foreground underline"
                >
                  Keep what I wrote
                </button>
              </div>
              <MutationNotice
                result={editOwnReviewMutation.data}
                hasThrown={editOwnReviewMutation.isError}
                fallbackMessage="Your edit could not be saved."
              />
            </div>
          ) : hasSpentTheEdit ? (
            <p className="mt-3 text-xs text-muted-foreground">
              You have used your one edit, so this review is now final.
            </p>
          ) : (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  setEditRating(publishedReview.rating);
                  setEditBody(publishedReview.body);
                  setIsEditing(true);
                }}
                className="cursor-pointer rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground outline -outline-offset-1 outline-border"
              >
                Edit this review
              </button>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                You get one edit, within 30 days. It replaces both the rating and the words, and the
                review is publicly marked as edited afterwards.
              </p>
            </div>
          )}
        </section>
        <ReviewMediaPanel reviewId={publishedReview.id} />
      </div>
    );
  }

  const isPublishBlocked = rating === null || body.trim() === "" || createReviewMutation.isPending;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">
          Reviewing {completion.counterpartyOrganization.displayName}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          You can review this once. There is one edit afterwards, within 30 days, and it replaces
          both the rating and the words.
        </p>

        <fieldset className="mt-3">
          <legend className="text-xs font-medium text-muted-foreground">Overall rating</legend>
          <div className="mt-1 flex gap-2">
            {RATING_VALUES.map((ratingValue) => (
              <button
                key={ratingValue}
                type="button"
                aria-pressed={rating === ratingValue}
                onClick={() => setRating(ratingValue)}
                className={`size-9 cursor-pointer rounded-full text-sm font-medium transition-colors ${
                  rating === ratingValue
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground outline -outline-offset-1 outline-border"
                }`}
              >
                {ratingValue}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-3">
          <TextAreaField
            label="What happened"
            hint="Up to 4000 characters."
            value={body}
            onValueChange={setBody}
            maxLength={4000}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border p-4">
        <h2 className="text-sm font-medium text-foreground">Score the details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional. Rate any of these, or none of them.
          {completion.targetKind === "service_engagement" &&
            " Shipping is not scored here — nothing was shipped on a service engagement."}
        </p>
        <div className="mt-3 space-y-3">
          {offeredAxes.map((axis) => (
            <fieldset key={axis}>
              <legend className="text-xs font-medium text-muted-foreground">
                {REVIEW_SCORE_AXIS_LABELS[axis]}
              </legend>
              <div className="mt-1 flex gap-2">
                {RATING_VALUES.map((ratingValue) => (
                  <button
                    key={ratingValue}
                    type="button"
                    aria-pressed={axisScores[axis] === ratingValue}
                    onClick={() =>
                      setAxisScores((existingScores) =>
                        // Pressing the selected value again CLEARS the axis, which is how "I did not
                        // rate this" stays reachable after a mis-tap. An axis with no score is
                        // omitted, never sent as zero.
                        existingScores[axis] === ratingValue
                          ? Object.fromEntries(
                              Object.entries(existingScores).filter(([key]) => key !== axis),
                            )
                          : { ...existingScores, [axis]: ratingValue },
                      )
                    }
                    className={`size-8 cursor-pointer rounded-full text-xs font-medium transition-colors ${
                      axisScores[axis] === ratingValue
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground outline -outline-offset-1 outline-border"
                    }`}
                  >
                    {ratingValue}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div>
        <button
          type="button"
          disabled={isPublishBlocked}
          onClick={() => void handlePublishClick()}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createReviewMutation.isPending ? "Publishing…" : "Publish review"}
        </button>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          Photos and video can be attached once the review exists.
        </p>
        <MutationNotice
          result={createReviewMutation.data}
          hasThrown={createReviewMutation.isError}
          fallbackMessage="Your review could not be published."
        />
      </div>
    </div>
  );
}
