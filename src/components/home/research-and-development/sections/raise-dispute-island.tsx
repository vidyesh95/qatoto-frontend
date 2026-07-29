// TRANSPORT: client-query — "use client" island calling useRaiseDisputeMutation.
// One write: POST …/allocation-proposals/:proposalId/dispute.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { useRaiseDisputeMutation } from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { newIdempotencyKey } from "@/lib/rnd/idempotency";

/**
 * Contest an allocation before its window closes.
 *
 * THE GDPR Art. 22 CONTESTABILITY CONTROL. It is deliberately available to ANY active
 * member, not only to the person the allocation belongs to: the pie is shared, so an
 * allocation that is too generous costs everyone else, and restricting the objection to
 * its beneficiary would mean nobody could ever raise that one.
 *
 * THE IDEMPOTENCY KEY IS MINTED ONCE PER ATTEMPT, in state, not inside the submit handler.
 * A key regenerated per click would let a double-tap on a slow connection raise two
 * disputes against the same proposal.
 *
 * `409 WINDOW_CLOSED` is a real outcome, not a bug: the window is a deadline and the UI
 * says so rather than pretending the button failed.
 */
export default function RaiseDisputeIsland({
  projectSlug,
  proposalId,
}: {
  projectSlug: string;
  proposalId: string;
}) {
  const raiseMutation = useRaiseDisputeMutation(projectSlug);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  const raiseError =
    raiseMutation.error instanceof ApiRequestError ? raiseMutation.error.apiError : null;

  if (raiseMutation.isSuccess) {
    return (
      <div className="mt-3">
        <MutationSuccessNotice message="Disputed. The slices are frozen in escrow until the team votes." />
      </div>
    );
  }

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="mt-3 cursor-pointer text-xs font-medium text-[#00696E]"
      >
        Dispute this allocation
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        raiseMutation.mutate({ proposalId, disputeNote, idempotencyKey });
      }}
    >
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">
          What is wrong with this allocation? Everyone on the team will read this.
        </span>
        <textarea
          required
          rows={3}
          value={disputeNote}
          onChange={(changeEvent) => setDisputeNote(changeEvent.target.value)}
          className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Raising a dispute freezes these slices until a majority of the team votes. It does not
        reduce anyone&apos;s existing share.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={raiseMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {raiseMutation.isPending ? "Raising…" : "Raise the dispute"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>
      {raiseError !== null && <MutationErrorNotice error={raiseError} />}
    </form>
  );
}
