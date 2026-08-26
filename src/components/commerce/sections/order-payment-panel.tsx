// TRANSPORT: client-query — writes POST /commerce/orders/:orderId/payment-intents (202) and polls
// GET /commerce/payments/:paymentIntentId; reads GET /commerce/refunds for this order.
"use client";

// THE PAY CONTROL, and it is the last piece of a buyer path that could not previously complete.
//
// Until Phase 24 there was nothing to build here that would have worked: the POST answered 202, the
// order moved to `payment_processing`, and it stayed there forever because `applyPaymentSettlement`
// posted `buyer_clearing → order_held` — a pair the `direct_processor` rail forbids. Every
// settlement threw inside the journal, the outbox recorded it in `last_error`, and eight retries
// later the row dead-lettered without a word reaching any screen. A41 made the postings rail-aware.
//
// FOUR RULES, and each one is about not telling a buyer they have paid when they have not.
//
//  1. A `202` IS NOT A PAYMENT. The POST answers with an intent in state `created` — the row exists,
//     the provider has not been called yet. So the mutation's own success renders as "we have
//     started", never as a receipt, and the verdict comes from polling the intent.
//  2. IT RESUMES FROM `order.paymentIntentId` INSTEAD OF POSTING AGAIN. That field is A38's whole
//     point: before it, the id lived only in the response to the POST that made it, so a buyer who
//     reloaded could neither pay nor find out whether they already had. A page that posted again on
//     mount would create a second charge for exactly the buyer who was unsure.
//  3. A NON-NULL `paymentIntentId` IS NOT "PAID". The backend's live-intent predicate includes
//     `settled`, `refunded`, `partially_refunded` and `disputed` alongside the in-flight states, so
//     the id says "this is the intent to look at" and only the INTENT'S state says what happened.
//  4. A `409` IS A FINDING, NOT A RETRY. Only `direct_processor` and the frozen `internal_custody`
//     rail can take a payment intent; the other two are refused with a sentence naming that rail's
//     own settlement path. The backend's message is rendered verbatim, because the half that says
//     how the order IS settled is the half a buyer can act on.
//
// THE ORDER STATE IS NOT THE GATE. `pending_payment` is when paying makes sense, but the server
// decides — a `409` from a bad state is rendered rather than pre-empted, the same argument
// `order-cancel-control.tsx` makes about its own state check being UX rather than authorization.

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  useCreatePaymentIntent,
  useCreateRefund,
  useOrderRefundsQuery,
  usePaymentIntentQuery,
} from "@/hooks/store/payments";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  isPaymentIntentInFlight,
  OverRefundDetailsSchema,
  PAYMENT_INTENT_STATE_LABELS,
  REFUND_STATE_LABELS,
  type PaymentIntent,
  type Refund,
} from "@/lib/store/payments.schemas";

export default function OrderPaymentPanel({
  orderId,
  paymentIntentId,
}: {
  orderId: string;
  /** `order.paymentIntentId` — null when nothing has been created, or every attempt died. */
  paymentIntentId: string | null;
}) {
  const createPaymentIntent = useCreatePaymentIntent();
  const paymentIntentQuery = usePaymentIntentQuery(paymentIntentId);
  const refundsQuery = useOrderRefundsQuery(orderId);

  /**
   * ROTATES ONLY AFTER A CONFIRMED SUCCESS, never on failure.
   *
   * A retry of a timed-out payment must carry the SAME key — that is the entire mechanism, and a key
   * regenerated on failure would turn one buyer's second press into a second charge. It rotates on
   * success because a genuinely new payment attempt, after a first one failed terminally, is a
   * different act that must not dedupe against the one before it.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const handlePayClick = () => {
    createPaymentIntent.mutate(
      { orderId, idempotencyKey },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          setIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  };

  const intentResult = paymentIntentQuery.data;
  const intent = intentResult?.success === true ? intentResult.data : null;

  return (
    <section aria-label="Payment" className="space-y-3 rounded-xl border border-border px-4 py-3">
      <h2 className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
        Payment
      </h2>

      {paymentIntentId === null ? (
        <PayPrompt
          isSubmitting={createPaymentIntent.isPending}
          hasAccepted={createPaymentIntent.data?.success === true}
          onPayClick={handlePayClick}
        />
      ) : (
        <ResumedPayment
          isLoading={paymentIntentQuery.isPending}
          intent={intent}
          errorMessage={
            intentResult !== undefined && !intentResult.success ? intentResult.error.message : null
          }
        />
      )}

      {/* The 409 rail refusal lands here, in the backend's own words. */}
      <MutationNotice
        result={createPaymentIntent.data}
        hasThrown={createPaymentIntent.isError}
        fallbackMessage="Couldn't reach the server. Nothing was charged."
      />

      <RefundHistory
        refunds={refundsQuery.data?.success === true ? refundsQuery.data.data.items : []}
      />

      {/* The currency is the INTENT'S — the thing being refunded — and never a guess. Null until the
          intent loads, in which case the balance line holds its tongue rather than inventing one. */}
      <RequestRefundControl orderId={orderId} currency={intent?.currency ?? null} />
    </section>
  );
}

