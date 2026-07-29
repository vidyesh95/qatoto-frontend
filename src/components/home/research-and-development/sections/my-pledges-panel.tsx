// TRANSPORT: client-query — "use client" island. Reads GET /pledges/mine and writes
// POST /pledges/:pledgeId/cancel.
"use client";

import { MutationErrorNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import { useCancelPledgeMutation, useMyPledgesQuery } from "@/hooks/rnd/funding";
import { ApiRequestError, isUnauthorized } from "@/lib/http";
import { formatIsoInstant, formatMoneyFromCents } from "@/lib/rnd/format";
import type { PledgeStatus } from "@/lib/rnd/funding.schemas";

/**
 * `settled` and `refunded` are HISTORICAL. Nothing created now can reach them: the escrow
 * subtree is retired and there is no settlement step, because there is no custody. They
 * are labelled rather than hidden so migration 0016's rows still read correctly.
 */
const PLEDGE_STATUS_LABELS: Record<PledgeStatus, string> = {
  committed: "Committed",
  settled: "Settled (historical)",
  cancelled: "Withdrawn",
  failed: "Failed (historical)",
  refunded: "Refunded (historical)",
};

/**
 * What the caller has committed to back.
 *
 * **THIS IS THE ONLY PLACE A BACKER LEARNS THEY CAN WITHDRAW.** Without it, `POST
 * /pledges/:id/cancel` is an endpoint nobody can reach: a commitment is made from a deal
 * card and then never mentioned again.
 *
 * **NO MONEY HAS MOVED FOR ANY ROW HERE.** Qatoto holds no funds, took no card and charged
 * no fee; `platformFeeInCents` and `netToEscrowInCents` are zero on everything created now
 * and are not rendered at all, because showing a fee of zero still implies a fee exists.
 *
 * `GET /pledges/mine` HAS NO `userId` PARAM AND MUST NEVER GAIN ONE — the filter is the
 * session. A signed-out visitor gets `401` and this panel simply does not render, which is
 * correct: it is a personal list, not a public one.
 */
export default function MyPledgesPanel() {
  const pledgesQuery = useMyPledgesQuery();
  const cancelMutation = useCancelPledgeMutation();

  const cancelError =
    cancelMutation.error instanceof ApiRequestError ? cancelMutation.error.apiError : null;

  const isSignedOut =
    pledgesQuery.error instanceof ApiRequestError && isUnauthorized(pledgesQuery.error.apiError);

  if (isSignedOut || pledgesQuery.isPending) return null;
  if (pledgesQuery.isError) return null;
  if (pledgesQuery.data.length === 0) return null;

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <div className="space-y-1">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">Your commitments</h2>
        <p className="text-xs text-muted-foreground">
          A commitment is a promise to the team, not a payment. Nothing has been charged and nothing
          is held — you and the team arrange the transfer directly, and you can withdraw here.
        </p>
      </div>

      <ul className="space-y-2">
        {pledgesQuery.data.map((pledge) => (
          <li
            key={pledge.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#CAC4D0]/60 p-3 text-sm"
          >
            <span>
              {formatMoneyFromCents(BigInt(pledge.amountInCents), pledge.currency)}
              <span className="block text-xs text-muted-foreground">
                {PLEDGE_STATUS_LABELS[pledge.status]} · {formatIsoInstant(pledge.createdAt)}
              </span>
            </span>

            {pledge.status === "committed" && (
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(pledge.id)}
                className="cursor-pointer rounded-full border border-[#CAC4D0] px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              >
                Withdraw it
              </button>
            )}
          </li>
        ))}
      </ul>

      {cancelError !== null && <MutationErrorNotice error={cancelError} />}
    </section>
  );
}
