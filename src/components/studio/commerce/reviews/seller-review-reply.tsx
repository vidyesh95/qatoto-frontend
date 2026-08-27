// TRANSPORT: client-query — the seller's answer to one review.
"use client";

// **THIS IS NOT A FREE-FORM UPSERT, and a control that pretends otherwise just collects 409s.**
//
// A FIRST reply is always allowed, however old the review — answering late is fine and the backend
// says so explicitly. REVISING is bounded twice:
//
//   1. ONCE ONLY. A second revision answers 409 "A reply may be revised once, and this one has
//      already been revised."
//   2. WITHIN 30 DAYS of the REPLY's own creation, not the review's. Past that, 409 again.
//
// `DELETE` carries the same 30-day bound, and withdrawing a reply that does not exist is NOT an
// error — so that control is safe to leave enabled rather than gated on a guess.
//
// **THE CLIENT CANNOT PRE-EMPT EITHER REFUSAL**, and that is a wire fact rather than laziness:
// `ReviewReplyProjection` does not carry `editedAt`, so there is no way to know locally whether the
// one revision is spent. The server's own sentence is the authority, which is why every refusal here
// renders verbatim instead of being second-guessed by a disabled button.

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { useUpsertReviewReply, useWithdrawReviewReply } from "@/hooks/store/reviews";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";

export default function SellerReviewReply({
  reviewId,
  existingReplyBody,
}: {
  reviewId: string;
  existingReplyBody: string | null;
}) {
  const [isComposing, setIsComposing] = useState(false);
  const [replyBody, setReplyBody] = useState(existingReplyBody ?? "");

  const upsertAttempt = useResettableAttemptIdempotencyKey();
  const withdrawAttempt = useResettableAttemptIdempotencyKey();
  const upsertReplyMutation = useUpsertReviewReply();
  const withdrawReplyMutation = useWithdrawReviewReply();

  async function handleSaveClick() {
    const trimmedBody = replyBody.trim();
    if (trimmedBody === "") return;
    const result = await upsertReplyMutation.mutateAsync({
      reviewId,
      input: { body: trimmedBody },
      idempotencyKey: upsertAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    upsertAttempt.resetIdempotencyKey();
    setIsComposing(false);
  }

  async function handleWithdrawClick() {
    const result = await withdrawReplyMutation.mutateAsync({
      reviewId,
      idempotencyKey: withdrawAttempt.getIdempotencyKey(),
    });
    if (!result.success) return;
    withdrawAttempt.resetIdempotencyKey();
    setReplyBody("");
    setIsComposing(false);
  }

  if (isComposing) {
    return (
      <div className="mt-3 rounded-lg border border-border p-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Your answer</span>
          <textarea
            value={replyBody}
            onChange={(changeEvent) => setReplyBody(changeEvent.target.value)}
            maxLength={2000}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {existingReplyBody === null
            ? "This is published beside the review. You can revise it once, within 30 days."
            : "This is your one revision, and it is only available within 30 days of the original answer."}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={replyBody.trim() === "" || upsertReplyMutation.isPending}
            onClick={() => void handleSaveClick()}
            className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {upsertReplyMutation.isPending ? "Saving…" : "Publish answer"}
          </button>
          <button
            type="button"
            onClick={() => {
              setReplyBody(existingReplyBody ?? "");
              setIsComposing(false);
            }}
            className="cursor-pointer text-sm font-medium text-foreground underline"
          >
            Cancel
          </button>
        </div>
        {/* The server's own sentence, verbatim — see the header for why it cannot be pre-empted. */}
        <MutationNotice
          result={upsertReplyMutation.data}
          hasThrown={upsertReplyMutation.isError}
          fallbackMessage="Your answer could not be saved."
        />
      </div>
    );
  }

  return (
    <div className="mt-3">
      {existingReplyBody === null ? (
        <button
          type="button"
          onClick={() => setIsComposing(true)}
          className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border"
        >
          Answer this review
        </button>
      ) : (
        <div className="rounded-lg bg-muted px-3 py-2">
          <p className="text-[11px] font-medium text-foreground">You answered</p>
          <p className="text-xs leading-4 whitespace-pre-line text-foreground">
            {existingReplyBody}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {/* Both controls stay enabled. The bounds are the server's to enforce and its refusal is
                the only reliable signal — a disabled button here would be a guess. */}
            <button
              type="button"
              onClick={() => setIsComposing(true)}
              className="cursor-pointer text-xs font-medium text-primary underline"
            >
              Revise it
            </button>
            <button
              type="button"
              disabled={withdrawReplyMutation.isPending}
              onClick={() => void handleWithdrawClick()}
              className="cursor-pointer text-xs font-medium text-destructive underline disabled:opacity-50"
            >
              {withdrawReplyMutation.isPending ? "Withdrawing…" : "Withdraw it"}
            </button>
          </div>
        </div>
      )}
      <MutationNotice
        result={withdrawReplyMutation.data}
        hasThrown={withdrawReplyMutation.isError}
        fallbackMessage="Your answer could not be withdrawn."
      />
    </div>
  );
}