/**
 * Nothing has been started yet.
 *
 * `hasAccepted` covers the gap between the 202 and the order refetch that will hand this component a
 * `paymentIntentId`. Without it the button would sit there looking unpressed while a payment was
 * already in flight, and the buyer would press it again.
 */
function PayPrompt({
  isSubmitting,
  hasAccepted,
  onPayClick,
}: {
  isSubmitting: boolean;
  hasAccepted: boolean;
  onPayClick: () => void;
}) {
  if (hasAccepted) {
    return (
      <output className="block rounded-lg bg-muted px-3 py-2 text-xs leading-4 text-muted-foreground">
        Payment started. We are waiting for the provider to answer — nothing has been taken yet, and
        this updates on its own.
      </output>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onPayClick}
        disabled={isSubmitting}
        className="cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {isSubmitting ? "Starting…" : "Pay for this order"}
      </button>
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        The processor settles this straight to the seller. Qatoto never holds the money.
      </p>
    </div>
  );
}

/** An intent exists — from this session or from one before a reload. */
function ResumedPayment({
  isLoading,
  intent,
  errorMessage,
}: {
  isLoading: boolean;
  intent: PaymentIntent | null;
  errorMessage: string | null;
}) {
  if (isLoading) {
    return <p className="text-xs leading-4 text-muted-foreground">Checking the payment…</p>;
  }

  if (errorMessage !== null) {
    return (
      <p role="alert" className="text-xs leading-4 text-destructive">
        {errorMessage}
      </p>
    );
  }

  if (intent === null) {
    return (
      <p className="text-xs leading-4 text-muted-foreground">Couldn&apos;t read the payment.</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm leading-5 font-medium text-foreground">
        {PAYMENT_INTENT_STATE_LABELS[intent.state]}
      </p>
      <p className="text-xs leading-4 text-muted-foreground">
        {formatCentsLabel(intent.amountInCents, intent.currency)}
      </p>

      {isPaymentIntentInFlight(intent.state) && (
        <p className="text-xs leading-4 text-muted-foreground">
          This updates on its own — there is nothing to press.
        </p>
      )}

      {/* Rendered only when the server gave one. A null `failureReason` on a failed payment means
          the provider said nothing, which is not the same as "no failure" — so there is no
          stand-in sentence here. */}
      {intent.failureReason !== null && (
        <p className="text-xs leading-4 text-destructive">{intent.failureReason}</p>
      )}

      {/* Never a placeholder date. `settledAt` is null until it settles, and printing anything
          there would be a payment timestamp nobody recorded. */}
      {intent.settledAt !== null && (
        <p className="text-xs leading-4 text-muted-foreground">
          Settled {formatIsoInstantLabel(intent.settledAt)}
        </p>
      )}

      {/* The processor's own reference, for a support conversation. Not a receipt. */}
      {intent.providerPaymentRef !== null && (
        <p className="text-[11px] leading-4 text-muted-foreground">
          Provider reference {intent.providerPaymentRef}
        </p>
      )}
    </div>
  );
}

/**
 * Refunds against this order.
 *
 * BOTH PARTIES SEE IT, because `GET /commerce/refunds` scopes through the ORDER rather than the
 * refund row — a seller has to be able to see the refund that reverses their own order.
 *
 * Renders nothing when there are none: an empty "no refunds" block on the overwhelming majority of
 * orders is noise, and its absence is not ambiguous.
 */
/**
 * Ask for a refund.
 *
 * AN EMPTY AMOUNT MEANS "ALL OF IT", and that is the server's figure rather than one computed here.
 * Refunds are partial by default and an order can carry several, so summing the history to work out
 * what is left is a race against every refund still in flight — `payments.schemas.ts` says so on
 * `RefundSchema` directly.
 *
 * THE `409` IS THE INTERESTING PATH, and it is the reason this control could not be built until now.
 * Over-refunding answers with the real remaining balance in the envelope's `data`, which the shared
 * transport dropped on every failure — so the refusal could say "too much" and never "too much,
 * here is what is left". `ApiError.details` carries it now, and it is parsed rather than asserted:
 * a proxy that rewrote the body, or an older backend, falls back to the message, which is already a
 * complete sentence.
 *
 * A `202` IS NOT A SETTLED REFUND. The row exists and the provider has been asked; the verdict shows
 * up in the history above. The copy says "requested".
 */
function RequestRefundControl({
  orderId,
  currency,
}: {
  readonly orderId: string;
  readonly currency: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  // ONCE PER ATTEMPT. A key regenerated inside a retry refunds twice — the whole mechanism is that
  // the same value goes out on every send of one attempt.
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const createRefundMutation = useCreateRefund();
  const result = createRefundMutation.data;

  // The remaining balance, but only when the server just told us what it is.
  const overRefundDetails =
    result !== undefined && !result.success && result.error.code === "409"
      ? OverRefundDetailsSchema.safeParse(result.error.details)
      : null;

  if (!isOpen) {
    return (
      <div className="border-t border-border pt-2">
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
          }}
          className="cursor-pointer text-xs leading-4 text-primary underline"
        >
          Request a refund
        </button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2 border-t border-border pt-2"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        const trimmedAmount = amountInput.trim();
        createRefundMutation.mutate({
          orderId,
          input: {
            // Omitted entirely when blank — that is what asks for the whole remaining balance.
            ...(trimmedAmount === "" ? {} : { amountInCents: Number(trimmedAmount) }),
            ...(reasonInput.trim() === "" ? {} : { reason: reasonInput.trim() }),
          },
          idempotencyKey,
        });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs leading-4 text-muted-foreground">Amount in cents</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amountInput}
          onChange={(changeEvent) => {
            setAmountInput(changeEvent.target.value);
          }}
          placeholder="Leave blank to refund everything still refundable"
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs leading-4 text-muted-foreground">Reason (optional)</span>
        <input
          type="text"
          value={reasonInput}
          onChange={(changeEvent) => {
            setReasonInput(changeEvent.target.value);
          }}
          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={createRefundMutation.isPending}
          className="cursor-pointer rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
        >
          {createRefundMutation.isPending ? "Requesting…" : "Request refund"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            createRefundMutation.reset();
            // A NEW ATTEMPT GETS A NEW KEY. Closing the form ends this attempt; reusing the key
            // afterwards would make a deliberate second refund a silent no-op replay of the first.
            setIdempotencyKey(newIdempotencyKey());
          }}
          className="cursor-pointer text-xs leading-4 text-muted-foreground underline"
        >
          Cancel
        </button>
      </div>

      {/* The refusal in the backend's own words, plus the figure when we have it. */}
      {/* Rendered only when BOTH the server gave us the figure and we know what to denominate it
          in. An amount without its currency is unrenderable, and picking one would be a fabrication
          on a surface that is about money. */}
      {overRefundDetails?.success === true && currency !== null && (
        <p className="text-xs leading-4 text-muted-foreground">
          {formatCentsLabel(overRefundDetails.data.refundableInCents, currency)} is still refundable
          on this order.
        </p>
      )}

      {result?.success === true && (
        <p className="text-xs leading-4 text-muted-foreground">
          Refund requested. It appears above once the provider answers — a 202 is not a settled
          refund.
        </p>
      )}

      <MutationNotice
        result={result}
        hasThrown={createRefundMutation.isError}
        fallbackMessage="Couldn't reach the server. Nothing was refunded."
      />
    </form>
  );
}

function RefundHistory({ refunds }: { refunds: readonly Refund[] }) {
  if (refunds.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-border pt-2">
      <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-muted-foreground uppercase">
        Refunds
      </p>
      <ul className="space-y-1">
        {refunds.map((refund) => (
          <li key={refund.id} className="flex items-baseline justify-between gap-4">
            <span className="text-xs leading-4 text-muted-foreground">
              {REFUND_STATE_LABELS[refund.state]}
              {refund.reason !== null && ` · ${refund.reason}`}
            </span>
            <span className="text-xs leading-4 text-foreground">
              {formatCentsLabel(refund.amountInCents, refund.currency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
