// TRANSPORT: client-query — "use client" island. Reads GET /funding-rounds/:id/pledge-options
// when the form opens and writes POST /funding-rounds/:id/pledges.
"use client";

import { useState } from "react";

import {
  MutationErrorNotice,
  MutationSuccessNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { useCreatePledgeMutation, usePledgeOptionsQuery } from "@/hooks/rnd/funding";
import { ApiRequestError } from "@/lib/http";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";

/**
 * Back a round.
 *
 * **THIS IS NOT A CHECKOUT AND MUST NEVER READ LIKE ONE.** No card is taken, no hold is
 * placed, no money moves and no fee is charged — Qatoto holds no funds at all. The button
 * says "commit", the confirmation says "committed", and the copy below says plainly where
 * the money actually moves. A "Pay now" label here would be a false statement about a
 * regulated activity the platform does not perform.
 *
 * THE BODY IS `{ amountInCents }` AND NOTHING ELSE. The endpoint's schema is `.strict()`,
 * so there is no currency field to send and nowhere to put a payment instrument even by
 * mistake.
 *
 * THE BOUNDS ARE ADVISORY. `pledge-options` renders a helpful field; the server re-derives
 * every one of them on submit, which is why this component never decides that an amount is
 * acceptable — it only shows what will be enforced.
 */
export default function PledgeIsland({
  roundId,
  roundTitle,
}: {
  roundId: string;
  roundTitle: string;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [amountInCents, setAmountInCents] = useState("");

  const optionsQuery = usePledgeOptionsQuery(isFormOpen ? roundId : undefined);
  const pledgeMutation = useCreatePledgeMutation();

  const pledgeError =
    pledgeMutation.error instanceof ApiRequestError ? pledgeMutation.error.apiError : null;

  if (pledgeMutation.isSuccess) {
    return (
      <MutationSuccessNotice
        message={`Committed to ${roundTitle}. No money has moved — the team will contact you about how and when to send it.`}
      />
    );
  }

  if (!isFormOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white"
      >
        Commit to back this
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        pledgeMutation.mutate({ roundId, amountInCents });
      }}
    >
      {optionsQuery.data && (
        <p className="text-xs text-muted-foreground">
          Minimum{" "}
          {formatMoneyFromCents(
            BigInt(optionsQuery.data.minimumPledgeInCents),
            optionsQuery.data.currency,
          )}
          {optionsQuery.data.maximumPledgeInCents !== null &&
            ` · maximum ${formatMoneyFromCents(
              BigInt(optionsQuery.data.maximumPledgeInCents),
              optionsQuery.data.currency,
            )}`}
          {optionsQuery.data.closesAt !== null &&
            ` · closes ${formatIsoInstant(optionsQuery.data.closesAt)}`}
          {!optionsQuery.data.acceptingPledges && " · this round is not accepting commitments"}
        </p>
      )}

      <input
        required
        inputMode="numeric"
        pattern="[0-9]*"
        value={amountInCents}
        onChange={(changeEvent) => setAmountInCents(changeEvent.target.value)}
        placeholder="Amount in whole cents"
        className="w-full rounded-xl border border-[#CAC4D0] p-2 text-sm"
      />

      <p className="text-xs text-muted-foreground">
        This records a commitment. Qatoto takes no card, holds no funds, charges no fee and moves no
        money — the team arranges the transfer with you directly.
      </p>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pledgeMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {pledgeMutation.isPending ? "Recording…" : "Record my commitment"}
        </button>
        <button
          type="button"
          onClick={() => setIsFormOpen(false)}
          className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium"
        >
          Cancel
        </button>
      </div>

      {pledgeError !== null && <MutationErrorNotice error={pledgeError} />}
    </form>
  );
}
