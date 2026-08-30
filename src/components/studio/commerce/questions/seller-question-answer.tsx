// TRANSPORT: client-query — the seller's answer to one buyer question.
"use client";

// **A STUDIO-LOCAL COMPOSER RATHER THAN THE BUYER PAGE'S, and that is the precedent rather than
// duplication for its own sake.** `seller-review-reply.tsx` beside this file made the same call for
// the same surface. Three concrete reasons the buyer-side `AnswerComposer` cannot be lifted:
//
//   1. It is module-private in `questions-and-answers.tsx`, which exports only its default.
//   2. It hardcodes Material-3 hexes. The studio uses semantic tokens that follow dark mode, and
//      `status-panel.tsx` calls the two "genuinely different vocabularies" rather than two values of
//      one — so a lifted composer would be a light-mode island on a dark page.
//   3. Its disclosure line names who is allowed to answer, which is written for a public viewer who
//      probably cannot. On this page the caller is the seller by construction; telling them who may
//      answer is noise.
//
// WHAT IS SHARED IS THE PART THAT MUST NOT DIVERGE: the same `useAnswerProductQuestion` hook, the
// same wire schema and the same idempotency discipline. Only the chrome is local.
//
// ⚠️ **ONE ANSWER PER ORGANIZATION PER QUESTION.** A second attempt is a `409` naming the
// organization, not the person — so a colleague having answered refuses you. That sentence is the
// server's and is rendered verbatim; "you already answered" would be false for exactly the person
// reading it.

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useAnswerProductQuestion } from "@/hooks/store/products";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import { PRODUCT_ANSWER_BODY_MAX_LENGTH } from "@/lib/store/products.schemas";

export default function SellerQuestionAnswer({
  questionId,
  productSlug,
  hasSellerAnswer,
}: {
  readonly questionId: string;
  /**
   * NULL when the listing is not published. The hook skips the product-scoped cache keys in that
   * case and still refreshes this inbox — see `useQuestionReadInvalidator`.
   */
  readonly productSlug: string | null;
  /** Already answered by this organization. The control says so instead of collecting a 409. */
  readonly hasSellerAnswer: boolean;
}) {
  const [isComposing, setIsComposing] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const answerQuestion = useAnswerProductQuestion(productSlug);
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const trimmedBody = bodyText.trim();
  const isSubmittable =
    trimmedBody.length > 0 &&
    trimmedBody.length <= PRODUCT_ANSWER_BODY_MAX_LENGTH &&
    !answerQuestion.isPending;

  async function handlePublishClick() {
    if (!isSubmittable) return;
    const result = await answerQuestion.mutateAsync({
      questionId,
      bodyText: trimmedBody,
      idempotencyKey: getIdempotencyKey(),
    });
    // ROTATED ONLY ON A CONFIRMED SUCCESS. A failure keeps the key, because a retry after a network
    // error must carry the key of the attempt it is retrying.
    if (!result.success) return;
    resetIdempotencyKey();
    setBodyText("");
    setIsComposing(false);
  }

  if (hasSellerAnswer) {
    return (
      <p className="mt-3 text-xs leading-4 text-muted-foreground">You have answered this one.</p>
    );
  }

  if (!isComposing) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setIsComposing(true)}
          className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border"
        >
          Answer this question
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Your answer</span>
        <textarea
          value={bodyText}
          onChange={(changeEvent) => setBodyText(changeEvent.target.value)}
          maxLength={PRODUCT_ANSWER_BODY_MAX_LENGTH}
          rows={4}
          className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
        This is published on the listing under your organization&apos;s name, and it cannot be
        revised — withdraw it and answer again instead. {trimmedBody.length}/
        {PRODUCT_ANSWER_BODY_MAX_LENGTH}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!isSubmittable}
          onClick={() => void handlePublishClick()}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {answerQuestion.isPending ? "Publishing…" : "Publish answer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setBodyText("");
            setIsComposing(false);
          }}
          className="cursor-pointer text-sm font-medium text-foreground underline"
        >
          Cancel
        </button>
      </div>
      {/* The server's own sentence, verbatim — including the 409 that names the ORGANIZATION. */}
      <MutationNotice
        result={answerQuestion.data}
        hasThrown={answerQuestion.isError}
        fallbackMessage="Your answer could not be published."
      />
    </div>
  );
}
